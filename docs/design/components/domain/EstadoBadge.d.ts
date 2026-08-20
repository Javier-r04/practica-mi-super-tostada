import * as React from 'react';

/**
 * Cápsula de estado de dominio. El color lo fija el enum, no quien la usa:
 * el mismo estado se ve igual en panel, portal y reparto.
 */
export interface EstadoBadgeProps {
  /** Estados de pedido, de cobranza, de cola offline y puntos de carga. */
  estado:
    | 'BORRADOR' | 'CONFIRMADO' | 'EN_PRODUCCION' | 'ENTREGADO' | 'ANULADO'
    | 'PAGADO' | 'PENDIENTE' | 'ABONO_PARCIAL' | 'VENCIDO'
    | 'SIN_SINCRONIZAR' | 'PLANTA' | 'DEMOCRACIA';
  size?: 'sm' | 'md';
  style?: React.CSSProperties;
}
export declare function EstadoBadge(props: EstadoBadgeProps): JSX.Element;
