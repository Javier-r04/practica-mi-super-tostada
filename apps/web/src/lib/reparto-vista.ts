import {
  estadoFactura,
  montoFacturaCentavos,
  type FacturaPublica,
  type FilaCola,
  type RutaParada,
} from "@misupertostada/shared";

const FACTURA_LOCAL_ID = "00000000-0000-4000-8000-000000000099";

function filaActiva(fila: FilaCola): boolean {
  return fila.estado === "pendiente" || fila.estado === "enviando";
}

function aplicarPagoFifo(input: {
  montoCentavos: number;
  saldoAnteriorCentavos: number;
  factura: FacturaPublica | null;
}): { saldoAnteriorCentavos: number; factura: FacturaPublica | null } {
  let restante = input.montoCentavos;
  let saldoAnteriorCentavos = input.saldoAnteriorCentavos;
  let factura = input.factura ? { ...input.factura } : null;

  if (restante <= 0) {
    return { saldoAnteriorCentavos, factura };
  }

  const aAnterior = Math.min(saldoAnteriorCentavos, restante);
  saldoAnteriorCentavos -= aAnterior;
  restante -= aAnterior;

  if (restante > 0 && factura) {
    const aFactura = Math.min(factura.saldoCentavos, restante);
    const abonadoCentavos = factura.abonadoCentavos + aFactura;
    const saldoCentavos = factura.montoCentavos - abonadoCentavos;
    factura = {
      ...factura,
      abonadoCentavos,
      saldoCentavos,
      estado: estadoFactura({
        montoCentavos: factura.montoCentavos,
        abonadoCentavos,
        antiguedadDias: factura.antiguedadDias,
      }),
    };
  }

  return { saldoAnteriorCentavos, factura };
}

/**
 * Mezcla entregas y cobros aún en la cola del teléfono para que Tony vea
 * al instante lo cobrado, no solo tras sincronizar con el servidor.
 */
export function paradaConColaLocal(
  parada: RutaParada,
  cola: readonly FilaCola[],
): RutaParada {
  let estado = parada.estado;
  let items = parada.items.map((item) => ({ ...item }));
  let saldoAnteriorCentavos = parada.saldoAnteriorCentavos;
  let factura = parada.factura ? { ...parada.factura } : null;
  let entregado = estado === "ENTREGADO";

  const filas = cola
    .filter(filaActiva)
    .slice()
    .sort((a, b) =>
      a.enqueuedAt < b.enqueuedAt ? -1 : a.enqueuedAt > b.enqueuedAt ? 1 : 0,
    );

  for (const fila of filas) {
    if (fila.tipo === "ENTREGA" && fila.pedidoId === parada.pedidoId) {
      items = items.map((item) => {
        const entregadoItem =
          fila.items.find((i) => i.itemId === item.id) ??
          fila.items.find((i) => i.productoId === item.productoId && !i.itemId);
        const cantidadEntregada =
          entregadoItem?.cantidadEntregada ?? item.cantidadPedida;
        return { ...item, cantidadEntregada };
      });
      const montoCentavos = montoFacturaCentavos(items);
      const abonadoCentavos = factura?.abonadoCentavos ?? 0;
      estado = "ENTREGADO";
      entregado = true;
      factura = {
        id: factura?.id ?? FACTURA_LOCAL_ID,
        pedidoId: parada.pedidoId,
        numeroDte: factura?.numeroDte ?? null,
        montoCentavos,
        abonadoCentavos,
        saldoCentavos: Math.max(0, montoCentavos - abonadoCentavos),
        emitidaAt: factura?.emitidaAt ?? null,
        antiguedadDias: factura?.antiguedadDias ?? 0,
        estado: estadoFactura({
          montoCentavos,
          abonadoCentavos,
          antiguedadDias: factura?.antiguedadDias ?? 0,
        }),
      };
      continue;
    }

    if (fila.tipo !== "PAGO" || fila.clienteId !== parada.clienteId) continue;
    if (fila.pedidoId && fila.pedidoId === parada.pedidoId && !entregado) {
      continue;
    }

    const aplicado = aplicarPagoFifo({
      montoCentavos: fila.montoCentavos,
      saldoAnteriorCentavos,
      factura,
    });
    saldoAnteriorCentavos = aplicado.saldoAnteriorCentavos;
    factura = aplicado.factura;
  }

  return {
    ...parada,
    estado,
    items,
    saldoAnteriorCentavos,
    factura,
  };
}

/** Cobros en cola local que aún no entraron al cuadre del servidor. */
export function cobradoPendienteColaCentavos(
  cola: readonly FilaCola[],
): number {
  return cola
    .filter(
      (fila): fila is Extract<FilaCola, { tipo: "PAGO" }> =>
        fila.tipo === "PAGO" && filaActiva(fila),
    )
    .reduce((acc, fila) => acc + fila.montoCentavos, 0);
}

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
