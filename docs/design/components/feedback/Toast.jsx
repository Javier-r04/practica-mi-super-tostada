import React from 'react';
import { Icon } from '../core/Icon.jsx';

const mstToastTones = {
  exito: { icon: 'check-circle', bg: 'var(--green-100)', border: 'var(--green-300)', fg: 'var(--green-800)' },
  aviso: { icon: 'triangle-alert', bg: 'var(--amber-100)', border: 'var(--amber-600)', fg: 'var(--amber-700)' },
  error: { icon: 'octagon-alert', bg: 'var(--red-100)', border: 'var(--red-600)', fg: 'var(--red-700)' },
  info: { icon: 'info', bg: 'var(--blue-100)', border: 'var(--blue-600)', fg: 'var(--blue-700)' },
};

export function Toast({ tone = 'exito', title, description, action, onDismiss, style }) {
  const t = mstToastTones[tone] || mstToastTones.info;
  return (
    <div role="status" style={{
      display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)', width: '100%', maxWidth: '420px',
      padding: 'var(--space-3) var(--space-4)', background: t.bg, borderLeft: `var(--border-width-accent) solid ${t.border}`,
      borderRadius: 'var(--radius-sm)', boxShadow: 'var(--shadow-md)', color: t.fg, ...style,
    }}>
      <Icon name={t.icon} size={18} />
      <div style={{ flex: 1, display: 'grid', gap: '2px' }}>
        <span style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-bold)' }}>{title}</span>
        {description && <span style={{ fontSize: 'var(--text-xs)', color: 'var(--ink-700)' }}>{description}</span>}
        {action && <span style={{ marginTop: '4px' }}>{action}</span>}
      </div>
      {onDismiss && (
        <button onClick={onDismiss} aria-label="Cerrar" style={{ border: 0, background: 'transparent', cursor: 'pointer', color: 'inherit', opacity: 0.7, fontSize: '16px', lineHeight: 1 }}>×</button>
      )}
    </div>
  );
}
