import React from 'react';

const mstCardTones = {
  default: { background: 'var(--surface-card)', border: 'var(--border-width) solid var(--border-subtle)', color: 'var(--text-body)' },
  paper: { background: 'var(--surface-paper)', border: 'var(--border-width) solid var(--cream-500)', color: 'var(--text-body)' },
  brand: { background: 'var(--surface-brand)', border: 'var(--border-width) solid var(--green-900)', color: 'var(--text-on-brand)' },
  accent: { background: 'var(--yellow-100)', border: 'var(--border-width) solid var(--yellow-300)', color: 'var(--green-900)' },
};

export function Card({ title, subtitle, actions, tone = 'default', padding = 'md', flush = false, children, style, ...rest }) {
  const pad = { none: '0', sm: 'var(--space-3)', md: 'var(--space-4)', lg: 'var(--space-6)' }[padding];
  const onBrand = tone === 'brand';
  return (
    <section
      style={{
        borderRadius: 'var(--radius-card)', boxShadow: tone === 'brand' ? 'var(--shadow-md)' : 'var(--shadow-sm)',
        overflow: 'hidden', ...mstCardTones[tone] || mstCardTones.default, ...style,
      }}
      {...rest}
    >
      {(title || actions) && (
        <header style={{
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 'var(--space-3)',
          padding: `${pad} ${pad} 0`,
        }}>
          <div>
            {title && <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 'var(--weight-bold)', color: onBrand ? 'var(--white)' : 'var(--text-strong)' }}>{title}</h3>}
            {subtitle && <p style={{ marginTop: '2px', fontSize: 'var(--text-xs)', color: onBrand ? 'var(--green-200)' : 'var(--text-muted)' }}>{subtitle}</p>}
          </div>
          {actions}
        </header>
      )}
      <div style={{ padding: flush ? 0 : pad, paddingTop: (title || actions) && !flush ? 'var(--space-3)' : undefined }}>{children}</div>
    </section>
  );
}
