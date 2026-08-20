import React from 'react';
import { Money } from './Money.jsx';

export function ContadorFacturas({ pendientes = 0, limite, montoCentavos, etiqueta = 'Facturas pendientes', size = 'md', style }) {
  const excedido = limite != null && pendientes >= limite;
  const cerca = limite != null && !excedido && pendientes >= limite - 1;
  const color = excedido ? 'var(--red-600)' : cerca ? 'var(--amber-600)' : 'var(--green-800)';
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-3) var(--space-4)',
      background: 'var(--surface-card)', border: `var(--border-width) solid ${excedido ? 'var(--red-600)' : 'var(--border-subtle)'}`,
      borderRadius: 'var(--radius-card)', ...style,
    }}>
      <span style={{ fontFamily: 'var(--font-display)', fontSize: size === 'lg' ? 'var(--text-4xl)' : 'var(--text-3xl)', lineHeight: 1, color }}>
        {pendientes}{limite != null && <span style={{ fontSize: '0.5em', color: 'var(--text-subtle)' }}>/{limite}</span>}
      </span>
      <div style={{ display: 'grid', gap: '2px' }}>
        <span style={{ fontSize: 'var(--text-2xs)', fontWeight: 'var(--weight-bold)', letterSpacing: 'var(--tracking-caps)', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{etiqueta}</span>
        {montoCentavos != null && <Money centavos={montoCentavos} size="lg" tone={excedido ? 'vencido' : 'default'} />}
        {excedido && <span style={{ fontSize: 'var(--text-2xs)', fontWeight: 'var(--weight-bold)', color: 'var(--text-danger)' }}>Límite de crédito excedido</span>}
      </div>
    </div>
  );
}
