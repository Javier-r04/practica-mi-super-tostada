import React from 'react';

const MST_ESTADOS = {
  BORRADOR: { label: 'Borrador', bg: 'var(--estado-borrador-bg)', fg: 'var(--estado-borrador-fg)' },
  CONFIRMADO: { label: 'Confirmado', bg: 'var(--estado-confirmado-bg)', fg: 'var(--estado-confirmado-fg)' },
  EN_PRODUCCION: { label: 'En producción', bg: 'var(--estado-produccion-bg)', fg: 'var(--estado-produccion-fg)' },
  ENTREGADO: { label: 'Entregado', bg: 'var(--estado-entregado-bg)', fg: 'var(--estado-entregado-fg)' },
  ANULADO: { label: 'Anulado', bg: 'var(--estado-anulado-bg)', fg: 'var(--estado-anulado-fg)' },
  PAGADO: { label: 'Pagado', bg: 'var(--estado-pagado-bg)', fg: 'var(--estado-pagado-fg)' },
  PENDIENTE: { label: 'Pendiente', bg: 'var(--estado-pendiente-bg)', fg: 'var(--estado-pendiente-fg)' },
  ABONO_PARCIAL: { label: 'Abono parcial', bg: 'var(--estado-pendiente-bg)', fg: 'var(--estado-pendiente-fg)' },
  VENCIDO: { label: 'Vencido', bg: 'var(--estado-vencido-bg)', fg: 'var(--estado-vencido-fg)' },
  SIN_SINCRONIZAR: { label: 'Sin sincronizar', bg: 'var(--estado-sin-sincronizar-bg)', fg: 'var(--estado-sin-sincronizar-fg)' },
  PLANTA: { label: 'Planta', bg: 'var(--carga-planta-bg)', fg: 'var(--carga-planta-fg)' },
  DEMOCRACIA: { label: 'Democracia', bg: 'var(--carga-democracia-bg)', fg: 'var(--carga-democracia-fg)' },
};

export function EstadoBadge({ estado, size = 'md', style }) {
  const e = MST_ESTADOS[estado] || { label: String(estado || '—'), bg: 'var(--ink-100)', fg: 'var(--ink-600)' };
  const sizes = { sm: { height: '18px', padding: '0 6px', fontSize: 'var(--text-3xs)' }, md: { height: '22px', padding: '0 9px', fontSize: 'var(--text-2xs)' } };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '5px', borderRadius: 'var(--radius-pill)',
      fontWeight: 'var(--weight-bold)', letterSpacing: 'var(--tracking-caps)', textTransform: 'uppercase',
      background: e.bg, color: e.fg, ...sizes[size] || sizes.md, ...style,
    }}>
      {estado === 'SIN_SINCRONIZAR' && <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'currentColor' }} />}
      {e.label}
    </span>
  );
}
