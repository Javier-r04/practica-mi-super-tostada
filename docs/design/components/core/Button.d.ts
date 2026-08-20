import * as React from 'react';

/**
 * Botón de acción. `accent` (amarillo rótulo) se reserva para la acción principal
 * de una pantalla; nunca dos accent visibles a la vez.
 */
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** primary = verde marca · accent = amarillo (una por pantalla) · secondary = contorno · ghost · danger */
  variant?: 'primary' | 'accent' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  /** Ocupa el ancho completo. Obligatorio en móvil para acciones de reparto. */
  block?: boolean;
  disabled?: boolean;
  /** Muestra "Guardando…" y bloquea el botón. Nunca mostrar éxito sin confirmación del servidor. */
  loading?: boolean;
  /** Si se pasa, renderiza un `<a>` con la misma apariencia. */
  href?: string;
  children?: React.ReactNode;
}
export declare function Button(props: ButtonProps): JSX.Element;
