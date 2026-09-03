import { z } from "zod";
import { PAGO_METODOS, pagoRequiereComprobante } from "./estados";
import {
  entregarItemSchema,
  idempotencyKeySchema,
  MENSAJE_COMPROBANTE_REQUERIDO,
  MENSAJE_SIN_SENAL,
} from "./receivables";

export {
  MENSAJE_COMPROBANTE_REQUERIDO,
  MENSAJE_SIN_SENAL,
  idempotencyKeySchema,
};
export const MENSAJE_COLA_SESION =
  "Inicia sesión para enviar lo de este teléfono";
export const MENSAJE_GUARDAR_TELEFONO = "Guardar en este teléfono";
export const MENSAJE_RUTA_SIN_SNAPSHOT =
  "Abre la ruta con señal antes de salir";
export const MENSAJE_COLA_INDEXEDDB =
  "Este teléfono no pudo guardar la cola. No use localStorage.";

export const COLA_FILA_ESTADOS = [
  "pendiente",
  "enviando",
  "error",
  "sesion",
] as const;
export type ColaFilaEstado = (typeof COLA_FILA_ESTADOS)[number];

const accionEntregaBaseSchema = z.object({
  tipo: z.literal("ENTREGA"),
  idempotencyKey: idempotencyKeySchema,
  pedidoId: z.string().uuid(),
  items: z.array(entregarItemSchema),
});

const accionPagoBaseSchema = z
  .object({
    tipo: z.literal("PAGO"),
    idempotencyKey: idempotencyKeySchema,
    pagoId: z.string().uuid(),
    clienteId: z.string().uuid(),
    pedidoId: z.string().uuid().optional(),
    montoCentavos: z.number().int().positive(),
    metodo: z.enum(PAGO_METODOS),
    blobId: z.string().uuid().optional(),
  })
  .superRefine((value, ctx) => {
    if (pagoRequiereComprobante(value.metodo) && !value.blobId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: MENSAJE_COMPROBANTE_REQUERIDO,
        path: ["blobId"],
      });
    }
  });

export const accionColaSchema = z.union([
  accionEntregaBaseSchema,
  accionPagoBaseSchema,
]);
export type AccionCola = z.infer<typeof accionColaSchema>;

const metaColaSchema = z.object({
  estado: z.enum(COLA_FILA_ESTADOS),
  enqueuedAt: z.string().min(1),
  errorMensaje: z.string().optional(),
});

export const filaColaSchema = z.intersection(accionColaSchema, metaColaSchema);
export type FilaCola = AccionCola & z.infer<typeof metaColaSchema>;

function exigirEnterosCentavos(valores: ReadonlyArray<number>, fn: string): void {
  for (const valor of valores) {
    if (!Number.isInteger(valor)) {
      throw new Error(`${fn}: solo enteros en centavos`);
    }
  }
}

function parseAccion(accion: AccionCola): AccionCola {
  const parsed = accionColaSchema.safeParse(accion);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    if (issue?.code === z.ZodIssueCode.invalid_type && issue.expected === "integer") {
      throw new Error("encolar: solo enteros en centavos");
    }
    throw new Error(issue?.message ?? "Acción de cola inválida");
  }
  if (parsed.data.tipo === "PAGO") {
    exigirEnterosCentavos([parsed.data.montoCentavos], "encolar");
  }
  return parsed.data;
}

function clonar(cola: readonly FilaCola[]): FilaCola[] {
  return cola.map((fila) => ({ ...fila }));
}

/**
 * Encola una acción. ENTREGA del mismo pedido coalesces (misma key).
 * Cada PAGO es un hecho distinto. `enqueuedAt` lo inyecta el caller:
 * solo ordena, no es fecha_operacion.
 */
export function encolar(
  cola: readonly FilaCola[],
  accion: AccionCola,
  enqueuedAt: string,
): FilaCola[] {
  const parsed = parseAccion(accion);
  const next = clonar(cola);

  if (parsed.tipo === "ENTREGA") {
    const idx = next.findIndex(
      (f) => f.tipo === "ENTREGA" && f.pedidoId === parsed.pedidoId,
    );
    if (idx >= 0) {
      const previa = next[idx]!;
      next[idx] = {
        ...parsed,
        idempotencyKey: previa.idempotencyKey,
        enqueuedAt: previa.enqueuedAt,
        estado: "pendiente",
      };
      return next;
    }
  }

  if (next.some((f) => f.idempotencyKey === parsed.idempotencyKey)) {
    throw new Error("idempotencyKey duplicada en la cola");
  }

  next.push({
    ...parsed,
    estado: "pendiente",
    enqueuedAt,
  });
  return next;
}

export function pedidoTieneCola(
  cola: readonly FilaCola[],
  pedidoId: string,
): boolean {
  return cola.some((f) => "pedidoId" in f && f.pedidoId === pedidoId);
}

export function pendientesCount(cola: readonly FilaCola[]): number {
  return cola.filter((f) => f.estado === "pendiente" || f.estado === "enviando")
    .length;
}

/**
 * Siguiente acción a enviar. FIFO por enqueuedAt.
 * Un PAGO cuyo pedidoId tiene ENTREGA aún en cola espera (la factura nace al entregar).
 */
export function siguienteAccion(cola: readonly FilaCola[]): FilaCola | undefined {
  const pendientes = cola
    .filter((f) => f.estado === "pendiente")
    .slice()
    .sort((a, b) => (a.enqueuedAt < b.enqueuedAt ? -1 : a.enqueuedAt > b.enqueuedAt ? 1 : 0));

  const entregasPendientes = new Set(
    cola.filter((f) => f.tipo === "ENTREGA").map((f) => f.pedidoId),
  );

  for (const fila of pendientes) {
    if (
      fila.tipo === "PAGO" &&
      fila.pedidoId &&
      entregasPendientes.has(fila.pedidoId)
    ) {
      continue;
    }
    return fila;
  }
  return undefined;
}

export function marcarEnviando(
  cola: readonly FilaCola[],
  idempotencyKey: string,
): FilaCola[] {
  return cola.map((f) =>
    f.idempotencyKey === idempotencyKey ? { ...f, estado: "enviando" as const } : f,
  );
}

export function confirmarAccion(
  cola: readonly FilaCola[],
  idempotencyKey: string,
): FilaCola[] {
  return cola.filter((f) => f.idempotencyKey !== idempotencyKey);
}

export function reintentarManual(
  cola: readonly FilaCola[],
  idempotencyKey: string,
): FilaCola[] {
  return cola.map((f) =>
    f.idempotencyKey === idempotencyKey
      ? { ...f, estado: "pendiente" as const, errorMensaje: undefined }
      : f,
  );
}

/**
 * 401 → sesion (no borrar). 4xx de dominio → error (sin retry).
 * Red / 5xx → pendiente para backoff.
 */
export function fallarAccion(
  cola: readonly FilaCola[],
  idempotencyKey: string,
  fallo: { httpStatus: number; mensaje: string },
): FilaCola[] {
  return cola.map((f) => {
    if (f.idempotencyKey !== idempotencyKey) return f;
    if (fallo.httpStatus === 401) {
      return {
        ...f,
        estado: "sesion" as const,
        errorMensaje: MENSAJE_COLA_SESION,
      };
    }
    if (fallo.httpStatus === 0 || fallo.httpStatus >= 500) {
      return { ...f, estado: "pendiente" as const, errorMensaje: fallo.mensaje };
    }
    return { ...f, estado: "error" as const, errorMensaje: fallo.mensaje };
  });
}
