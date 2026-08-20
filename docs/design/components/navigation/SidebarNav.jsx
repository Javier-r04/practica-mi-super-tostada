import React from 'react';
import { Icon } from '../core/Icon.jsx';

export function SidebarNav({ items = [], activeId, onSelect, header, footer, style }) {
  return (
    <nav style={{
      display: 'flex', flexDirection: 'column', width: 'var(--sidebar-width)', flex: '0 0 auto',
      background: 'var(--surface-nav)', color: 'var(--text-body)',
      borderRight: 'var(--border-width) solid var(--border-subtle)', ...style,
    }}>
      {header && <div style={{ padding: 'var(--space-4)' }}>{header}</div>}
      <div style={{ display: 'grid', gap: '2px', padding: '0 var(--space-2)', flex: 1 }}>
        {items.map((it) => {
          const active = it.id === activeId;
          const soon = Boolean(it.soon);
          return (
            <button
              key={it.id} onClick={() => !soon && onSelect && onSelect(it.id)}
              disabled={soon}
              style={{
                display: 'flex', alignItems: 'center', gap: 'var(--space-3)', minHeight: '44px',
                padding: '0 var(--space-3)', border: 0, borderRadius: 'var(--radius-sm)',
                cursor: soon ? 'not-allowed' : 'pointer',
                textAlign: 'left', fontSize: 'var(--text-sm)',
                fontWeight: active ? 'var(--weight-bold)' : 'var(--weight-medium)',
                background: active ? 'var(--surface-nav-active)' : 'transparent',
                color: active ? 'var(--text-brand)' : 'var(--text-body)',
                borderLeft: active ? '3px solid var(--nav-rail)' : '3px solid transparent',
                opacity: soon ? 0.45 : 1,
                transition: 'var(--transition-control)',
              }}
            >
              <Icon name={it.icon} size={17} />
              <span style={{ flex: 1 }}>{it.label}</span>
              {soon && (
                <span style={{ fontSize: '11px', fontWeight: 'var(--weight-bold)', letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Pronto</span>
              )}
              {it.badge != null && !soon && (
                <span style={{ fontSize: 'var(--text-3xs)', fontWeight: 'var(--weight-bold)', padding: '1px 6px', borderRadius: 'var(--radius-pill)', background: active ? 'var(--yellow-400)' : 'var(--green-50)', color: active ? 'var(--green-900)' : 'var(--green-800)' }}>{it.badge}</span>
              )}
            </button>
          );
        })}
      </div>
      {footer && <div style={{ padding: 'var(--space-4)', borderTop: 'var(--border-width) solid var(--border-subtle)' }}>{footer}</div>}
    </nav>
  );
}
