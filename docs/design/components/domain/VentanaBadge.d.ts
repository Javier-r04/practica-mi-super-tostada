import * as React from 'react';

/**
 * Estado de una ventana temporal: la de pedido (15:00–00:00) o la de 24 h de WhatsApp.
 * La verdad la calcula el servidor; este componente solo la muestra.
 */
export interface VentanaBadgeProps {
  abierta?: boolean;
  /** Milisegundos restantes (se formatea `h:mm`) o una cadena ya formateada. */
  expiraEn?: number | string;
  /** Reemplaza el texto completo si necesitas otra redacción. */
  etiqueta?: string;
  /** `pedido` = ventana de captura · `whatsapp` = ventana de 24 h de Meta. */
  tipo?: 'pedido' | 'whatsapp';
  size?: 'sm' | 'md';
  style?: React.CSSProperties;
}
export declare function VentanaBadge(props: VentanaBadgeProps): JSX.Element;
