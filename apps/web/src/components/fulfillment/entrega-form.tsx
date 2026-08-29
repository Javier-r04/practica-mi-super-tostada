"use client";

import { useMemo, useState } from "react";
import { Chip, NumberField } from "@heroui/react";
import {
  UNIDAD_CORTA,
  montoFacturaCentavos,
  type EntregaItemPublico,
} from "@misupertostada/shared";
import { Money } from "@/components/domain/money";
import { ProductoThumb } from "@/components/catalog/producto-thumb";

/* Los steppers son de 52px por lado: se tocan con guante y sin mirar. El
   NumberField de HeroUI trae los botones y el teclado numérico; solo le
   subimos el tamaño. */
const BOTON = "size-13 shrink-0";
const CAJA = "h-13 w-20 text-center text-lg font-semibold tabular-nums";

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
    Object.fromEntries(
      items.map((i) => [i.productoId, i.cantidadEntregada || i.cantidadPedida]),
    ),
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

  function set(productoId: string, value: number | undefined) {
    if (value == null || Number.isNaN(value)) return;
    const next = { ...cant, [productoId]: Math.max(0, Math.trunc(value)) };
    setCant(next);
    onChange?.(new Map(Object.entries(next)));
  }

  return (
    <div>
      {items.map((it) => {
        const value = cant[it.productoId] ?? it.cantidadPedida;
        const ajustado = value !== it.cantidadPedida;
        const unidad = UNIDAD_CORTA[it.unidadMedida];
        return (
          <div
            key={it.productoId}
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

            <div className="flex items-center justify-between gap-3">
              <NumberField
                aria-label={`Cantidad entregada de ${it.nombreMostrado}`}
                isDisabled={disabled}
                minValue={0}
                step={1}
                value={value}
                onChange={(v) => set(it.productoId, v)}
              >
                <NumberField.Group className="h-13">
                  <NumberField.DecrementButton className={BOTON} />
                  <NumberField.Input className={CAJA} />
                  <NumberField.IncrementButton className={BOTON} />
                </NumberField.Group>
              </NumberField>
              <div className="text-right">
                <p className="mst-label text-[11px]">{unidad} entregadas</p>
                <Money
                  centavos={montoFacturaCentavos([
                    {
                      cantidadEntregada: value,
                      precioUnitarioCentavos: it.precioUnitarioCentavos,
                    },
                  ])}
                  className="text-[15px]"
                />
              </div>
            </div>
          </div>
        );
      })}
      <div className="flex items-baseline justify-between gap-3 bg-tinta-50 px-4 py-4">
        <span className="mst-label">
          {ajustes > 0
            ? `${ajustes} ajuste${ajustes > 1 ? "s" : ""}`
            : "Sin ajustes"}
        </span>
        <Money centavos={total} className="text-xl" />
      </div>
    </div>
  );
}
