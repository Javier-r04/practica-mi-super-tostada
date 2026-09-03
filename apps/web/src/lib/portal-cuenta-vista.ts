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
 * Texto del enlace de una aplicación de abono. El DTE identifica la factura
 * ante el SAT, pero el cliente reconoce su entrega por el correlativo y la
 * fecha, así que esos van primero.
 */
export function resumenAplicacion(aplicacion: PortalAbonoAplicacion): string {
  const entrega = formatearFechaLarga(aplicacion.fechaEntrega);
  return aplicacion.numeroDte
    ? `Pedido #${aplicacion.correlativo} · ${entrega} · DTE ${aplicacion.numeroDte}`
    : `Pedido #${aplicacion.correlativo} · ${entrega} · sin DTE`;
}

export function hrefPedidoPortal(token: string, pedidoId: string): string {
  return `/p/${encodeURIComponent(token)}/pedidos/${pedidoId}`;
}
