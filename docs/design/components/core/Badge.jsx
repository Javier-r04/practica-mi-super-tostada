import React from 'react';

const mstBadgeTones = {
  neutral: { background: 'var(--ink-100)', color: 'var(--ink-600)' },
  green: { background: 'var(--green-100)', color: 'var(--green-700)' },
  yellow: { background: 'var(--yellow-100)', color: 'var(--gold-600)' },
  amber: { background: 'var(--amber-100)', color: 'var(--amber-700)' },
  red: { background: 'var(--red-100)', color: 'var(--red-700)' },
  blue: { background: 'var(--blue-100)', color: 'var(--blue-700)' },
  solid: { background: 'var(--green-800)', color: 'var(--white)' },
};

export function Badge({ tone = 'neutral', size = 'md', dot = false, children, style, ...rest }) {
  const sizes = {
    sm: { height: '18px', padding: '0 6px', fontSize: 'var(--text-3xs)' },
    md: { height: '22px', padding: '0 8px', fontSize: 'var(--text-2xs)' },
  };
  return (
    <span
      style={{
        display: 'inline-flex', alignItems: 'center', gap: '5px', borderRadius: 'var(--radius-pill)',
        fontWeight: 'var(--weight-bold)', letterSpacing: 'var(--tracking-caps)', textTransform: 'uppercase',
        ...sizes[size] || sizes.md, ...mstBadgeTones[tone] || mstBadgeTones.neutral, ...style,
      }}
      {...rest}
    >
      {dot && <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'currentColor' }} />}
      {children}
    </span>
  );
}
