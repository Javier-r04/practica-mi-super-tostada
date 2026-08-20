import React from 'react';

export function formatearCentavos(centavos, { simbolo = true } = {}) {
  const n = Math.abs(Math.round(Number(centavos) || 0));
  const entero = Math.floor(n / 100).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const dec = String(n % 100).padStart(2, '0');
  const signo = Number(centavos) < 0 ? '−' : '';
  return `${signo}${simbolo ? 'Q ' : ''}${entero}.${dec}`;
}

const mstMoneySizes = {
  sm: { fontSize: 'var(--text-xs)', fontWeight: 'var(--weight-semibold)' },
  md: { fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-semibold)' },
  lg: { fontSize: 'var(--text-lg)', fontWeight: 'var(--weight-bold)' },
  xl: { fontFamily: 'var(--font-display)', fontSize: 'var(--text-3xl)', letterSpacing: 'var(--tracking-display)' },
};

const mstMoneyTones = {
  default: 'var(--text-money)', muted: 'var(--text-muted)', pagado: 'var(--green-700)',
  pendiente: 'var(--amber-700)', vencido: 'var(--red-600)', accent: 'var(--yellow-400)', inverse: 'var(--white)',
};

export function Money({ centavos, size = 'md', tone = 'default', simbolo = true, style, ...rest }) {
  return (
    <span
      style={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', color: mstMoneyTones[tone] || mstMoneyTones.default, ...mstMoneySizes[size] || mstMoneySizes.md, ...style }}
      {...rest}
    >{formatearCentavos(centavos, { simbolo })}</span>
  );
}
