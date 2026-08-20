import * as React from 'react';

/**
 * Vista previa renderizada de un mensaje de WhatsApp, tal como lo recibirá el cliente.
 * Se muestra **siempre antes de enviar**, con las variables ya sustituidas.
 */
export interface MensajePreviewProps {
  /** `plantilla` (ventana cerrada) o `libre` (ventana de 24 h abierta). */
  tipo?: 'plantilla' | 'libre';
  /** `template_name` registrado en Meta, p.ej. `estado_cuenta_v3`. */
  plantilla?: string;
  /** Cuerpo ya renderizado. Las variables de plantilla no admiten saltos de línea. */
  cuerpo: string;
  /** Nombre del documento adjunto como header, p.ej. `estado-cuenta-agosto.pdf`. */
  adjunto?: string;
  hora?: string;
  estado?: 'enviado' | 'entregado' | 'leido' | 'error';
  style?: React.CSSProperties;
}
export declare function MensajePreview(props: MensajePreviewProps): JSX.Element;
