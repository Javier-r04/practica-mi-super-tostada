import React from 'react';

export function Field({ label, hint, error, required, children, htmlFor, style }) {
  return (
    <div style={{ display: 'grid', gap: '6px', ...style }}>
      {label && (
        <label htmlFor={htmlFor} style={{ fontSize: 'var(--text-2xs)', fontWeight: 'var(--weight-bold)', letterSpacing: 'var(--tracking-caps)', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
          {label}{required && <span style={{ color: 'var(--red-600)' }}> *</span>}
        </label>
      )}
      {children}
      {(error || hint) && (
        <span style={{ fontSize: 'var(--text-xs)', color: error ? 'var(--text-danger)' : 'var(--text-muted)' }}>{error || hint}</span>
      )}
    </div>
  );
}

export function Input({ label, hint, error, required, prefix, suffix, size = 'md', style, ...rest }) {
  const [focus, setFocus] = React.useState(false);
  return (
    <Field label={label} hint={hint} error={error} required={required} htmlFor={rest.id}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
        height: size === 'sm' ? 'var(--field-height-sm)' : 'var(--field-height)',
        padding: '0 var(--space-3)', background: 'var(--white)',
        border: `var(--border-width) solid ${error ? 'var(--red-600)' : focus ? 'var(--border-focus)' : 'var(--border-default)'}`,
        borderRadius: 'var(--radius-field)',
        boxShadow: focus ? (error ? 'var(--shadow-focus-danger)' : 'var(--shadow-focus)') : 'var(--shadow-inset-field)',
        transition: 'var(--transition-control)', ...style,
      }}>
        {prefix && <span style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-semibold)' }}>{prefix}</span>}
        <input
          {...rest}
          onFocus={(e) => { setFocus(true); rest.onFocus && rest.onFocus(e); }}
          onBlur={(e) => { setFocus(false); rest.onBlur && rest.onBlur(e); }}
          style={{
            flex: 1, minWidth: 0, border: 0, outline: 'none', background: 'transparent',
            fontSize: 'var(--text-sm)', color: 'var(--text-body)',
            fontVariantNumeric: rest.inputMode === 'decimal' || rest.type === 'number' ? 'tabular-nums' : undefined,
          }}
        />
        {suffix && <span style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>{suffix}</span>}
      </div>
    </Field>
  );
}
