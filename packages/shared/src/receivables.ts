import { z } from "zod";
import { PAGO_ESTADOS, PAGO_METODOS, PEDIDO_ESTADOS, UNIDADES_MEDIDA, type PagoEstado } from "./estados";
import { centavosSchema } from "./money";

function opcionalVacio<T extends z.ZodTypeAny>(schema: T) {
  return z.union([schema, z.literal(""), z.undefined()]).transform((value) =>
    value === "" || value === undefined ? undefined : (value as z.infer<T>),
  );
}

const fechaCalendarioSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use AAAA-MM-DD");

/** Antigüedad a partir de la cual una factura con saldo se considera VENCIDO. */
export const ANTIGUEDAD_VENCIDA_DIAS = 15;

export const TIPO_EVENTO_PEDIDO_ENTREGADO = "PedidoEntregado";
export const TIPO_EVENTO_LIMITE_CREDITO = "LimiteCreditoExcedido";

export const MENSAJE_PEDIDO_NO_ENTREGABLE =
  "Solo se entrega un pedido en producción. Cierre la ventana primero.";
export const MENSAJE_CANTIDAD_ENTREGADA =
  "La cantidad entregada debe ser un entero mayor o igual a cero.";
export const MENSAJE_DTE_DUPLICADO =
  "Ese número de DTE ya está registrado en otra factura.";
export const MENSAJE_PAGO_EXCEDE_SALDO =
  "El monto supera el saldo pendiente. No se registra saldo a favor.";
export const MENSAJE_COMPROBANTE_REQUERIDO =
  "La transferencia requiere foto del comprobante.";
export const MENSAJE_PAGO_OBJETIVO =
  "Indique exactamente una factura o un cliente.";
export const MENSAJE_SIN_SENAL = "Sin señal · queda en este teléfono";
export const idempotencyKeySchema = z.string().trim().min(8).max(128);

export const COBRANZA_SSE_TIPOS = [
  "pedido.entregado",
  "factura.actualizada",
  "pago.registrado",
] as const;

export type CobranzaSseTipo = (typeof COBRANZA_SSE_TIPOS)[number];

function exigirEnterosCentavos(
  valores: ReadonlyArray<number>,
  fn: string,
): void {
  for (const valor of valores) {
    if (!Number.isInteger(valor)) {
      throw new Error(`${fn}: solo enteros en centavos`);
    }
  }
}

/**
 * Estado derivado. Nunca se guarda en `factura`.
 * Pagado ⇔ abonado >= monto (incluye factura de Q 0.00).
 * Vencido gana sobre abono parcial cuando hay saldo y ≥ 15 días.
 */
export function estadoFactura(input: {
  montoCentavos: number;
  abonadoCentavos: number;
  antiguedadDias: number;
}): PagoEstado {
  exigirEnterosCentavos(
    [input.montoCentavos, input.abonadoCentavos, input.antiguedadDias],
    "estadoFactura",
  );
  if (input.abonadoCentavos >= input.montoCentavos) return "PAGADO";
  const saldo = input.montoCentavos - input.abonadoCentavos;
  if (saldo > 0 && input.antiguedadDias >= ANTIGUEDAD_VENCIDA_DIAS) {
    return "VENCIDO";
  }
  if (input.abonadoCentavos > 0) return "ABONO_PARCIAL";
  return "PENDIENTE";
}

/** Suma enteros: entregado × snapshot. Sin redondeo bancario. */
export function montoFacturaCentavos(
  items: ReadonlyArray<{
    cantidadEntregada: number;
    precioUnitarioCentavos: number;
  }>,
): number {
  let total = 0;
  for (const item of items) {
    exigirEnterosCentavos(
      [item.cantidadEntregada, item.precioUnitarioCentavos],
      "montoFacturaCentavos",
    );
    if (item.cantidadEntregada < 0) {
      throw new Error("montoFacturaCentavos: cantidad no puede ser negativa");
    }
    total += item.cantidadEntregada * item.precioUnitarioCentavos;
  }
  return total;
}

export type AsignacionFifo = {
  facturaId: string;
  montoCentavos: number;
};

/**
 * Reparte un cobro a facturas pendientes en orden (ya ordenadas ASC).
 * `sobra > 0` ⇒ el caller rechaza con PAGO_EXCEDE_SALDO. Cero filas si monto es 0.
 */
export function aplicarFifo(
  facturasPendientes: ReadonlyArray<{ id: string; saldoCentavos: number }>,
  montoCentavos: number,
): { asignaciones: AsignacionFifo[]; sobra: number } {
  exigirEnterosCentavos([montoCentavos], "aplicarFifo");
  if (montoCentavos < 0) {
    throw new Error("aplicarFifo: el monto no puede ser negativo");
  }
  let restante = montoCentavos;
  const asignaciones: AsignacionFifo[] = [];
  for (const fac of facturasPendientes) {
    exigirEnterosCentavos([fac.saldoCentavos], "aplicarFifo");
    if (fac.saldoCentavos <= 0 || restante <= 0) continue;
    const aplicado = Math.min(fac.saldoCentavos, restante);
    asignaciones.push({ facturaId: fac.id, montoCentavos: aplicado });
    restante -= aplicado;
  }
  return { asignaciones, sobra: restante };
}

export const entregarItemSchema = z.object({
  productoId: z.string().uuid(),
  cantidadEntregada: z.number().int().min(0).max(9999),
});

export const entregarPedidoRequestSchema = z.object({
  pedidoId: z.string().uuid(),
  idempotencyKey: idempotencyKeySchema,
  items: z.array(entregarItemSchema).optional(),
});
export type EntregarPedidoRequest = z.infer<typeof entregarPedidoRequestSchema>;

export const capturarDteRequestSchema = z.object({
  numeroDte: z.string().trim().min(1).max(80),
});
export type CapturarDteRequest = z.infer<typeof capturarDteRequestSchema>;

export const registrarPagoRequestSchema = z
  .object({
    id: z.string().uuid(),
    idempotencyKey: idempotencyKeySchema,
    facturaId: z.string().uuid().optional(),
    clienteId: z.string().uuid().optional(),
    montoCentavos: z.number().int().positive(),
    metodo: z.enum(PAGO_METODOS),
    comprobanteAssetId: z.string().uuid().optional(),
    fecha: fechaCalendarioSchema.optional(),
  })
  .superRefine((value, ctx) => {
    const tieneFactura = Boolean(value.facturaId);
    const tieneCliente = Boolean(value.clienteId);
    if (tieneFactura === tieneCliente) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: MENSAJE_PAGO_OBJETIVO,
        path: ["facturaId"],
      });
    }
  });
export type RegistrarPagoRequest = z.infer<typeof registrarPagoRequestSchema>;

export const carteraQuerySchema = z.object({
  estado: opcionalVacio(z.enum(["todas", "pendientes", "vencidas"])),
  clienteId: opcionalVacio(z.string().uuid()),
  desde: opcionalVacio(fechaCalendarioSchema),
  hasta: opcionalVacio(fechaCalendarioSchema),
  metodoPago: opcionalVacio(z.enum(PAGO_METODOS)),
  fechaOperacion: opcionalVacio(fechaCalendarioSchema),
});
export type CarteraQuery = z.infer<typeof carteraQuerySchema>;

export const cuadreQuerySchema = z.object({
  fecha: opcionalVacio(fechaCalendarioSchema),
});
export type CuadreQuery = z.infer<typeof cuadreQuerySchema>;

export const repartoQuerySchema = z.object({
  fechaOperacion: opcionalVacio(fechaCalendarioSchema),
});
export type RepartoQuery = z.infer<typeof repartoQuerySchema>;

export const facturaPublicaSchema = z.object({
  id: z.string().uuid(),
  pedidoId: z.string().uuid(),
  numeroDte: z.string().nullable(),
  montoCentavos: centavosSchema,
  abonadoCentavos: centavosSchema,
  saldoCentavos: centavosSchema,
  emitidaAt: z.string().nullable(),
  antiguedadDias: z.number().int().nonnegative(),
  estado: z.enum(PAGO_ESTADOS),
});
export type FacturaPublica = z.infer<typeof facturaPublicaSchema>;

export const entregaItemPublicoSchema = z.object({
  productoId: z.string().uuid(),
  nombreMostrado: z.string(),
  unidadMedida: z.enum(UNIDADES_MEDIDA),
  cantidadPedida: z.number().int().nonnegative(),
  cantidadEntregada: z.number().int().nonnegative(),
  precioUnitarioCentavos: centavosSchema,
  notaProduccion: z.string().nullable(),
});
export type EntregaItemPublico = z.infer<typeof entregaItemPublicoSchema>;

export const entregaResultadoSchema = z.object({
  pedidoId: z.string().uuid(),
  estado: z.literal("ENTREGADO"),
  idempotente: z.boolean(),
  items: z.array(entregaItemPublicoSchema),
  factura: facturaPublicaSchema,
});
export type EntregaResultado = z.infer<typeof entregaResultadoSchema>;

export const rutaParadaSchema = z.object({
  pedidoId: z.string().uuid(),
  correlativo: z.number().int().positive(),
  clienteId: z.string().uuid(),
  clienteNombre: z.string(),
  horarioEntregaFijo: z.string().nullable(),
  telefonoWa: z.string().nullable(),
  estado: z.enum(PEDIDO_ESTADOS),
  totalEstimadoCentavos: centavosSchema,
  saldoAnteriorCentavos: centavosSchema,
  facturasPendientes: z.number().int().nonnegative(),
  items: z.array(entregaItemPublicoSchema),
  factura: facturaPublicaSchema.nullable(),
});
export type RutaParada = z.infer<typeof rutaParadaSchema>;

export const rutaRepartoSchema = z.object({
  fechaOperacion: fechaCalendarioSchema,
  paradas: z.array(rutaParadaSchema),
});
export type RutaReparto = z.infer<typeof rutaRepartoSchema>;

export const facturaCarteraSchema = facturaPublicaSchema.extend({
  correlativo: z.number().int().positive(),
  clienteId: z.string().uuid(),
  clienteNombre: z.string(),
  fechaOperacion: fechaCalendarioSchema,
});
export type FacturaCartera = z.infer<typeof facturaCarteraSchema>;

export const clienteSobreLimiteSchema = z.object({
  clienteId: z.string().uuid(),
  nombre: z.string(),
  pendientes: z.number().int().nonnegative(),
  limite: z.number().int().positive(),
});
export type ClienteSobreLimite = z.infer<typeof clienteSobreLimiteSchema>;

export const carteraResumenSchema = z.object({
  pendientesCount: z.number().int().nonnegative(),
  pendientesSaldoCentavos: centavosSchema,
  cobradoHoyCentavos: centavosSchema,
  porCobrarFechaOperacionCentavos: centavosSchema,
  clientesSobreLimite: z.array(clienteSobreLimiteSchema),
});
export type CarteraResumen = z.infer<typeof carteraResumenSchema>;

export const pagoPublicoSchema = z.object({
  id: z.string().uuid(),
  facturaId: z.string().uuid(),
  montoCentavos: centavosSchema,
  metodo: z.enum(PAGO_METODOS),
  fecha: fechaCalendarioSchema,
  registradoPor: z.string().uuid().nullable(),
  registradoPorNombre: z.string().nullable().optional(),
  comprobanteAssetId: z.string().uuid().nullable(),
  clienteNombre: z.string().optional(),
  numeroDte: z.string().nullable().optional(),
});
export type PagoPublico = z.infer<typeof pagoPublicoSchema>;

export const pagoRegistroResultadoSchema = z.object({
  idempotente: z.boolean(),
  pagos: z.array(pagoPublicoSchema),
  facturas: z.array(facturaPublicaSchema),
});
export type PagoRegistroResultado = z.infer<typeof pagoRegistroResultadoSchema>;

export const cuadreActorSchema = z.object({
  usuarioId: z.string().uuid().nullable(),
  username: z.string(),
  efectivoCentavos: centavosSchema,
  transferenciaCentavos: centavosSchema,
  count: z.number().int().nonnegative(),
});
export type CuadreActor = z.infer<typeof cuadreActorSchema>;

export const cuadreDiaSchema = z.object({
  fecha: fechaCalendarioSchema,
  totalEfectivoCentavos: centavosSchema,
  totalTransferenciaCentavos: centavosSchema,
  totalCentavos: centavosSchema,
  porActor: z.array(cuadreActorSchema),
  pagos: z.array(pagoPublicoSchema),
});
export type CuadreDia = z.infer<typeof cuadreDiaSchema>;
