import * as React from 'react';

/**
 * Envoltorio de un glifo Lucide (el set de iconos sustituto del sistema).
 * Requiere el UMD de Lucide cargado en la página.
 */
export interface IconProps {
  /** Nombre kebab-case de Lucide, p.ej. `truck`, `receipt`, `message-circle`. */
  name: string;
  /** 16 en filas densas · 20 por defecto · 24 en barras táctiles. */
  size?: number;
  /** 2 por defecto; 2.25 solo para iconos en barra activa. */
  strokeWidth?: number;
  color?: string;
  style?: React.CSSProperties;
}
export declare function Icon(props: IconProps): JSX.Element;
