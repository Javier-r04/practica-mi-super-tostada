import React from 'react';
import { Icon } from '../core/Icon.jsx';

export function EmptyState({ icon = 'inbox', title, description, action, size = 'md', style }) {
  return (
    <div style={{
      display: 'grid', justifyItems: 'center', gap: 'var(--space-2)', textAlign: 'center',
      padding: size === 'sm' ? 'var(--space-6)' : 'var(--space-10) var(--space-6)', ...style,
    }}>
      <span style={{ display: 'grid', placeItems: 'center', width: '48px', height: '48px', borderRadius: '50%', background: 'var(--green-50)', color: 'var(--green-700)' }}>
        <Icon name={icon} size={22} />
      </span>
      <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 'var(--weight-bold)' }}>{title}</h3>
      {description && <p style={{ maxWidth: '38ch', fontSize: 'var(--text-sm)', color: 'var(--text-muted)', lineHeight: 'var(--leading-relaxed)' }}>{description}</p>}
      {action && <div style={{ marginTop: 'var(--space-2)' }}>{action}</div>}
    </div>
  );
}
