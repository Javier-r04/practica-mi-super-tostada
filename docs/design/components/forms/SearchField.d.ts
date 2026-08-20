import * as React from 'react';

/** Buscador en cápsula. Busca por nombre canónico y por alias del cliente a la vez. */
export interface SearchFieldProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  size?: 'sm' | 'md';
}
export declare function SearchField(props: SearchFieldProps): JSX.Element;
