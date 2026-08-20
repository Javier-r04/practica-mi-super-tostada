import React from 'react';

export function QuantityStepper({ value = 0, onChange, step = 1, min = 0, max = 9999, unidad, size = 'md', style }) {
  const h = size === 'lg' ? 52 : 44;
  const set = (v) => onChange && onChange(Math.min(max, Math.max(min, Number(v.toFixed ? v.toFixed(2) : v))));
  const btn = (glyph, onClick, disabled) => (
    <button
      type="button" onClick={onClick} disabled={disabled} aria-label={glyph === '−' ? 'Restar' : 'Sumar'}
      style={{
        width: h, height: h, flex: '0 0 auto', border: 0, background: 'transparent', cursor: disabled ? 'not-allowed' : 'pointer',
        fontSize: '20px', fontWeight: 'var(--weight-bold)', color: disabled ? 'var(--ink-300)' : 'var(--green-800)',
      }}
    >{glyph}</button>
  );
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', height: h, background: 'var(--white)',
      border: 'var(--border-width) solid var(--border-default)', borderRadius: 'var(--radius-field)',
      boxShadow: 'var(--shadow-inset-field)', overflow: 'hidden', ...style,
    }}>
      {btn('−', () => set(value - step), value <= min)}
      <span style={{ display: 'flex', alignItems: 'baseline', gap: '4px', justifyContent: 'center', minWidth: '68px', borderLeft: 'var(--border-width) solid var(--border-subtle)', borderRight: 'var(--border-width) solid var(--border-subtle)', height: '100%', paddingTop: h === 52 ? 14 : 11 }}>
        <span style={{ fontFamily: 'var(--font-core)', fontSize: size === 'lg' ? 'var(--text-lg)' : 'var(--text-base)', fontWeight: 'var(--weight-bold)', fontVariantNumeric: 'tabular-nums', color: 'var(--text-strong)' }}>{value}</span>
        {unidad && <span style={{ fontSize: 'var(--text-2xs)', fontWeight: 'var(--weight-semibold)', color: 'var(--text-muted)', textTransform: 'lowercase' }}>{unidad}</span>}
      </span>
      {btn('+', () => set(value + step), value >= max)}
    </div>
  );
}
