import * as React from 'react';

/** Pestañas de sección con contador opcional. Subrayado verde de 3px en la activa. */
export interface TabItem { id: string; label: string; /** Contador a la derecha del rótulo (facturas, pedidos, no leídos). */ count?: number }
export interface TabsProps {
  tabs: TabItem[];
  activeId?: string;
  onSelect?: (id: string) => void;
  size?: 'sm' | 'md';
  style?: React.CSSProperties;
}
export declare function Tabs(props: TabsProps): JSX.Element;
