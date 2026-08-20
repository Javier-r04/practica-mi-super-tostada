import * as React from 'react';

/** Chip de dato editable: alias del cliente, favorito, filtro aplicado. Caja alta natural, no versalitas. */
export interface TagProps {
  tone?: 'default' | 'brand' | 'accent';
  /** Muestra la × de quitar. */
  onRemove?: () => void;
  icon?: React.ReactNode;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}
export declare function Tag(props: TagProps): JSX.Element;
