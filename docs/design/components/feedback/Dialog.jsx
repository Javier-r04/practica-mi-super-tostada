import React from 'react';
import { Icon } from '../core/Icon.jsx';

export function Dialog({ open = true, title, description, children, footer, onClose, tone = 'default', width = 460, style }) {
  if (!open) return null;
  const acento = { default: 'var(--green-800)', danger: 'var(--red-600)', warning: 'var(--amber-600)' }[tone];
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', background: 'var(--surface-overlay)', padding: 'var(--space-4)', zIndex: 60 }}>
      <div role="dialog" aria-modal="true" style={{
        width: '100%', maxWidth: width, background: 'var(--surface-card)', borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-lg)', borderTop: `var(--border-width-accent) solid ${acento}`, overflow: 'hidden', ...style,
      }}>
        <header style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)', padding: 'var(--space-5) var(--space-5) var(--space-3)' }}>
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--weight-bold)' }}>{title}</h2>
            {description && <p style={{ marginTop: '4px', fontSize: 'var(--text-sm)', color: 'var(--text-muted)', lineHeight: 'var(--leading-relaxed)' }}>{description}</p>}
          </div>
          {onClose && (
            <button onClick={onClose} aria-label="Cerrar" style={{ display: 'inline-flex', width: '32px', height: '32px', alignItems: 'center', justifyContent: 'center', border: 0, borderRadius: 'var(--radius-sm)', background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)' }}>
              <Icon name="x" size={18} />
            </button>
          )}
        </header>
        {children && <div style={{ padding: '0 var(--space-5) var(--space-4)' }}>{children}</div>}
        {footer && (
          <footer style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)', padding: 'var(--space-4) var(--space-5)', background: 'var(--ink-50)', borderTop: 'var(--border-width) solid var(--border-subtle)' }}>{footer}</footer>
        )}
      </div>
    </div>
  );
}
