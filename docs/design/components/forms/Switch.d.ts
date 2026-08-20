import * as React from 'react';

/** Interruptor de ajuste (día no laborable, permiso delegado, cliente activo). El cambio se aplica de inmediato. */
export interface SwitchProps {
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  label?: React.ReactNode;
  description?: React.ReactNode;
  disabled?: boolean;
  style?: React.CSSProperties;
}
export declare function Switch(props: SwitchProps): JSX.Element;
