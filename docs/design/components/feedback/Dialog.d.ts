import * as React from 'react';

/**
 * Modal de confirmación. Toda acción irreversible en el sistema (anular, reabrir un día,
 * rotar el token de un cliente) pasa por aquí y pide motivo en texto libre.
 * Se posiciona en `position:absolute` sobre el contenedor con `position:relative`.
 */
export interface DialogProps {
  open?: boolean;
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Cuerpo: normalmente un `Textarea` de motivo o un resumen de lo que va a pasar. */
  children?: React.ReactNode;
  /** Botones, alineados a la derecha. La acción destructiva va como `variant="danger"`. */
  footer?: React.ReactNode;
  onClose?: () => void;
  /** Tiñe la línea superior: `danger` para anular, `warning` para reabrir. */
  tone?: 'default' | 'danger' | 'warning';
  width?: number;
  style?: React.CSSProperties;
}
export declare function Dialog(props: DialogProps): JSX.Element | null;
