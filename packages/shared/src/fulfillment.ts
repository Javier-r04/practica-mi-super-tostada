import { z } from "zod";
import { PUNTOS_CARGA, UNIDADES_MEDIDA, type UnidadMedida } from "./estados";
import { nombreDiaOperacion } from "./calendar";
import { centavosSchema } from "./money";
import { UNIDAD_CORTA } from "./ordering";

export const DIA_OPERACION_ESTADOS = [
  "ABIERTO",
  "CERRADO",
  "REABIERTO",
] as const;
export type DiaOperacionEstado = (typeof DIA_OPERACION_ESTADOS)[number];

export const CAMBIOS_HOJA = ["nuevo", "ajustado", "eliminado"] as const;
export type CambioHoja = (typeof CAMBIOS_HOJA)[number];

export const MENSAJE_HOJA_NO_MATERIALIZADA =
  "La hoja no se materializa hasta el cierre";
export const MENSAJE_DIA_CERRADO =
  "El día de operación ya está cerrado. Reabrir requiere motivo y lo hace solo el administrador jefe.";
export const MENSAJE_DIA_NO_CERRADO =
  "Solo se reabre un día que ya está cerrado";
export const MENSAJE_MOTIVO_REAPERTURA =
  "Indique el motivo (mínimo 8 caracteres). Queda en la auditoría.";
export const TIPO_EVENTO_VENTANA_CERRADA = "VentanaPedidoCerrada";

const fechaOperacionSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use AAAA-MM-DD");

export const cerrarDiaRequestSchema = z.object({
  fechaOperacion: fechaOperacionSchema.optional(),
});
export type CerrarDiaRequest = z.infer<typeof cerrarDiaRequestSchema>;

export const reabrirDiaRequestSchema = z.object({
  fechaOperacion: fechaOperacionSchema.optional(),
  motivo: z.string().trim().min(8, MENSAJE_MOTIVO_REAPERTURA).max(500),
});
export type ReabrirDiaRequest = z.infer<typeof reabrirDiaRequestSchema>;

export const lineaProductoSchema = z.object({
  productoId: z.string().uuid(),
  nombreCanonico: z.string(),
  unidadMedida: z.enum(UNIDADES_MEDIDA),
  cantidad: z.number().int(),
  puntoCargaEfectivo: z.enum(PUNTOS_CARGA),
  notaProduccion: z.string().nullable(),
  familia: z.enum(["TORTILLA", "TOSTADA", "FRITURA"]).optional(),
  cambio: z.enum(CAMBIOS_HOJA).optional(),
  cantidadAnterior: z.number().int().optional(),
});
export type LineaProducto = z.infer<typeof lineaProductoSchema>;

export const lineaClienteItemSchema = z.object({
  productoId: z.string().uuid(),
  nombreCanonico: z.string(),
  unidadMedida: z.enum(UNIDADES_MEDIDA),
  cantidad: z.number().int(),
  puntoCargaEfectivo: z.enum(PUNTOS_CARGA),
  notaProduccion: z.string().nullable(),
  cambio: z.enum(CAMBIOS_HOJA).optional(),
  cantidadAnterior: z.number().int().optional(),
});
export type LineaClienteItem = z.infer<typeof lineaClienteItemSchema>;

export const bloqueClienteSchema = z.object({
  clienteId: z.string().uuid(),
  nombre: z.string(),
  horarioEntregaFijo: z.string().nullable(),
  notasPermanentes: z.string().nullable(),
  notasAdmin: z.string().nullable(),
  items: z.array(lineaClienteItemSchema),
});
export type BloqueCliente = z.infer<typeof bloqueClienteSchema>;

export const hojaSnapshotSchema = z.object({
  fechaOperacion: fechaOperacionSchema,
  /** Opcional: las hojas anteriores a la fecha de entrega no la traen. */
  fechaEntrega: fechaOperacionSchema.optional(),
  esSabado: z.boolean(),
  version: z.number().int().min(1),
  productos: z.array(lineaProductoSchema),
  clientes: z.array(bloqueClienteSchema),
});
export type HojaSnapshot = z.infer<typeof hojaSnapshotSchema>;

export const grupoCargaSchema = z.object({
  puntoCarga: z.enum(PUNTOS_CARGA),
  lineas: z.array(lineaProductoSchema),
});
export type GrupoCarga = z.infer<typeof grupoCargaSchema>;

export const hojaPublicaSchema = z.object({
  fechaOperacion: fechaOperacionSchema,
  version: z.number().int(),
  esSabado: z.boolean(),
  diaEstado: z.enum(DIA_OPERACION_ESTADOS),
  motivoReapertura: z.string().nullable(),
  generadoAt: z.string(),
  texto: z.string(),
  snapshot: hojaSnapshotSchema,
  grupos: z.array(grupoCargaSchema),
});
export type HojaPublica = z.infer<typeof hojaPublicaSchema>;

export const previewCierreSchema = z.object({
  confirmados: z.number().int(),
  borradores: z.number().int(),
  mensajesAEncolar: z.number().int(),
});
export type PreviewCierre = z.infer<typeof previewCierreSchema>;

export const rutaOperacionSchema = z.object({
  confirmados: z.number().int().nonnegative(),
  enProduccion: z.number().int().nonnegative(),
  entregados: z.number().int().nonnegative(),
  anulados: z.number().int().nonnegative(),
});

export const clienteSinPedidoSchema = z.object({
  clienteId: z.string().uuid(),
  nombre: z.string(),
});

export const operacionResumenSchema = z.object({
  fechaOperacion: fechaOperacionSchema,
  /** Día de reparto de esta operación. */
  fechaEntrega: fechaOperacionSchema,
  diaEstado: z.enum(["SIN_CIERRE", "CERRADO", "REABIERTO"]),
  versionHoja: z.number().int().nullable(),
  pedidosPortal: z.number().int(),
  pedidosManual: z.number().int(),
  librasTortilla: z.number().int(),
  montoPedidosCentavos: centavosSchema,
  ruta: rutaOperacionSchema,
  clientesSinPedido: z.array(clienteSinPedidoSchema),
  outboxPendientes: z.number().int(),
  outboxEnviados: z.number().int(),
  outboxError: z.number().int(),
  previewCierre: previewCierreSchema,
  motivoReapertura: z.string().nullable(),
});
export type OperacionResumen = z.infer<typeof operacionResumenSchema>;

export const cierreResultadoSchema = z.object({
  fechaOperacion: fechaOperacionSchema,
  version: z.number().int(),
  idempotente: z.boolean(),
  diaEstado: z.literal("CERRADO"),
});
export type CierreResultado = z.infer<typeof cierreResultadoSchema>;

export const reaperturaResultadoSchema = z.object({
  fechaOperacion: fechaOperacionSchema,
  diaEstado: z.literal("REABIERTO"),
  motivo: z.string(),
});
export type ReaperturaResultado = z.infer<typeof reaperturaResultadoSchema>;

export function gruposPorPuntoCarga(snapshot: HojaSnapshot): GrupoCarga[] {
  const mapa = new Map<(typeof PUNTOS_CARGA)[number], LineaProducto[]>();
  for (const punto of PUNTOS_CARGA) mapa.set(punto, []);
  for (const linea of snapshot.productos) {
    mapa.get(linea.puntoCargaEfectivo)?.push(linea);
  }
  return PUNTOS_CARGA.filter((punto) => (mapa.get(punto) ?? []).length > 0).map(
    (punto) => ({ puntoCarga: punto, lineas: mapa.get(punto) ?? [] }),
  );
}

/** 09:00 → "9:00 AM". El horario fijo no se escribe a mano. */
export function formatearHorarioEntrega(hhmm: string): string {
  const [hStr, mStr] = hhmm.slice(0, 5).split(":");
  const h = Number(hStr);
  const m = Number(mStr);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return hhmm;
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return m === 0 ? `${h12}:00 ${ampm}` : `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

function unidadTexto(unidad: UnidadMedida): string {
  return UNIDAD_CORTA[unidad];
}

function padCantidad(n: number, ancho: number): string {
  return String(n).padStart(ancho, " ");
}

function encabezadoCliente(bloque: BloqueCliente): string {
  const nombre = bloque.nombre.toLocaleUpperCase("es-GT");
  const partes = [nombre];
  if (bloque.horarioEntregaFijo) {
    partes.push(`ENTREGAR ${formatearHorarioEntrega(bloque.horarioEntregaFijo)}`);
  }
  if (bloque.notasAdmin) partes.push(bloque.notasAdmin);
  return partes.join(" — ");
}

function renderItem(item: LineaClienteItem, ancho: number): string {
  const qty = padCantidad(item.cantidad, ancho);
  const unidad = unidadTexto(item.unidadMedida);
  const nota = item.notaProduccion ? `  (${item.notaProduccion})` : "";
  return `${qty} ${unidad} ${item.nombreCanonico}${nota}`;
}

function itemsVisibles(
  items: LineaClienteItem[],
  soloCambios: boolean,
): LineaClienteItem[] {
  return soloCambios ? items.filter((i) => i.cambio) : items;
}

/**
 * Plantilla determinista del consolidado. Reconocible respecto a CONTEXT.md §4:
 * nombres canónicos, GRUESAS de nota_produccion, ENTREGAR del horario fijo.
 * "cargar en planta" no se escribe: se agrupa por punto de carga en la hoja.
 */
export function textoHoja(
  snapshot: HojaSnapshot,
  opts?: { soloCambios?: boolean },
): string {
  const soloCambios = opts?.soloCambios === true;
  const dia = nombreDiaOperacion(snapshot.fechaOperacion);
  const lineas: string[] = [];
  if (soloCambios && snapshot.version > 1) {
    lineas.push(`CAMBIOS · PEDIDO PARA ${dia}`);
  } else {
    lineas.push(`PEDIDO PARA ${dia}`);
  }
  lineas.push("");

  for (const bloque of snapshot.clientes) {
    const items = itemsVisibles(bloque.items, soloCambios);
    if (items.length === 0) continue;
    lineas.push(encabezadoCliente(bloque));
    const ancho = Math.max(3, ...items.map((i) => String(i.cantidad).length));
    for (const item of items) {
      const marca =
        item.cambio === "nuevo"
          ? "+"
          : item.cambio === "eliminado"
            ? "-"
            : item.cambio === "ajustado"
              ? "~"
              : " ";
      const cuerpo = renderItem(item, ancho);
      lineas.push(soloCambios ? `${marca}${cuerpo}` : cuerpo);
    }
    lineas.push("");
  }

  return lineas.join("\n").trimEnd() + "\n";
}

function claveItem(clienteId: string, productoId: string): string {
  return `${clienteId}:${productoId}`;
}

/**
 * Anota vN respecto a vN-1. Las líneas eliminadas se conservan para el PDF
 * de solo-diff y para el resaltado en pantalla.
 */
export function diffHojas(previa: HojaSnapshot, actual: HojaSnapshot): HojaSnapshot {
  const prevProd = new Map(previa.productos.map((p) => [p.productoId, p]));
  const productos: LineaProducto[] = actual.productos.map((p) => {
    const old = prevProd.get(p.productoId);
    if (!old) return { ...p, cambio: "nuevo" as const };
    if (old.cantidad !== p.cantidad) {
      return { ...p, cambio: "ajustado" as const, cantidadAnterior: old.cantidad };
    }
    return p;
  });
  for (const old of previa.productos) {
    if (!actual.productos.some((p) => p.productoId === old.productoId)) {
      productos.push({ ...old, cambio: "eliminado" });
    }
  }

  const prevItems = new Map<string, LineaClienteItem>();
  for (const bloque of previa.clientes) {
    for (const item of bloque.items) {
      prevItems.set(claveItem(bloque.clienteId, item.productoId), item);
    }
  }

  const clientes: BloqueCliente[] = actual.clientes.map((bloque) => {
    const items: LineaClienteItem[] = bloque.items.map((item) => {
      const old = prevItems.get(claveItem(bloque.clienteId, item.productoId));
      if (!old) return { ...item, cambio: "nuevo" as const };
      if (old.cantidad !== item.cantidad) {
        return {
          ...item,
          cambio: "ajustado" as const,
          cantidadAnterior: old.cantidad,
        };
      }
      return item;
    });
    return { ...bloque, items };
  });

  for (const bloquePrev of previa.clientes) {
    const actualBloque = clientes.find((c) => c.clienteId === bloquePrev.clienteId);
    const eliminados = bloquePrev.items.filter(
      (item) =>
        !actual.clientes.some(
          (c) =>
            c.clienteId === bloquePrev.clienteId &&
            c.items.some((i) => i.productoId === item.productoId),
        ),
    );
    if (eliminados.length === 0) continue;
    const marcados = eliminados.map((item) => ({
      ...item,
      cambio: "eliminado" as const,
    }));
    if (actualBloque) {
      actualBloque.items.push(...marcados);
    } else {
      clientes.push({ ...bloquePrev, items: marcados });
    }
  }

  return {
    ...actual,
    productos,
    clientes,
  };
}
