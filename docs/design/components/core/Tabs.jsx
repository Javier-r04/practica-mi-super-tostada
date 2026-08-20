import React from 'react';

export function Tabs({ tabs = [], activeId, onSelect, size = 'md', style }) {
  return (
    <div role="tablist" style={{ display: 'flex', gap: 'var(--space-1)', borderBottom: 'var(--border-width) solid var(--border-subtle)', ...style }}>
      {tabs.map((t) => {
        const active = t.id === activeId;
        return (
          <button
            key={t.id} role="tab" aria-selected={active} onClick={() => onSelect && onSelect(t.id)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)', border: 0, background: 'transparent',
              padding: size === 'sm' ? '0 var(--space-3) 8px' : '0 var(--space-4) 10px', cursor: 'pointer',
              fontSize: size === 'sm' ? 'var(--text-xs)' : 'var(--text-sm)',
              fontWeight: active ? 'var(--weight-bold)' : 'var(--weight-medium)',
              color: active ? 'var(--green-800)' : 'var(--text-muted)',
              boxShadow: active ? 'inset 0 -3px 0 0 var(--green-800)' : 'none',
              transition: 'var(--transition-control)', minHeight: size === 'sm' ? '32px' : 'var(--tap-min)',
            }}
          >
            {t.label}
            {t.count != null && (
              <span style={{ fontSize: 'var(--text-3xs)', fontWeight: 'var(--weight-bold)', padding: '1px 6px', borderRadius: 'var(--radius-pill)', background: active ? 'var(--green-100)' : 'var(--ink-100)', color: active ? 'var(--green-700)' : 'var(--ink-600)' }}>{t.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
