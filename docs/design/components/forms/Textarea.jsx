import React from 'react';
import { Field } from './Input.jsx';

export function Textarea({ label, hint, error, required, rows = 3, style, ...rest }) {
  const [focus, setFocus] = React.useState(false);
  return (
    <Field label={label} hint={hint} error={error} required={required} htmlFor={rest.id}>
      <textarea
        rows={rows} {...rest}
        onFocus={(e) => { setFocus(true); rest.onFocus && rest.onFocus(e); }}
        onBlur={(e) => { setFocus(false); rest.onBlur && rest.onBlur(e); }}
        style={{
          width: '100%', padding: 'var(--space-3)', background: 'var(--white)', resize: 'vertical',
          border: `var(--border-width) solid ${error ? 'var(--red-600)' : focus ? 'var(--border-focus)' : 'var(--border-default)'}`,
          borderRadius: 'var(--radius-field)', outline: 'none', fontSize: 'var(--text-sm)',
          lineHeight: 'var(--leading-relaxed)', color: 'var(--text-body)',
          boxShadow: focus ? 'var(--shadow-focus)' : 'var(--shadow-inset-field)', transition: 'var(--transition-control)', ...style,
        }}
      />
    </Field>
  );
}
