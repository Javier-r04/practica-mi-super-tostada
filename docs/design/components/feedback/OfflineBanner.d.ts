import * as React from 'react';

/**
 * Franja honesta de estado de conexión para la PWA de reparto. Si hay acciones en
 * IndexedDB sin confirmar, esto es lo único que puede decir "guardado": el resto de la
 * interfaz no muestra éxito hasta que el servidor responde.
 */
export interface OfflineBannerProps {
  online?: boolean;
  /** Acciones encoladas localmente (entregas, cobros, comprobantes). */
  pendientes?: number;
  sincronizando?: boolean;
  onReintentar?: () => void;
  style?: React.CSSProperties;
}
export declare function OfflineBanner(props: OfflineBannerProps): JSX.Element | null;
