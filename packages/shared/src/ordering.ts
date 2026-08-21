import { z } from "zod";
import {
  FAMILIAS,
  PEDIDO_ESTADOS,
  PEDIDO_ORIGENES,
  PUNTOS_CARGA,
  UNIDADES_MEDIDA,
} from "./estados";
import { MESSAGING_SSE_TIPOS } from "./messaging";
import { COBRANZA_SSE_TIPOS } from "./receivables";
import { formatearFechaLarga } from "./calendar";
import { centavosSchema, formatearCentavos } from "./money";

/** Query string: `""` y ausente → `undefined`, compatible con `parseBody`/`ZodType<T>`. */
function opcionalVacio<T extends z.ZodTypeAny>(
  schema: T,
): z.ZodType<z.infer<T> | undefined> {
  return z.preprocess(
    (value) => (value === "" || value === undefined ? undefined : value),
    schema.optional(),
  ) as z.ZodType<z.infer<T> | undefined>;
}

export const UNIDAD_CORTA = {
  LIBRA: "lb",
  BOLSA: "bolsas",
  UNIDAD: "un",
} as const;

/**
 * Total del pedido: suma de cantidad × precio_unitario, ambos enteros en
 * centavos. No hay redondeo: el producto de dos enteros ya es entero.
 * El redondeo bancario de `money.ts` aplica si algún día entra un factor no entero.
 */
export function totalPedidoCentavos(
  items: ReadonlyArray<{ cantidad: number; precioUnitarioCentavos: number }>,
): number {
  let total = 0;
  for (const item of items) {
    if (
      !Number.isInteger(item.cantidad) ||
      !Number.isInteger(item.precioUnitarioCentavos)
    ) {
      throw new Error("totalPedidoCentavos: solo enteros en centavos");
    }
    total += item.cantidad * item.precioUnitarioCentavos;
  }
  return total;
}

export const confirmarPedidoItemSchema = z.object({
  productoId: z.string().uuid(),
  cantidad: z.number().int().min(1).max(9999),
});

export const confirmarPedidoRequestSchema = z.object({
  items: z.array(confirmarPedidoItemSchema).min(1),
});

export type ConfirmarPedidoRequest = z.infer<typeof confirmarPedidoRequestSchema>;

export const portalProductoSchema = z.object({
  productoId: z.string().uuid(),
  alias: z.string(),
  nombreCanonico: z.string(),
  unidadMedida: z.enum(UNIDADES_MEDIDA),
  precioCentavos: z.number().int().nullable(),
  favorito: z.boolean(),
  familia: z.enum(FAMILIAS),
  orden: z.number().int(),
  pedible: z.boolean(),
});

export type PortalProducto = z.infer<typeof portalProductoSchema>;

export const portalVentanaSchema = z.object({
  abierta: z.boolean(),
  fechaOperacion: z.string().min(10),
  cierraAt: z.string().min(20),
  proximaAperturaAt: z.string().min(20),
  horarioEntregaFijo: z.string().nullable(),
});

export type PortalVentana = z.infer<typeof portalVentanaSchema>;

export const portalPedidoItemSchema = z.object({
  productoId: z.string().uuid(),
  cantidad: z.number().int().positive(),
  nombreMostrado: z.string(),
  unidadMedida: z.enum(UNIDADES_MEDIDA),
  precioUnitarioCentavos: centavosSchema,
  subtotalCentavos: centavosSchema,
});

export type PortalPedidoItem = z.infer<typeof portalPedidoItemSchema>;

export const portalPedidoSchema = z.object({
  id: z.string().uuid(),
  correlativo: z.number().int().positive(),
  estado: z.enum(PEDIDO_ESTADOS),
  fechaOperacion: z.string(),
  origen: z.literal("PORTAL"),
  items: z.array(portalPedidoItemSchema),
  totalCentavos: centavosSchema,
  textoConfirmacion: z.string(),
});

export type PortalPedido = z.infer<typeof portalPedidoSchema>;

export const portalFacturaPendienteSchema = z.object({
  id: z.string().uuid(),
  numeroDte: z.string().nullable(),
  montoCentavos: centavosSchema,
  abonadoCentavos: centavosSchema,
  saldoCentavos: centavosSchema,
  emitidaAt: z.string().nullable(),
  antiguedadDias: z.number().int().nonnegative(),
  estado: z.enum(["PENDIENTE", "ABONO_PARCIAL", "VENCIDO"]),
});

export type PortalFacturaPendiente = z.infer<typeof portalFacturaPendienteSchema>;

export const portalCuentaSchema = z.object({
  facturasPendientes: z.number().int().nonnegative(),
  limiteFacturasPendientes: z.number().int().nullable(),
  saldoCentavos: centavosSchema,
  facturas: z.array(portalFacturaPendienteSchema),
});

export type PortalCuenta = z.infer<typeof portalCuentaSchema>;

export const portalSesionSchema = z.object({
  cliente: z.object({
    id: z.string().uuid(),
    nombre: z.string(),
    horarioEntregaFijo: z.string().nullable(),
  }),
  ventana: portalVentanaSchema,
  catalogo: z.array(portalProductoSchema),
  pedidoAbierto: portalPedidoSchema.nullable(),
  cuenta: portalCuentaSchema,
});

export type PortalSesion = z.infer<typeof portalSesionSchema>;

export function textoConfirmacionPedido(input: {
  correlativo: number;
  fechaOperacion: string;
  totalCentavos: number;
  horarioEntregaFijo: string | null;
}): string {
  const fecha = formatearFechaLarga(input.fechaOperacion);
  const total = formatearCentavos(input.totalCentavos);
  const horario = input.horarioEntregaFijo
    ? ` Entrega a las ${input.horarioEntregaFijo}.`
    : "";
  return `Recibimos su pedido ${input.correlativo} para el ${fecha}. Total ${total}.${horario}`;
}

export const MENSAJE_PORTAL_NO_ENCONTRADO = "No encontramos esa página.";
export const MENSAJE_VENTANA_CERRADA =
  "La ventana de pedido está cerrada. Abre de nuevo a la hora indicada.";
export const MENSAJE_PRECIO_AUSENTE =
  "Ese producto no tiene precio. Avisé a la fábrica.";
export const MENSAJE_LIMITE_TASA =
  "Demasiadas solicitudes. Espere un momento y vuelva a intentar.";
export const MENSAJE_PEDIDO_ANULADO =
  "Ese pedido está anulado y no se puede modificar.";
export const MENSAJE_MOTIVO_ANULACION =
  "Indique el motivo. El pedido queda anulado, no se borra.";

const fechaOperacionSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use AAAA-MM-DD");

export const listarPedidosQuerySchema = z.object({
  fechaOperacion: opcionalVacio(fechaOperacionSchema),
  clienteId: opcionalVacio(z.string().uuid()),
  estado: opcionalVacio(z.enum(PEDIDO_ESTADOS)),
  /** Con clienteId y sin fecha: últimos pedidos del restaurante (no solo el día). */
  historial: opcionalVacio(
    z.enum(["1", "true"]).transform(() => true as const),
  ),
});

export type ListarPedidosQuery = z.infer<typeof listarPedidosQuerySchema>;

export const pedidoBandejaSchema = z.object({
  id: z.string().uuid(),
  correlativo: z.number().int().positive(),
  fechaOperacion: z.string(),
  clienteId: z.string().uuid(),
  clienteNombre: z.string(),
  estado: z.enum(PEDIDO_ESTADOS),
  origen: z.enum(PEDIDO_ORIGENES),
  totalCentavos: centavosSchema,
  capturadoPor: z.string().uuid().nullable(),
  capturadoAt: z.string().min(20),
  notasAdmin: z.string().nullable(),
});

export type PedidoBandeja = z.infer<typeof pedidoBandejaSchema>;

export const pedidoDetalleItemSchema = z.object({
  productoId: z.string().uuid(),
  cantidad: z.number().int().positive(),
  nombreMostrado: z.string(),
  unidadMedida: z.enum(UNIDADES_MEDIDA),
  precioUnitarioCentavos: centavosSchema,
  subtotalCentavos: centavosSchema,
  puntoCarga: z.enum(PUNTOS_CARGA),
  notaProduccion: z.string().nullable(),
});

export type PedidoDetalleItem = z.infer<typeof pedidoDetalleItemSchema>;

export const pedidoAuditEntrySchema = z.object({
  accion: z.string(),
  actorTipo: z.string(),
  actorNombre: z.string().nullable(),
  createdAt: z.string().min(20),
  antes: z.unknown().nullable(),
  despues: z.unknown().nullable(),
});

export type PedidoAuditEntry = z.infer<typeof pedidoAuditEntrySchema>;

export const pedidoDetalleSchema = z.object({
  id: z.string().uuid(),
  correlativo: z.number().int().positive(),
  fechaOperacion: z.string(),
  clienteId: z.string().uuid(),
  clienteNombre: z.string(),
  clienteContacto: z.string().nullable(),
  clienteTelefonoWa: z.string().nullable(),
  horarioEntregaFijo: z.string().nullable(),
  notasPermanentes: z.string().nullable(),
  estado: z.enum(PEDIDO_ESTADOS),
  origen: z.enum(PEDIDO_ORIGENES),
  notasAdmin: z.string().nullable(),
  capturadoPor: z.string().uuid().nullable(),
  capturadoPorNombre: z.string().nullable(),
  capturadoAt: z.string().min(20),
  anuladoAt: z.string().nullable(),
  motivoAnulacion: z.string().nullable(),
  items: z.array(pedidoDetalleItemSchema),
  totalCentavos: centavosSchema,
  historial: z.array(pedidoAuditEntrySchema),
});

export type PedidoDetalle = z.infer<typeof pedidoDetalleSchema>;

export const crearPedidoManualRequestSchema = z.object({
  clienteId: z.string().uuid(),
  items: z.array(confirmarPedidoItemSchema).min(1),
  notasAdmin: z.string().max(2000).optional(),
});

export type CrearPedidoManualRequest = z.infer<
  typeof crearPedidoManualRequestSchema
>;

export const editarNotasPedidoRequestSchema = z.object({
  notasAdmin: z.string().max(2000),
});

export type EditarNotasPedidoRequest = z.infer<
  typeof editarNotasPedidoRequestSchema
>;

export const editarItemsPedidoRequestSchema = z.object({
  items: z.array(confirmarPedidoItemSchema).min(1),
});

export type EditarItemsPedidoRequest = z.infer<
  typeof editarItemsPedidoRequestSchema
>;

export const anularPedidoRequestSchema = z.object({
  motivo: z
    .string()
    .trim()
    .min(1, MENSAJE_MOTIVO_ANULACION)
    .max(500),
});

export type AnularPedidoRequest = z.infer<typeof anularPedidoRequestSchema>;

export const PEDIDO_SSE_TIPOS = [
  "pedido.creado",
  "pedido.editado",
  "pedido.anulado",
] as const;

export const OPERACION_SSE_TIPOS = [
  "dia.cerrado",
  "dia.reabierto",
  "hoja.generada",
] as const;

export const PANEL_SSE_TIPOS = [
  ...PEDIDO_SSE_TIPOS,
  ...OPERACION_SSE_TIPOS,
  ...COBRANZA_SSE_TIPOS,
  ...MESSAGING_SSE_TIPOS,
] as const;

export const pedidoSseEventSchema = z.object({
  tipo: z.enum(PEDIDO_SSE_TIPOS),
  pedidoId: z.string().uuid(),
  fechaOperacion: fechaOperacionSchema,
});

export type PedidoSseEvent = z.infer<typeof pedidoSseEventSchema>;

export const panelSseEventSchema = z.union([
  pedidoSseEventSchema,
  z.object({
    tipo: z.enum(OPERACION_SSE_TIPOS),
    fechaOperacion: fechaOperacionSchema,
    versionHoja: z.number().int().nullable().optional(),
  }),
  z.object({
    tipo: z.enum(COBRANZA_SSE_TIPOS),
    fechaOperacion: fechaOperacionSchema,
    pedidoId: z.string().uuid().optional(),
    facturaId: z.string().uuid().optional(),
    clienteId: z.string().uuid().optional(),
  }),
  z.object({
    tipo: z.enum(MESSAGING_SSE_TIPOS),
    conversacionId: z.string().uuid().optional(),
    mensajeId: z.string().uuid().optional(),
    clienteId: z.string().uuid().optional(),
  }),
]);

export type PanelSseEvent = z.infer<typeof panelSseEventSchema>;
