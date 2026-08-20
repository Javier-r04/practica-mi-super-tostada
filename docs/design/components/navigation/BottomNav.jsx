import React from 'react';
import { Icon } from '../core/Icon.jsx';

export function BottomNav({ items = [], activeId, onSelect, style }) {
  return (
    <nav style={{
      display: 'flex', alignItems: 'stretch', height: 'var(--bottombar-height)',
      background: 'var(--surface-card)', borderTop: 'var(--border-width) solid var(--border-subtle)',
      boxShadow: '0 -2px 8px rgba(23,25,15,.06)', ...style,
    }}>
      {items.map((it) => {
        const active = it.id === activeId;
        return (
          <button
            key={it.id} onClick={() => onSelect && onSelect(it.id)}
            style={{
              flex: 1, display: 'grid', justifyItems: 'center', alignContent: 'center', gap: '3px',
              border: 0, background: 'transparent', cursor: 'pointer', position: 'relative',
              color: active ? 'var(--green-800)' : 'var(--text-muted)',
              fontSize: 'var(--text-3xs)', fontWeight: active ? 'var(--weight-bold)' : 'var(--weight-medium)',
            }}
          >
            <span style={{ position: 'relative' }}>
              <Icon name={it.icon} size={22} strokeWidth={active ? 2.25 : 2} />
              {it.badge != null && (
                <span style={{ position: 'absolute', top: '-4px', right: '-9px', minWidth: '16px', height: '16px', padding: '0 4px', borderRadius: 'var(--radius-pill)', background: 'var(--red-600)', color: 'var(--white)', fontSize: '10px', fontWeight: 'var(--weight-bold)', display: 'grid', placeItems: 'center' }}>{it.badge}</span>
              )}
            </span>
            {it.label}
          </button>
        );
      })}
    </nav>
  );
}
