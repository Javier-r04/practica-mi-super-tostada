import type { FacturaPublica } from "@misupertostada/shared";

export type VistaParada = "entrega" | "cobro";
export type DestinoReparto = VistaParada | "ruta";

/** Saldo a cobrar en la parada: anterior + factura del pedido de hoy. */
export function saldoParadaCentavos(input: {
  saldoAnteriorCentavos: number;
  facturaSaldoCentavos?: number | null;
}): number {
  return input.saldoAnteriorCentavos + (input.facturaSaldoCentavos ?? 0);
}

/** Desglose de cobro para la tarjeta de ruta (lista de paradas). */
export type DesgloseCobroParada = {
  saldoTotalCentavos: number;
  saldoAnteriorCentavos: number;
  facturaSaldoCentavos: number;
  facturaAbonadoCentavos: number;
  facturaMontoCentavos: number | null;
  mostrarBannerCobrar: boolean;
  mostrarDesgloseHoy: boolean;
  estadoFactura: FacturaPublica["estado"] | null;
};

export function desgloseCobroParada(input: {
  saldoAnteriorCentavos: number;
  factura: FacturaPublica | null;
}): DesgloseCobroParada {
  const facturaSaldoCentavos = input.factura?.saldoCentavos ?? 0;
  const facturaAbonadoCentavos = input.factura?.abonadoCentavos ?? 0;
  const facturaMontoCentavos = input.factura?.montoCentavos ?? null;
  const saldoTotalCentavos = saldoParadaCentavos({
    saldoAnteriorCentavos: input.saldoAnteriorCentavos,
    facturaSaldoCentavos: input.factura?.saldoCentavos,
  });

  return {
    saldoTotalCentavos,
    saldoAnteriorCentavos: input.saldoAnteriorCentavos,
    facturaSaldoCentavos,
    facturaAbonadoCentavos,
    facturaMontoCentavos,
    mostrarBannerCobrar: saldoTotalCentavos > 0,
    mostrarDesgloseHoy:
      input.factura != null &&
      (facturaAbonadoCentavos > 0 || facturaSaldoCentavos > 0),
    estadoFactura: input.factura?.estado ?? null,
  };
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
