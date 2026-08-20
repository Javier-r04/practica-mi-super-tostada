import * as React from 'react';

/**
 * Contador de cantidad para capturar pedidos con el pulgar. Los botones miden 44px
 * (52px con `size="lg"`) y la cifra usa cifras tabulares.
 */
export interface QuantityStepperProps {
  value?: number;
  onChange?: (value: number) => void;
  /** 1 para unidades/bolsas, 0.5 cuando el producto se vende por libra. */
  step?: number;
  min?: number;
  max?: number;
  /** Unidad mostrada junto a la cifra: `lb`, `bolsas`, `un`. */
  unidad?: string;
  size?: 'md' | 'lg';
  style?: React.CSSProperties;
}
export declare function QuantityStepper(props: QuantityStepperProps): JSX.Element;
