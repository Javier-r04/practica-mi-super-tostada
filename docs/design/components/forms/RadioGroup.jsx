import React from 'react';

export function RadioGroup({ name, options = [], value, onChange, layout = 'row', style }) {
  return (
    <div role="radiogroup" style={{ display: 'flex', flexDirection: layout === 'row' ? 'row' : 'column', gap: 'var(--space-2)', ...style }}>
      {options.map((o) => {
        const val = typeof o === 'string' ? o : o.value;
        const label = typeof o === 'string' ? o : o.label;
        const icon = typeof o === 'string' ? null : o.icon;
        const active = val === value;
        return (
          <label key={val} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-2)',
            flex: layout === 'row' ? 1 : undefined, minHeight: 'var(--tap-min)', padding: '0 var(--space-3)',
            borderRadius: 'var(--radius-field)', cursor: 'pointer',
            background: active ? 'var(--green-50)' : 'var(--white)',
            border: `var(--border-width-strong) solid ${active ? 'var(--green-700)' : 'var(--border-subtle)'}`,
            color: active ? 'var(--green-800)' : 'var(--ink-700)',
            fontSize: 'var(--text-sm)', fontWeight: active ? 'var(--weight-bold)' : 'var(--weight-medium)',
            transition: 'var(--transition-control)',
          }}>
            <input type="radio" name={name} value={val} checked={active} onChange={() => onChange && onChange(val)} style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }} />
            {icon}{label}
          </label>
        );
      })}
    </div>
  );
}
