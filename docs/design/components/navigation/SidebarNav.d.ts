import * as React from 'react';

/** Navegación lateral del panel interno: verde profundo, ítem activo con filo amarillo de 3px. */
export interface SidebarItem {
  id: string;
  label: string;
  /** Nombre de icono Lucide. */
  icon: string;
  /** Contador a la derecha: pendientes, no leídos. */
  badge?: number | string;
}
export interface SidebarNavProps {
  items: SidebarItem[];
  activeId?: string;
  onSelect?: (id: string) => void;
  /** Zona superior: logotipo + nombre de la organización. */
  header?: React.ReactNode;
  /** Zona inferior: usuario y rol. */
  footer?: React.ReactNode;
  style?: React.CSSProperties;
}
export declare function SidebarNav(props: SidebarNavProps): JSX.Element;
