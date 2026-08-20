import React from 'react';
import { Field } from './Input.jsx';

export function Select({ label, hint, error, required, options = [], size = 'md', style, ...rest }) {
  return (
    <Field label={label} hint={hint} error={error} required={required} htmlFor={rest.id}>
      <select
        {...rest}
        style={{
          height: size === 'sm' ? 'var(--field-height-sm)' : 'var(--field-height)', width: '100%',
          padding: '0 var(--space-3)', background: 'var(--white)',
          border: `var(--border-width) solid ${error ? 'var(--red-600)' : 'var(--border-default)'}`,
          borderRadius: 'var(--radius-field)', fontSize: 'var(--text-sm)', color: 'var(--text-body)',
          boxShadow: 'var(--shadow-inset-field)', cursor: 'pointer', ...style,
        }}
      >
        {options.map((o) => {
          const value = typeof o === 'string' ? o : o.value;
          const labelText = typeof o === 'string' ? o : o.label;
          return <option key={value} value={value}>{labelText}</option>;
        })}
      </select>
    </Field>
  );
}
