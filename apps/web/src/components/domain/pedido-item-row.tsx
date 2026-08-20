"use client";

import {
  UNIDAD_CORTA,
  type PuntoCarga,
  type UnidadMedida,
} from "@misupertostada/shared";
import { Money } from "@/components/domain/money";
import { EstadoBadge } from "@/components/domain/estado-badge";
import { Tag } from "@/components/ui/badge";
import { QuantityStepper } from "@/components/ui/quantity-stepper";

export function PedidoItemRow({
  nombreMostrado,
  alias,
  unidadMedida,
  cantidad,
  precioUnitarioCentavos,
  puntoCarga,
  notaProduccion,
  editable = false,
  onChangeCantidad,
}: {
  nombreMostrado: string;
  alias?: string | null;
  unidadMedida: UnidadMedida;
  cantidad: number;
  precioUnitarioCentavos: number;
  puntoCarga?: PuntoCarga;
  notaProduccion?: string | null;
  editable?: boolean;
  onChangeCantidad?: (cantidad: number) => void;
}) {
  const unidad = UNIDAD_CORTA[unidadMedida];
  const subtotal = cantidad * precioUnitarioCentavos;
  return (
    <div className="flex min-h-fila items-center gap-3 border-b border-[var(--border-subtle)] px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-tinta-900">
          {nombreMostrado}
        </p>
        <p className="text-[12px] tabular-nums text-tinta-500">
          {alias && alias !== nombreMostrado ? `«${alias}» · ` : null}
          {editable ? null : (
            <>
              {cantidad} {unidad} ×{" "}
              <Money centavos={precioUnitarioCentavos} tone="muted" />
            </>
          )}
          {editable ? (
            <>
              <Money centavos={precioUnitarioCentavos} tone="muted" /> / {unidad}
            </>
          ) : null}
        </p>
        {(puntoCarga || notaProduccion) && (
          <div className="mt-1 flex flex-wrap gap-1.5">
            {puntoCarga ? <EstadoBadge estado={puntoCarga} size="sm" /> : null}
            {notaProduccion ? <Tag>{notaProduccion}</Tag> : null}
          </div>
        )}
      </div>
      {editable && onChangeCantidad ? (
        <QuantityStepper
          value={cantidad}
          onChange={onChangeCantidad}
          min={1}
          unidad={unidad}
        />
      ) : null}
      <Money centavos={subtotal} />
    </div>
  );
}
