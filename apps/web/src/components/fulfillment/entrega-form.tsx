"use client";

import { useMemo, useState } from "react";
import {
  UNIDAD_CORTA,
  montoFacturaCentavos,
  type EntregaItemPublico,
} from "@misupertostada/shared";
import { Money } from "@/components/domain/money";
import { QuantityStepper } from "@/components/ui/quantity-stepper";
import { Tag } from "@/components/ui/badge";

export function EntregaForm({
  items,
  disabled,
  onChange,
}: {
  items: EntregaItemPublico[];
  disabled?: boolean;
  onChange?: (cantidades: Map<string, number>) => void;
}) {
  const [cant, setCant] = useState(() =>
    Object.fromEntries(items.map((i) => [i.productoId, i.cantidadEntregada || i.cantidadPedida])),
  );

  const total = useMemo(
    () =>
      montoFacturaCentavos(
        items.map((i) => ({
          cantidadEntregada: cant[i.productoId] ?? i.cantidadPedida,
          precioUnitarioCentavos: i.precioUnitarioCentavos,
        })),
      ),
    [cant, items],
  );
  const ajustes = items.filter(
    (i) => (cant[i.productoId] ?? i.cantidadPedida) !== i.cantidadPedida,
  ).length;

  function set(productoId: string, value: number) {
    const next = { ...cant, [productoId]: value };
    setCant(next);
    onChange?.(new Map(Object.entries(next)));
  }

  return (
    <div>
      {items.map((it) => (
        <div
          key={it.productoId}
          className="grid gap-2 border-b border-[var(--border-subtle)] px-4 py-3"
        >
          <div className="flex items-center gap-2">
            <span className="min-w-0 flex-1 text-sm font-semibold">{it.nombreMostrado}</span>
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-tinta-500">
              pedido {it.cantidadPedida}
            </span>
          </div>
          {it.notaProduccion ? <Tag>{it.notaProduccion}</Tag> : null}
          <QuantityStepper
            size="lg"
            value={cant[it.productoId] ?? it.cantidadPedida}
            min={0}
            unidad={UNIDAD_CORTA[it.unidadMedida]}
            disabled={disabled}
            onChange={(v) => set(it.productoId, v)}
          />
        </div>
      ))}
      <div className="flex items-baseline justify-between bg-tinta-50 px-4 py-3">
        <span className="text-[12px] font-semibold uppercase tracking-[0.08em] text-tinta-500">
          {ajustes > 0 ? `${ajustes} ajuste${ajustes > 1 ? "s" : ""}` : "Sin ajustes"}
        </span>
        <Money centavos={total} className="text-lg" />
      </div>
    </div>
  );
}
