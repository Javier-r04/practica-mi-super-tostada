export const PEDIDO_ESTADOS = [
  "BORRADOR",
  "CONFIRMADO",
  "EN_PRODUCCION",
  "ENTREGADO",
  "ANULADO",
] as const;
export type PedidoEstado = (typeof PEDIDO_ESTADOS)[number];

export const PAGO_ESTADOS = [
  "PAGADO",
  "PENDIENTE",
  "ABONO_PARCIAL",
  "VENCIDO",
] as const;
export type PagoEstado = (typeof PAGO_ESTADOS)[number];

export const COLA_ESTADOS = ["SIN_SINCRONIZAR"] as const;
export type ColaEstado = (typeof COLA_ESTADOS)[number];

export const PUNTOS_CARGA = ["PLANTA", "DEMOCRACIA"] as const;
export type PuntoCarga = (typeof PUNTOS_CARGA)[number];

export const UNIDADES_MEDIDA = ["LIBRA", "BOLSA", "UNIDAD"] as const;
export type UnidadMedida = (typeof UNIDADES_MEDIDA)[number];

export const ROLES = [
  "ADMIN_JEFE",
  "ADMIN",
  "PRODUCCION",
  "TIENDA",
  "REPARTO",
] as const;
export type Rol = (typeof ROLES)[number];

export const PEDIDO_ORIGENES = ["PORTAL", "MANUAL"] as const;
export type PedidoOrigen = (typeof PEDIDO_ORIGENES)[number];

export const FAMILIAS = ["TORTILLA", "TOSTADA", "FRITURA"] as const;
export type Familia = (typeof FAMILIAS)[number];

/** Cheque queda como nota de cliente hasta F-503; el enum no lo incluye. */
export const PAGO_METODOS = ["EFECTIVO", "TRANSFERENCIA"] as const;
export type PagoMetodo = (typeof PAGO_METODOS)[number];

/**
 * En Guatemala "cancelado" significa pagado, no anulado (CONTEXT.md §2).
 * En UI usar siempre estas etiquetas; nunca "cancelado" a secas.
 */
export const COPY_PAGO_COMPLETO = "Pagado";
export const COPY_PEDIDO_ANULADO = "Anulado";

/** Unión solo para la cápsula de UI. No usarla en transiciones de pedido. */
export const ESTADOS_BADGE = [
  ...PEDIDO_ESTADOS,
  ...PAGO_ESTADOS,
  ...COLA_ESTADOS,
  ...PUNTOS_CARGA,
] as const;
export type EstadoBadgeVariant = (typeof ESTADOS_BADGE)[number];

export const ESTADO_PRESENTACION: Record<
  EstadoBadgeVariant,
  { label: string; bg: string; fg: string }
> = {
  BORRADOR: {
    label: "Borrador",
    bg: "var(--estado-borrador-bg)",
    fg: "var(--estado-borrador-fg)",
  },
  CONFIRMADO: {
    label: "Confirmado",
    bg: "var(--estado-confirmado-bg)",
    fg: "var(--estado-confirmado-fg)",
  },
  EN_PRODUCCION: {
    label: "En producción",
    bg: "var(--estado-produccion-bg)",
    fg: "var(--estado-produccion-fg)",
  },
  ENTREGADO: {
    label: "Entregado",
    bg: "var(--estado-entregado-bg)",
    fg: "var(--estado-entregado-fg)",
  },
  ANULADO: {
    label: "Anulado",
    bg: "var(--estado-anulado-bg)",
    fg: "var(--estado-anulado-fg)",
  },
  PAGADO: {
    label: "Pagado",
    bg: "var(--estado-pagado-bg)",
    fg: "var(--estado-pagado-fg)",
  },
  PENDIENTE: {
    label: "Pendiente",
    bg: "var(--estado-pendiente-bg)",
    fg: "var(--estado-pendiente-fg)",
  },
  ABONO_PARCIAL: {
    label: "Abono parcial",
    bg: "var(--estado-pendiente-bg)",
    fg: "var(--estado-pendiente-fg)",
  },
  VENCIDO: {
    label: "Vencido",
    bg: "var(--estado-vencido-bg)",
    fg: "var(--estado-vencido-fg)",
  },
  SIN_SINCRONIZAR: {
    label: "Sin sincronizar",
    bg: "var(--estado-sin-sincronizar-bg)",
    fg: "var(--estado-sin-sincronizar-fg)",
  },
  PLANTA: {
    label: "Planta",
    bg: "var(--carga-planta-bg)",
    fg: "var(--carga-planta-fg)",
  },
  DEMOCRACIA: {
    label: "Democracia",
    bg: "var(--carga-democracia-bg)",
    fg: "var(--carga-democracia-fg)",
  },
};
