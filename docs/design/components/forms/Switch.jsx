import React from 'react';

export function Switch({ checked, onChange, label, description, disabled, style }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-4)', minHeight: 'var(--tap-min)', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1, ...style }}>
      <span>
        {label && <span style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-medium)' }}>{label}</span>}
        {description && <span style={{ display: 'block', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{description}</span>}
      </span>
      <span style={{
        position: 'relative', flex: '0 0 auto', width: '44px', height: '26px', borderRadius: 'var(--radius-pill)',
        background: checked ? 'var(--green-700)' : 'var(--ink-300)', transition: 'background-color var(--dur-fast) var(--ease-out)',
      }}>
        <span style={{
          position: 'absolute', top: '3px', left: checked ? '21px' : '3px', width: '20px', height: '20px',
          borderRadius: '50%', background: 'var(--white)', boxShadow: 'var(--shadow-sm)',
          transition: 'left var(--dur-fast) var(--ease-out)',
        }} />
      </span>
      <input type="checkbox" checked={!!checked} disabled={disabled} onChange={(e) => onChange && onChange(e.target.checked)} style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }} />
    </label>
  );
}
