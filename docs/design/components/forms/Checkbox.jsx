import React from 'react';

export function Checkbox({ label, description, checked, onChange, disabled, style, ...rest }) {
  return (
    <label style={{
      display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)', minHeight: 'var(--tap-min)',
      cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1, ...style,
    }}>
      <span style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto',
        width: '20px', height: '20px', marginTop: '2px', borderRadius: 'var(--radius-xs)',
        background: checked ? 'var(--green-800)' : 'var(--white)',
        border: `var(--border-width-strong) solid ${checked ? 'var(--green-800)' : 'var(--border-default)'}`,
        transition: 'var(--transition-control)',
      }}>
        {checked && (
          <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M1.5 6.4l3 3 6-6.4" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        )}
      </span>
      <input type="checkbox" checked={!!checked} disabled={disabled} onChange={(e) => onChange && onChange(e.target.checked, e)} style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }} {...rest} />
      <span>
        <span style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-medium)', color: 'var(--text-body)' }}>{label}</span>
        {description && <span style={{ display: 'block', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{description}</span>}
      </span>
    </label>
  );
}
