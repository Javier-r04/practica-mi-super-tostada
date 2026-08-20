import React from 'react';

export function Tag({ children, onRemove, tone = 'default', icon, style, ...rest }) {
  const tones = {
    default: { background: 'var(--white)', border: 'var(--border-width) solid var(--border-default)', color: 'var(--ink-700)' },
    brand: { background: 'var(--green-50)', border: 'var(--border-width) solid var(--green-200)', color: 'var(--green-800)' },
    accent: { background: 'var(--yellow-100)', border: 'var(--border-width) solid var(--yellow-300)', color: 'var(--gold-600)' },
  };
  return (
    <span
      style={{
        display: 'inline-flex', alignItems: 'center', gap: '6px', height: '28px', padding: '0 var(--space-2)',
        borderRadius: 'var(--radius-pill)', fontSize: 'var(--text-xs)', fontWeight: 'var(--weight-semibold)',
        ...tones[tone] || tones.default, ...style,
      }}
      {...rest}
    >
      {icon}
      {children}
      {onRemove && (
        <button
          onClick={onRemove} aria-label="Quitar"
          style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '16px', height: '16px', border: 0, borderRadius: '50%', background: 'transparent', color: 'inherit', cursor: 'pointer', opacity: 0.6, fontSize: '14px', lineHeight: 1 }}
        >×</button>
      )}
    </span>
  );
}
