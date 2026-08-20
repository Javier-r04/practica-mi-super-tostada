import * as React from 'react';

/**
 * Muestra un monto. **Recibe centavos enteros**, nunca un decimal: el formateo a
 * `Q 12.50` es la única capa donde el dinero se vuelve texto.
 */
export interface MoneyProps {
  /** Monto en centavos enteros. `1250` → `Q 12.50`. */
  centavos: number;
  /** `xl` usa la tipografía display, para cifras de tablero. */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  tone?: 'default' | 'muted' | 'pagado' | 'pendiente' | 'vencido' | 'accent' | 'inverse';
  /** `false` omite el símbolo `Q` (columnas donde ya está en el encabezado). */
  simbolo?: boolean;
  style?: React.CSSProperties;
}
export declare function Money(props: MoneyProps): JSX.Element;

/** Formatea centavos enteros a `Q 1,240.50`. Úsala fuera de React solo en la capa de presentación. */
export declare function formatearCentavos(centavos: number, opts?: { simbolo?: boolean }): string;
