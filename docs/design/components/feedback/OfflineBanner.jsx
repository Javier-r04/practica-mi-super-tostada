import React from 'react';
import { Icon } from '../core/Icon.jsx';

export function OfflineBanner({ online = false, pendientes = 0, sincronizando = false, onReintentar, style }) {
  if (online && pendientes === 0 && !sincronizando) return null;
  const tono = online
    ? { bg: 'var(--blue-100)', fg: 'var(--blue-700)', icon: 'refresh-cw' }
    : { bg: 'var(--amber-100)', fg: 'var(--amber-700)', icon: 'cloud-off' };
  const texto = !online
    ? (pendientes > 0 ? `Sin señal · ${pendientes} ${pendientes === 1 ? 'acción' : 'acciones'} en este teléfono` : 'Sin señal · trabajando sin conexión')
    : (sincronizando ? `Sincronizando ${pendientes}…` : `${pendientes} ${pendientes === 1 ? 'acción' : 'acciones'} por enviar`);
  return (
    <div role="status" style={{
      display: 'flex', alignItems: 'center', gap: 'var(--space-2)', width: '100%', minHeight: '36px',
      padding: '0 var(--space-4)', background: tono.bg, color: tono.fg,
      fontSize: 'var(--text-xs)', fontWeight: 'var(--weight-bold)', ...style,
    }}>
      <Icon name={tono.icon} size={15} />
      <span style={{ flex: 1 }}>{texto}</span>
      {online && pendientes > 0 && !sincronizando && onReintentar && (
        <button onClick={onReintentar} style={{ border: 0, background: 'transparent', color: 'inherit', textDecoration: 'underline', cursor: 'pointer', font: 'inherit' }}>Enviar ahora</button>
      )}
    </div>
  );
}
