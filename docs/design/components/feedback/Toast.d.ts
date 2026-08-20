import * as React from 'react';

/**
 * Aviso puntual de resultado. Solo se muestra `exito` cuando el servidor confirmó;
 * si la acción está en la cola offline, el estado correcto es `aviso`.
 */
export interface ToastProps {
  tone?: 'exito' | 'aviso' | 'error' | 'info';
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Acción de recuperación, p.ej. "Reintentar ahora". */
  action?: React.ReactNode;
  onDismiss?: () => void;
  style?: React.CSSProperties;
}
export declare function Toast(props: ToastProps): JSX.Element;
