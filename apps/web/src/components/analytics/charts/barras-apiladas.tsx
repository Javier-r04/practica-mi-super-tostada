"use client";

import { formatearCentavos } from "@misupertostada/shared";
import { EmptyState } from "@/components/ui/empty-state";
import {
  etiquetasEjeX,
  formatearFechaCorta,
  serieTodoCero,
  ticksEjeCentavos,
} from "@/lib/tablero-vista";
import { cn } from "@/lib/utils";

type Dia = {
  fecha: string;
  efectivoCentavos: number;
  transferenciaCentavos: number;
};

export function ChartBarrasApiladas({ serie }: { serie: Dia[] }) {
  const totales = serie.map(
    (d) => d.efectivoCentavos + d.transferenciaCentavos,
  );
  const max = Math.max(1, ...totales);

  if (serieTodoCero(totales)) {
    return (
      <EmptyState
        title="Nada cobrado en este rango"
        description="El cobro se cuenta por la fecha del pago, no por la fecha de operación."
      />
    );
  }

  const ticks = ticksEjeCentavos(max, 4);
  const labels = etiquetasEjeX(
    serie.map((d) => d.fecha),
    serie.length > 10 ? 6 : 8,
  );
  const densa = serie.length > 10;

  return (
    <div className="grid gap-3">
      <ul className="flex flex-wrap gap-3 text-sm" aria-label="Leyenda cobrado">
        <li className="inline-flex items-center gap-2">
          <span
            className="size-2.5 rounded-sm bg-marca"
            aria-hidden
          />
          <span className="font-semibold text-tinta-800">Efectivo</span>
        </li>
        <li className="inline-flex items-center gap-2">
          <span
            className="size-2.5 rounded-sm bg-[var(--blue-700)]"
            aria-hidden
          />
          <span className="font-semibold text-tinta-800">Transferencia</span>
        </li>
      </ul>

      {/* Móvil denso: lista día a día */}
      <ul className={cn("grid gap-2", densa ? "sm:hidden" : "hidden")}>
        {serie.map((d) => {
          const total = d.efectivoCentavos + d.transferenciaCentavos;
          if (total === 0) return null;
          return (
            <li
              key={d.fecha}
              className="flex min-h-11 items-center justify-between gap-3 rounded-campo border border-[var(--border-subtle)] bg-blanco px-3"
            >
              <span className="text-sm font-semibold tabular-nums text-tinta-800">
                {formatearFechaCorta(d.fecha)}
              </span>
              <span className="text-right text-xs text-tinta-500">
                <span className="block font-mono tabular-nums text-tinta-900">
                  {formatearCentavos(total)}
                </span>
                Ef {formatearCentavos(d.efectivoCentavos)} · Tr{" "}
                {formatearCentavos(d.transferenciaCentavos)}
              </span>
            </li>
          );
        })}
      </ul>

      <div
        className={cn(
          "grid grid-cols-[auto_1fr] gap-2",
          densa && "hidden sm:grid",
        )}
        role="img"
        aria-label="Cobrado por día, efectivo y transferencia"
      >
        <div className="flex flex-col justify-between py-1 text-right">
          {[...ticks].reverse().map((t) => (
            <span
              key={t}
              className="font-mono text-xs tabular-nums text-tinta-500"
            >
              {formatearCentavos(t)}
            </span>
          ))}
        </div>
        <div className="min-w-0">
          <div className="flex h-[200px] items-end gap-1 overflow-x-auto pb-1">
            {serie.map((d) => {
              const total = d.efectivoCentavos + d.transferenciaCentavos;
              const alturaPct = Math.max(0, Math.round((total / max) * 100));
              return (
                <div
                  key={d.fecha}
                  className="flex min-w-3 flex-1 flex-col items-center justify-end"
                  style={{ minWidth: 12 }}
                  title={`${formatearFechaCorta(d.fecha)}: ${formatearCentavos(total)}`}
                >
                  <div
                    className="flex w-full flex-col justify-end overflow-hidden rounded-t-sm"
                    style={{ height: `${alturaPct}%`, minHeight: total > 0 ? 4 : 0 }}
                  >
                    {d.transferenciaCentavos > 0 && (
                      <div
                        className="w-full bg-[var(--blue-700)]"
                        style={{
                          flexGrow: d.transferenciaCentavos,
                          flexBasis: 0,
                          minHeight: 2,
                        }}
                      />
                    )}
                    {d.efectivoCentavos > 0 && (
                      <div
                        className="w-full bg-marca"
                        style={{
                          flexGrow: d.efectivoCentavos,
                          flexBasis: 0,
                          minHeight: 2,
                        }}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-1 flex gap-1 overflow-x-auto">
            {serie.map((d, i) => (
              <div
                key={d.fecha}
                className="min-w-3 flex-1 text-center"
                style={{ minWidth: 12 }}
              >
                {labels[i] ? (
                  <span className="text-[12px] tabular-nums text-tinta-500">
                    {formatearFechaCorta(d.fecha)}
                  </span>
                ) : (
                  <span className="sr-only">{formatearFechaCorta(d.fecha)}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
