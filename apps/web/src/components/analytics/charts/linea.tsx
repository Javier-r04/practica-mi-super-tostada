"use client";

import { useId, useState } from "react";
import { formatearCentavos, formatearFechaLarga } from "@misupertostada/shared";
import { EmptyState } from "@/components/ui/empty-state";
import {
  formatearFechaCorta,
  serieTodoCero,
  ticksEjeCentavos,
} from "@/lib/tablero-vista";

type Punto = { fecha: string; montoCentavos: number };

export function ChartLinea({
  serie,
  anteriorPromedioCentavos,
}: {
  serie: Punto[];
  anteriorPromedioCentavos?: number;
}) {
  const tipId = useId();
  const [hover, setHover] = useState<number | null>(null);
  const w = 560;
  const h = 240;
  const pad = { l: 88, r: 12, t: 16, b: 36 };
  const innerW = w - pad.l - pad.r;
  const innerH = h - pad.t - pad.b;
  const max = Math.max(
    1,
    ...serie.map((p) => p.montoCentavos),
    anteriorPromedioCentavos ?? 0,
  );

  if (serieTodoCero(serie.map((p) => p.montoCentavos))) {
    return (
      <EmptyState
        title="Sin ventas en este rango"
        description="Al entregar pedidos aparecen aquí, con el snapshot de esa noche."
      />
    );
  }

  const x = (i: number) =>
    pad.l + (serie.length <= 1 ? innerW / 2 : (i / (serie.length - 1)) * innerW);
  const y = (v: number) => pad.t + innerH - (v / max) * innerH;
  const puntos = serie.map((p, i) => `${x(i)},${y(p.montoCentavos)}`).join(" ");
  const area = `${x(0)},${y(0)} ${puntos} ${x(serie.length - 1)},${y(0)}`;
  const ticks = ticksEjeCentavos(max, 4);
  const tip = hover != null ? serie[hover] : null;

  return (
    <div className="grid gap-2">
      <div className="relative min-h-[220px]">
        <svg
          viewBox={`0 0 ${w} ${h}`}
          className="h-auto w-full"
          role="img"
          aria-label={`Ventas por día. Rango: ${serie[0]?.fecha ?? "sin datos"} a ${serie.at(-1)?.fecha ?? "sin datos"}`}
          onMouseLeave={() => setHover(null)}
        >
          {ticks.map((t) => (
            <g key={t}>
              <line
                x1={pad.l}
                x2={w - pad.r}
                y1={y(t)}
                y2={y(t)}
                stroke="var(--ink-200)"
                strokeWidth={1}
              />
              <text
                x={pad.l - 8}
                y={y(t) + 4}
                textAnchor="end"
                fill="var(--ink-500)"
                fontSize={12}
                fontFamily="var(--font-mono)"
              >
                {formatearCentavos(t)}
              </text>
            </g>
          ))}
          {anteriorPromedioCentavos != null && anteriorPromedioCentavos > 0 && (
            <line
              x1={pad.l}
              x2={w - pad.r}
              y1={y(anteriorPromedioCentavos)}
              y2={y(anteriorPromedioCentavos)}
              stroke="var(--ink-500)"
              strokeWidth={1.5}
              strokeDasharray="5 4"
            />
          )}
          <polygon
            points={area}
            fill="var(--green-50)"
            fillOpacity={0.85}
          />
          <polyline
            points={puntos}
            fill="none"
            stroke="var(--green-800)"
            strokeWidth={2.5}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {serie.map((p, i) => (
            <circle
              key={p.fecha}
              cx={x(i)}
              cy={y(p.montoCentavos)}
              r={hover === i ? 5 : 3.5}
              fill="var(--green-800)"
              onMouseEnter={() => setHover(i)}
              style={{ cursor: "pointer" }}
            />
          ))}
          <text
            x={pad.l}
            y={h - 8}
            fill="var(--ink-500)"
            fontSize={12}
          >
            {formatearFechaCorta(serie[0]?.fecha ?? "")}
          </text>
          <text
            x={w - pad.r}
            y={h - 8}
            textAnchor="end"
            fill="var(--ink-500)"
            fontSize={12}
          >
            {formatearFechaCorta(serie.at(-1)?.fecha ?? "")}
          </text>
        </svg>
        {tip && (
          <div
            id={tipId}
            role="tooltip"
            className="pointer-events-none absolute left-1/2 top-2 z-[1] -translate-x-1/2 rounded-campo border border-[var(--border-subtle)] bg-blanco px-3 py-2 text-sm shadow-tarjeta"
          >
            <p className="font-semibold text-tinta-900">
              {formatearFechaLarga(tip.fecha)}
            </p>
            <p className="mt-0.5 font-mono tabular-nums text-tinta-800">
              {formatearCentavos(tip.montoCentavos)}
            </p>
          </div>
        )}
      </div>
      {anteriorPromedioCentavos != null && anteriorPromedioCentavos > 0 && (
        <p className="text-xs text-tinta-500">
          Línea punteada = promedio del recorte anterior (
          {formatearCentavos(anteriorPromedioCentavos)})
        </p>
      )}
    </div>
  );
}
