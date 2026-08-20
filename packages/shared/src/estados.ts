export const ESTADOS = [
  "BORRADOR",
  "CONFIRMADO",
  "EN_PRODUCCION",
  "ENTREGADO",
  "ANULADO",
  "PAGADO",
  "PENDIENTE",
  "ABONO_PARCIAL",
  "VENCIDO",
  "SIN_SINCRONIZAR",
  "PLANTA",
  "DEMOCRACIA",
] as const;

export type Estado = (typeof ESTADOS)[number];

export const ESTADO_PRESENTACION: Record<
  Estado,
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
