"use client";

import { useMemo, useState } from "react";
import { Chip } from "@heroui/react";
import {
  UNIDAD_CORTA,
  montoFacturaCentavos,
  type EntregaItemPublico,
} from "@misupertostada/shared";
import { Money } from "@/components/domain/money";
import { ProductoThumb } from "@/components/catalog/producto-thumb";
import { QuantityStepper } from "@/components/ui/quantity-stepper";

export function EntregaForm({
  items,
  disabled,
  onChange,
}: {
  items: EntregaItemPublico[];
  disabled?: boolean;
  onChange?: (cantidades: Map<string, number>) => void;
}) {
  const clave = (it: EntregaItemPublico) => it.id ?? it.productoId;

  const [cant, setCant] = useState(() =>
    Object.fromEntries(
      items.map((i) => [clave(i), i.cantidadEntregada || i.cantidadPedida]),
    ),
  );

  const total = useMemo(
    () =>
      montoFacturaCentavos(
        items.map((i) => ({
          cantidadEntregada: cant[clave(i)] ?? i.cantidadPedida,
          precioUnitarioCentavos: i.precioUnitarioCentavos,
        })),
      ),
    [cant, items],
  );
  const ajustes = items.filter(
    (i) => (cant[clave(i)] ?? i.cantidadPedida) !== i.cantidadPedida,
  ).length;

  function set(itemId: string, value: number) {
    const next = { ...cant, [itemId]: value };
    setCant(next);
    onChange?.(new Map(Object.entries(next)));
  }

  return (
    <div>
      {items.map((it) => {
        const key = clave(it);
        const value = cant[key] ?? it.cantidadPedida;
        const ajustado = value !== it.cantidadPedida;
        const unidad = UNIDAD_CORTA[it.unidadMedida];
        const gratis = it.esDevolucion || it.precioUnitarioCentavos === 0;
        return (
          <div
            key={key}
            className="grid gap-3 border-b border-[var(--border-subtle)] px-4 py-4 min-h-fila"
          >
            <div className="flex items-start gap-3">
              <ProductoThumb
                nombre={it.nombreMostrado}
                fotoAssetId={it.fotoAssetId}
                size="sm"
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="min-w-0 flex-1 text-[15px] font-semibold text-pretty text-tinta-900">
                    {it.nombreMostrado}
                  </span>
                  {it.esDevolucion && (
                    <Chip color="success" size="sm" variant="soft">
                      Devolución
                    </Chip>
                  )}
                  {ajustado && (
                    <Chip color="warning" size="sm" variant="soft">
                      Ajustado
                    </Chip>
                  )}
                </div>
                <p className="mt-0.5 text-xs tabular-nums text-tinta-500">
                  Pedido {it.cantidadPedida} {unidad}
                </p>
                {it.notaProduccion ? (
                  <div className="mt-1.5">
                    <Chip color="success" size="sm" variant="soft">
                      {it.notaProduccion}
                    </Chip>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <QuantityStepper
                value={value}
                onChange={(v) => set(key, v)}
                min={0}
                unidad={unidad}
                disabled={disabled}
                size="lg"
              />
              <div className="min-w-0 text-right">
                <p className="mst-label text-[11px]">{unidad} entregadas</p>
                {gratis ? (
                  <span className="text-[15px] font-semibold tabular-nums text-tinta-500">
                    Gratis
                  </span>
                ) : (
                  <Money
                    centavos={montoFacturaCentavos([
                      {
                        cantidadEntregada: value,
                        precioUnitarioCentavos: it.precioUnitarioCentavos,
                      },
                    ])}
                    truncate
                    className="text-[15px]"
                  />
                )}
              </div>
            </div>
          </div>
        );
      })}
      <div className="flex flex-wrap items-baseline justify-between gap-3 bg-tinta-50 px-4 py-4">
        <span className="mst-label">
          {ajustes > 0
            ? `${ajustes} ajuste${ajustes > 1 ? "s" : ""}`
            : "Sin ajustes"}
        </span>
        <Money centavos={total} className="text-lg font-semibold" />
      </div>
    </div>
  );
}
