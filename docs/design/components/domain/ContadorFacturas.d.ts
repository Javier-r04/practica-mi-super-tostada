import * as React from 'react';

/**
 * Contador de cobranza. Cuenta **facturas**, no pedidos: es lo que hoy se cuenta en el
 * cuaderno. Al alcanzar `limite` se pinta en rojo y se rotula el exceso.
 */
export interface ContadorFacturasProps {
  pendientes: number;
  /** `limite_facturas_pendientes` del cliente. */
  limite?: number;
  /** Saldo asociado, en centavos enteros. */
  montoCentavos?: number;
  etiqueta?: string;
  size?: 'md' | 'lg';
  style?: React.CSSProperties;
}
export declare function ContadorFacturas(props: ContadorFacturasProps): JSX.Element;
