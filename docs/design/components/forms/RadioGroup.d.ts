import * as React from 'react';

/** Grupo de opciones excluyentes en botones segmentados táctiles (método de pago, punto de carga). */
export interface RadioOption { value: string; label: string; icon?: React.ReactNode }
export interface RadioGroupProps {
  name: string;
  options: (RadioOption | string)[];
  value?: string;
  onChange?: (value: string) => void;
  /** `row` reparte el ancho (2–3 opciones); `column` apila (4+). */
  layout?: 'row' | 'column';
  style?: React.CSSProperties;
}
export declare function RadioGroup(props: RadioGroupProps): JSX.Element;
