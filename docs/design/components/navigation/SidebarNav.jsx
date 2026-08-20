import React from 'react';
import { Icon } from '../core/Icon.jsx';

export function SidebarNav({ items = [], activeId, onSelect, header, footer, style }) {
  return (
    <nav style={{
      display: 'flex', flexDirection: 'column', width: 'var(--sidebar-width)', flex: '0 0 auto',
      background: 'var(--surface-inverse)', color: 'var(--green-200)', ...style,
    }}>
      {header && <div style={{ padding: 'var(--space-4)' }}>{header}</div>}
      <div style={{ display: 'grid', gap: '2px', padding: '0 var(--space-2)', flex: 1 }}>
        {items.map((it) => {
          const active = it.id === activeId;
          return (
            <button
              key={it.id} onClick={() => onSelect && onSelect(it.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 'var(--space-3)', minHeight: '40px',
                padding: '0 var(--space-3)', border: 0, borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                textAlign: 'left', fontSize: 'var(--text-sm)',
                fontWeight: active ? 'var(--weight-bold)' : 'var(--weight-medium)',
                background: active ? 'var(--green-800)' : 'transparent',
                color: active ? 'var(--white)' : 'var(--green-200)',
                borderLeft: active ? '3px solid var(--yellow-400)' : '3px solid transparent',
                transition: 'var(--transition-control)',
              }}
            >
              <Icon name={it.icon} size={17} />
              <span style={{ flex: 1 }}>{it.label}</span>
              {it.badge != null && (
                <span style={{ fontSize: 'var(--text-3xs)', fontWeight: 'var(--weight-bold)', padding: '1px 6px', borderRadius: 'var(--radius-pill)', background: active ? 'var(--yellow-400)' : 'var(--green-800)', color: active ? 'var(--green-900)' : 'var(--yellow-400)' }}>{it.badge}</span>
              )}
            </button>
          );
        })}
      </div>
      {footer && <div style={{ padding: 'var(--space-4)', borderTop: 'var(--border-width) solid var(--green-850)' }}>{footer}</div>}
    </nav>
  );
}
