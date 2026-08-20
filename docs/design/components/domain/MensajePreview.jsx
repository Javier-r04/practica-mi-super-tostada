import React from 'react';
import { Icon } from '../core/Icon.jsx';

export function MensajePreview({ tipo = 'plantilla', plantilla, cuerpo, adjunto, hora, estado, style }) {
  const esPlantilla = tipo === 'plantilla';
  return (
    <div style={{ display: 'grid', gap: '6px', ...style }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
        <span style={{ fontSize: 'var(--text-2xs)', fontWeight: 'var(--weight-bold)', letterSpacing: 'var(--tracking-caps)', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
          {esPlantilla ? 'Plantilla aprobada' : 'Mensaje libre'}
        </span>
        {plantilla && <code style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-3xs)', padding: '1px 6px', borderRadius: 'var(--radius-xs)', background: 'var(--ink-100)', color: 'var(--ink-700)' }}>{plantilla}</code>}
      </div>
      <div style={{
        maxWidth: '420px', padding: 'var(--space-3)', background: esPlantilla ? 'var(--green-50)' : 'var(--white)',
        border: `var(--border-width) solid ${esPlantilla ? 'var(--green-200)' : 'var(--border-subtle)'}`,
        borderRadius: '14px 14px 14px 4px', boxShadow: 'var(--shadow-xs)',
      }}>
        {adjunto && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)', padding: 'var(--space-2)', background: 'var(--ink-50)', border: 'var(--border-width) solid var(--border-subtle)', borderRadius: 'var(--radius-sm)' }}>
            <Icon name="file-text" size={16} color="var(--red-600)" />
            <span style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--weight-semibold)' }}>{adjunto}</span>
          </div>
        )}
        <p style={{ whiteSpace: 'pre-wrap', fontSize: 'var(--text-sm)', lineHeight: 'var(--leading-relaxed)', color: 'var(--text-body)' }}>{cuerpo}</p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px', marginTop: '4px', fontSize: 'var(--text-3xs)', color: 'var(--text-subtle)', fontVariantNumeric: 'tabular-nums' }}>
          {hora}
          {estado === 'enviado' && <Icon name="check" size={12} color="var(--text-subtle)" />}
          {estado === 'entregado' && <Icon name="check-check" size={12} color="var(--text-subtle)" />}
          {estado === 'leido' && <Icon name="check-check" size={12} color="var(--blue-600)" />}
          {estado === 'error' && <Icon name="triangle-alert" size={12} color="var(--red-600)" />}
        </div>
      </div>
    </div>
  );
}
