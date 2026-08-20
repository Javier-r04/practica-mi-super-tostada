import * as React from 'react';

/**
 * Campo de texto de una línea. Para montos usa `prefix="Q"` e `inputMode="decimal"`:
 * la conversión a centavos ocurre al enviar, nunca en el estado del campo.
 */
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Rótulo en versalitas sobre el campo. */
  label?: React.ReactNode;
  /** Texto de ayuda bajo el campo; se oculta si hay `error`. */
  hint?: React.ReactNode;
  /** Mensaje de error; pinta borde rojo. */
  error?: React.ReactNode;
  required?: boolean;
  /** Adorno a la izquierda, típicamente `Q`. */
  prefix?: React.ReactNode;
  /** Adorno a la derecha, típicamente la unidad (`lb`, `bolsas`). */
  suffix?: React.ReactNode;
  size?: 'sm' | 'md';
}
export declare function Input(props: InputProps): JSX.Element;

/** Envoltura rótulo + ayuda + error para controles propios. */
export interface FieldProps {
  label?: React.ReactNode; hint?: React.ReactNode; error?: React.ReactNode;
  required?: boolean; htmlFor?: string; children?: React.ReactNode; style?: React.CSSProperties;
}
export declare function Field(props: FieldProps): JSX.Element;
