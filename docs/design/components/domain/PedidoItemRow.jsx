import React from 'react';
import { Money } from './Money.jsx';
import { EstadoBadge } from './EstadoBadge.jsx';
import { QuantityStepper } from '../forms/QuantityStepper.jsx';

export function PedidoItemRow({
  nombreMostrado, alias, unidadMedida = 'LIBRA', cantidad = 0, cantidadEntregada,
  precioUnitarioCentavos = 0, puntoCarga, notaProduccion, editable = false, onChangeCantidad, style,
}) {
  const unidadCorta = { LIBRA: 'lb', BOLSA: 'bolsas', UNIDAD: 'un' }[unidadMedida] || '';
  const usada = cantidadEntregada != null ? cantidadEntregada : cantidad;
  const total = Math.round(usada * precioUnitarioCentavos);
  const ajustado = cantidadEntregada != null && cantidadEntregada !== cantidad;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 'var(--space-3)', minHeight: 'var(--row-height)',
      padding: 'var(--space-3) var(--space-4)', borderBottom: 'var(--border-width) solid var(--border-subtle)',
      background: 'var(--surface-card)', ...style,
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <span style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-semibold)', color: 'var(--text-strong)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nombreMostrado}</span>
          {puntoCarga && <EstadoBadge estado={puntoCarga} size="sm" />}
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-2)', fontSize: 'var(--text-2xs)', color: 'var(--text-muted)' }}>
          {alias && <span>«{alias}»</span>}
          <span style={{ fontVariantNumeric: 'tabular-nums' }}>{cantidad} {unidadCorta} × <Money centavos={precioUnitarioCentavos} size="sm" tone="muted" /></span>
          {notaProduccion && <span style={{ color: 'var(--amber-700)', fontWeight: 'var(--weight-semibold)' }}>{notaProduccion}</span>}
        </div>
      </div>
      {editable ? (
        <QuantityStepper value={cantidad} onChange={onChangeCantidad} step={unidadMedida === 'LIBRA' ? 0.5 : 1} unidad={unidadCorta} />
      ) : (
        <div style={{ textAlign: 'right' }}>
          <Money centavos={total} size="md" />
          {ajustado && (
            <div style={{ fontSize: 'var(--text-3xs)', color: 'var(--amber-700)', fontWeight: 'var(--weight-bold)', letterSpacing: 'var(--tracking-caps)', textTransform: 'uppercase' }}>
              entregado {cantidadEntregada} {unidadCorta}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
