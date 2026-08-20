import * as React from 'react';

/** Área de texto para notas del pedido, motivo de reapertura y notas de producción. */
export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: React.ReactNode; hint?: React.ReactNode; error?: React.ReactNode; required?: boolean; rows?: number;
}
export declare function Textarea(props: TextareaProps): JSX.Element;
