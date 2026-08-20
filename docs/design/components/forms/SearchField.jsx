import React from 'react';
import { Icon } from '../core/Icon.jsx';

export function SearchField({ value, onChange, placeholder = 'Buscar…', size = 'md', style, ...rest }) {
  const [focus, setFocus] = React.useState(false);
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
      height: size === 'sm' ? 'var(--field-height-sm)' : 'var(--field-height)', padding: '0 var(--space-3)',
      background: 'var(--white)', border: `var(--border-width) solid ${focus ? 'var(--border-focus)' : 'var(--border-default)'}`,
      borderRadius: 'var(--radius-pill)', boxShadow: focus ? 'var(--shadow-focus)' : 'var(--shadow-inset-field)',
      transition: 'var(--transition-control)', ...style,
    }}>
      <Icon name="search" size={16} color="var(--text-subtle)" />
      <input
        value={value} placeholder={placeholder} onChange={(e) => onChange && onChange(e.target.value)}
        onFocus={() => setFocus(true)} onBlur={() => setFocus(false)} {...rest}
        style={{ flex: 1, minWidth: 0, border: 0, outline: 'none', background: 'transparent', fontSize: 'var(--text-sm)' }}
      />
      {value ? (
        <button type="button" onClick={() => onChange && onChange('')} aria-label="Limpiar" style={{ border: 0, background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '16px', lineHeight: 1 }}>×</button>
      ) : null}
    </div>
  );
}
