import {
  formatearCentavos,
  formatearFechaLarga,
  type PortalAbonoAplicacion,
  type PortalFacturaFiltro,
} from "@misupertostada/shared";

/** Rótulos del filtro de facturas del portal. */
export const FILTRO_FACTURA_ETIQUETA: Record<PortalFacturaFiltro, string> = {
  pendientes: "Pendientes",
  pagadas: "Pagadas",
  todas: "Todas",
};

export function esFiltroFacturas(valor: string): valor is PortalFacturaFiltro {
  return valor === "pendientes" || valor === "pagadas" || valor === "todas";
}

export type AvancePago = {
  faltaCentavos: number;
  porcentaje: number;
  /** El avance no puede ir solo en color: esto es lo que se lee. */
  etiqueta: string;
};

/**
 * «¿Cuánto me falta?» de una factura.
 *
 * Todo en centavos enteros; el porcentaje es solo para la barra y se redondea
 * al entero más cercano — nunca sale de aquí una cifra de dinero derivada de
 * un float.
 */
export function avancePagoFactura(factura: {
  montoCentavos: number;
  abonadoCentavos: number;
}): AvancePago {
  const monto = factura.montoCentavos;
  const abonado = Math.min(factura.abonadoCentavos, monto);
  const falta = Math.max(0, monto - abonado);

  // Una factura de monto 0 (todo entregado en cero) está pagada por
  // definición: dividir daría NaN.
  const porcentaje = monto === 0 ? 100 : Math.round((abonado / monto) * 100);

  if (falta === 0) {
    return { faltaCentavos: 0, porcentaje: 100, etiqueta: "Pagada por completo" };
  }
  if (abonado === 0) {
    return {
      faltaCentavos: falta,
      porcentaje,
      etiqueta: `Falta ${formatearCentavos(falta)}`,
    };
  }
  return {
    faltaCentavos: falta,
    porcentaje,
    etiqueta: `Abonado ${formatearCentavos(abonado)} · falta ${formatearCentavos(falta)}`,
  };
}

/**
 * Enlace de una aplicación de abono, en dos renglones.
 *
 * En una sola línea no cabe en un teléfono: el `truncate` se comía justo el
 * final, que es donde iba el DTE. Arriba la identidad —el pedido, que es como
 * el cliente reconoce la entrega—; abajo la fecha y el DTE, que sí pueden
 * recortarse sin dejar el renglón sin sentido.
 */
export function resumenAplicacion(aplicacion: PortalAbonoAplicacion): {
  titulo: string;
  detalle: string;
} {
  return {
    titulo: `Pedido #${aplicacion.correlativo}`,
    detalle: aplicacion.numeroDte
      ? `${formatearFechaLarga(aplicacion.fechaEntrega)} · DTE ${aplicacion.numeroDte}`
      : `${formatearFechaLarga(aplicacion.fechaEntrega)} · sin DTE`,
  };
}

export function hrefPedidoPortal(token: string, pedidoId: string): string {
  return `/p/${encodeURIComponent(token)}/pedidos/${pedidoId}`;
}
