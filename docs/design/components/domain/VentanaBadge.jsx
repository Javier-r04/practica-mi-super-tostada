import React from 'react';
import { Icon } from '../core/Icon.jsx';

function mstFormatearRestante(ms) {
  if (ms <= 0) return '0:00';
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = String(Math.floor((total % 3600) / 60)).padStart(2, '0');
  return `${h}:${m}`;
}

export function VentanaBadge({ abierta = true, expiraEn, etiqueta, tipo = 'pedido', size = 'md', style }) {
  const restante = typeof expiraEn === 'number' ? mstFormatearRestante(expiraEn) : expiraEn;
  const tono = abierta
    ? { bg: 'var(--green-100)', fg: 'var(--green-700)', icon: 'clock' }
    : { bg: 'var(--ink-100)', fg: 'var(--ink-600)', icon: 'lock' };
  const texto = etiqueta || (abierta
    ? `${tipo === 'whatsapp' ? 'Ventana WA' : 'Ventana'} abierta · ${restante || '—'}`
    : `${tipo === 'whatsapp' ? 'Ventana WA' : 'Ventana'} cerrada`);
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '6px',
      height: size === 'sm' ? '22px' : '28px', padding: '0 var(--space-3)',
      borderRadius: 'var(--radius-pill)', background: tono.bg, color: tono.fg,
      fontSize: size === 'sm' ? 'var(--text-2xs)' : 'var(--text-xs)',
      fontWeight: 'var(--weight-bold)', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', ...style,
    }}>
      <Icon name={tono.icon} size={size === 'sm' ? 12 : 14} />
      {texto}
    </span>
  );
}
