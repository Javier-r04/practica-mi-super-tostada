import * as React from 'react';

/** Barra superior de 56px. Verde marca en móvil y en el portal; blanca dentro del panel de escritorio. */
export interface TopBarProps {
  title: React.ReactNode;
  /** Segunda línea: fecha de operación, nombre del cliente, estado de la ventana. */
  subtitle?: React.ReactNode;
  /** Zona izquierda: `BackButton` o el logotipo. */
  left?: React.ReactNode;
  right?: React.ReactNode;
  tone?: 'brand' | 'light';
  style?: React.CSSProperties;
}
export declare function TopBar(props: TopBarProps): JSX.Element;

/** Flecha de retroceso para la zona `left` de `TopBar`. */
export interface BackButtonProps { onClick?: () => void; label?: string; tone?: 'brand' | 'light' }
export declare function BackButton(props: BackButtonProps): JSX.Element;
