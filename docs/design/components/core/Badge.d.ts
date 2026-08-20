import * as React from 'react';

/** Etiqueta de estado en cápsula, versalitas. Para estados de dominio usa `EstadoBadge`. */
export interface BadgeProps {
  tone?: 'neutral' | 'green' | 'yellow' | 'amber' | 'red' | 'blue' | 'solid';
  size?: 'sm' | 'md';
  /** Punto de color a la izquierda del rótulo. */
  dot?: boolean;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}
export declare function Badge(props: BadgeProps): JSX.Element;
