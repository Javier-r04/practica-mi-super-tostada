import { z } from "zod";
import { FAMILIAS, PEDIDO_ESTADOS, UNIDADES_MEDIDA } from "./estados";
import { formatearFechaLarga } from "./calendar";
import { centavosSchema, formatearCentavos } from "./money";

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
  estado: z.enum(["PENDIENTE", "ABONO_PARCIAL"]),
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
