import * as React from 'react';

/**
 * Contenedor de contenido. Radio 14px, borde de 1px y sombra baja: la tarjeta
 * nunca "flota" salvo en modal.
 */
export interface CardProps {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  /** Acciones alineadas a la derecha del encabezado. */
  actions?: React.ReactNode;
  /** `paper` = crema del material impreso · `brand` = verde profundo · `accent` = amarillo suave (avisos). */
  tone?: 'default' | 'paper' | 'brand' | 'accent';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  /** El cuerpo va a sangre (listas y tablas dentro de la tarjeta). */
  flush?: boolean;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}
export declare function Card(props: CardProps): JSX.Element;
