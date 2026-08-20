import * as React from 'react';

/** Selector nativo (mejor en móvil que un menú propio). Para 2–3 opciones cortas usa `RadioGroup`. */
export interface SelectOption { value: string; label: string }
export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: React.ReactNode; hint?: React.ReactNode; error?: React.ReactNode; required?: boolean;
  /** Cadenas o `{value,label}`. */
  options?: (SelectOption | string)[];
  size?: 'sm' | 'md';
}
export declare function Select(props: SelectProps): JSX.Element;
