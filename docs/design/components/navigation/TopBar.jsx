import React from 'react';
import { Icon } from '../core/Icon.jsx';

export function TopBar({ title, subtitle, left, right, tone = 'brand', style }) {
  const marca = tone === 'brand';
  return (
    <header style={{
      display: 'flex', alignItems: 'center', gap: 'var(--space-3)', minHeight: 'var(--topbar-height)',
      padding: '0 var(--gutter-mobile)',
      background: marca ? 'var(--surface-brand)' : 'var(--surface-card)',
      color: marca ? 'var(--white)' : 'var(--text-strong)',
      borderBottom: marca ? 'none' : 'var(--border-width) solid var(--border-subtle)', ...style,
    }}>
      {left}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 'var(--text-md)', fontWeight: 'var(--weight-bold)', lineHeight: 1.1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</div>
        {subtitle && <div style={{ fontSize: 'var(--text-2xs)', color: marca ? 'var(--green-200)' : 'var(--text-muted)', fontWeight: 'var(--weight-medium)' }}>{subtitle}</div>}
      </div>
      {right && <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>{right}</div>}
    </header>
  );
}

export function BackButton({ onClick, label = 'Atrás', tone = 'brand' }) {
  return (
    <button onClick={onClick} aria-label={label} style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px',
      marginLeft: '-8px', border: 0, borderRadius: 'var(--radius-sm)', background: 'transparent',
      color: tone === 'brand' ? 'var(--white)' : 'var(--ink-700)', cursor: 'pointer',
    }}>
      <Icon name="arrow-left" size={20} />
    </button>
  );
}
