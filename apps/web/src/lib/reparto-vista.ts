export type VistaParada = "entrega" | "cobro";
export type DestinoReparto = VistaParada | "ruta";

/** Saldo a cobrar en la parada: anterior + factura del pedido de hoy. */
export function saldoParadaCentavos(input: {
  saldoAnteriorCentavos: number;
  facturaSaldoCentavos?: number | null;
}): number {
  return input.saldoAnteriorCentavos + (input.facturaSaldoCentavos ?? 0);
}

/**
 * Vista al abrir una parada.
 * Ya entregado (servidor o cola local) con saldo → cobro; si no → entrega.
 */
export function vistaInicialParada(input: {
  estado: string;
  saldoCentavos: number;
  entregaLocal: boolean;
}): VistaParada {
  const entregado = input.estado === "ENTREGADO" || input.entregaLocal;
  if (entregado && input.saldoCentavos > 0) return "cobro";
  return "entrega";
}

/** Tras marcar entrega: cobro si hay saldo; si no, vuelve a la ruta. */
export function siguienteTrasEntrega(saldoCentavos: number): DestinoReparto {
  return saldoCentavos > 0 ? "cobro" : "ruta";
}

/** Cobro guardado (en servidor o en este teléfono) → siempre a la ruta. */
export function siguienteTrasCobro(): "ruta" {
  return "ruta";
}

/**
 * Botón atrás desde cobro: a ruta si ya entregó; a entrega solo si aún no marcó.
 * Desde entrega siempre a ruta.
 */
export function siguienteTrasVolver(input: {
  vista: VistaParada;
  yaEntregado: boolean;
}): DestinoReparto {
  if (input.vista === "cobro" && !input.yaEntregado) return "entrega";
  return "ruta";
}
