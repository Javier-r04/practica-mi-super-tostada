import * as React from 'react';

/** Casilla de verificación con área táctil de 44px. */
export interface CheckboxProps {
  label?: React.ReactNode;
  /** Línea secundaria bajo el rótulo. */
  description?: React.ReactNode;
  checked?: boolean;
  onChange?: (checked: boolean, event: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  style?: React.CSSProperties;
}
export declare function Checkbox(props: CheckboxProps): JSX.Element;
