import * as React from 'react';

/**
 * Fila de un `PedidoItem`. Muestra el nombre snapshot, el alias del cliente entre comillas
 * y, si hubo ajuste, la cantidad entregada resaltada.
 */
export interface PedidoItemRowProps {
  /** `nombre_mostrado` snapshot del ítem, no el nombre vivo del catálogo. */
  nombreMostrado: string;
  /** Alias con el que ESE cliente llama al producto. */
  alias?: string;
  unidadMedida?: 'LIBRA' | 'BOLSA' | 'UNIDAD';
  cantidad?: number;
  /** Si difiere de `cantidad`, se muestra el ajuste: la factura se calcula sobre lo entregado. */
  cantidadEntregada?: number;
  /** Precio snapshot en centavos enteros. */
  precioUnitarioCentavos?: number;
  puntoCarga?: 'PLANTA' | 'DEMOCRACIA';
  /** Nota de producción del cliente, p.ej. "grosor especial". */
  notaProduccion?: string;
  /** Cambia el total por un `QuantityStepper` (captura y edición dentro de la ventana). */
  editable?: boolean;
  onChangeCantidad?: (cantidad: number) => void;
  style?: React.CSSProperties;
}
export declare function PedidoItemRow(props: PedidoItemRowProps): JSX.Element;
