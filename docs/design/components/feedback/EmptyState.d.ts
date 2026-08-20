import * as React from 'react';

/** Estado vacío. El texto dice qué pasa y qué sigue, en tono directo, sin disculpas. */
export interface EmptyStateProps {
  /** Nombre de icono Lucide. */
  icon?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  size?: 'sm' | 'md';
  style?: React.CSSProperties;
}
export declare function EmptyState(props: EmptyStateProps): JSX.Element;
