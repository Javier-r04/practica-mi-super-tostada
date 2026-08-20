import * as React from 'react';

/** Barra inferior de 64px para móvil (reparto y panel en teléfono). Máximo 5 destinos. */
export interface BottomNavItem { id: string; label: string; icon: string; badge?: number | string }
export interface BottomNavProps {
  items: BottomNavItem[];
  activeId?: string;
  onSelect?: (id: string) => void;
  style?: React.CSSProperties;
}
export declare function BottomNav(props: BottomNavProps): JSX.Element;
