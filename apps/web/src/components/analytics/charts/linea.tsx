"use client";

import { useId } from "react";
import { Area, AreaChart, CartesianGrid, ReferenceLine, XAxis, YAxis } from "recharts";
import { formatearCentavos, formatearFechaLarga } from "@misupertostada/shared";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  SERIE_COLOR,
  type ChartConfig,
} from "@/components/ui/chart";
import { useAnimarGraficas } from "@/hooks/use-animar-graficas";
import {
  etiquetasEjeX,
  formatearFechaCorta,
  serieTodoCero,
} from "@/lib/tablero-vista";

type Punto = { fecha: string; montoCentavos: number };

/* Una sola serie: no lleva leyenda (el título de la tarjeta ya la nombra) y
   usa el color «digital» de la paleta del tablero. */
const chartConfig = {
  montoCentavos: {
    label: "Ventas",
    color: SERIE_COLOR.digital,
  },
} satisfies ChartConfig;

const ALTO = 240;

/** Con muchos días los puntos se amontonan: la línea sola se lee mejor. */
const MAX_PUNTOS_CON_DOT = 14;

export function ChartLinea({
  serie,
  anteriorPromedioCentavos,
  cargando = false,
}: {
  serie: Punto[];
  anteriorPromedioCentavos?: number;
  cargando?: boolean;
}) {
  const animar = useAnimarGraficas();
  const reactId = useId().replace(/:/g, "");
  const fillId = `fillVentas-${reactId}`;

  if (cargando) {
    // Misma altura que la gráfica real: al llegar los datos nada salta.
    return <Skeleton className="h-[240px] w-full rounded-tarjeta" />;
  }

  if (serieTodoCero(serie.map((p) => p.montoCentavos))) {
    return (
      <EmptyState
        title="Sin ventas en este rango"
        description="Al entregar pedidos aparecen aquí, con el snapshot de esa noche."
      />
    );
  }

  const marks = etiquetasEjeX(
    serie.map((p) => p.fecha),
    serie.length > 10 ? 6 : 8,
  );
  const fechasEtiqueta = new Set(
    serie.filter((_, i) => marks[i]).map((p) => p.fecha),
  );
  const data = serie.map((p) => ({
    fecha: p.fecha,
    montoCentavos: p.montoCentavos,
  }));
  const conDots = data.length <= MAX_PUNTOS_CON_DOT;

  return (
    <div className="grid gap-2">
      <ChartContainer
        config={chartConfig}
        className="aspect-auto h-[240px] w-full"
        initialDimension={{ width: 560, height: ALTO }}
      >
        <AreaChart
          data={data}
          margin={{ left: 4, right: 8, top: 8, bottom: 0 }}
          accessibilityLayer
        >
          {/* Lavado de un solo tono: el área acompaña a la línea, no compite. */}
          <defs>
            <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="0%"
                stopColor="var(--color-montoCentavos)"
                stopOpacity={0.16}
              />
              <stop
                offset="100%"
                stopColor="var(--color-montoCentavos)"
                stopOpacity={0.02}
              />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="var(--ink-200)" />
          <XAxis
            dataKey="fecha"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            minTickGap={24}
            tickFormatter={(v: string) =>
              fechasEtiqueta.has(v) ? formatearFechaCorta(v) : ""
            }
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={72}
            tickMargin={4}
            tickFormatter={(v: number) => formatearCentavos(v)}
          />
          {anteriorPromedioCentavos != null && anteriorPromedioCentavos > 0 && (
            <ReferenceLine
              y={anteriorPromedioCentavos}
              stroke="var(--ink-400)"
              strokeDasharray="5 4"
              strokeWidth={1.5}
            />
          )}
          <ChartTooltip
            cursor={{ stroke: "var(--ink-300)", strokeWidth: 1 }}
            content={
              <ChartTooltipContent
                labelFormatter={(_, payload) => {
                  const fecha = payload?.[0]?.payload?.fecha as
                    | string
                    | undefined;
                  return fecha ? formatearFechaLarga(fecha) : "";
                }}
                formatter={(value) => (
                  <div className="flex w-full items-center justify-between gap-4">
                    <span className="text-tinta-500">Ventas del día</span>
                    <span className="font-mono font-medium tabular-nums text-tinta-900">
                      {formatearCentavos(Number(value))}
                    </span>
                  </div>
                )}
              />
            }
          />
          <Area
            dataKey="montoCentavos"
            type="monotone"
            fill={`url(#${fillId})`}
            stroke="var(--color-montoCentavos)"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            dot={
              conDots
                ? {
                    r: 4,
                    fill: "var(--color-montoCentavos)",
                    stroke: "var(--surface-card)",
                    strokeWidth: 2,
                  }
                : false
            }
            activeDot={{
              r: 5,
              fill: "var(--color-montoCentavos)",
              stroke: "var(--surface-card)",
              strokeWidth: 2,
            }}
            isAnimationActive={animar}
            animationDuration={640}
            animationEasing="ease-out"
          />
        </AreaChart>
      </ChartContainer>
      {anteriorPromedioCentavos != null && anteriorPromedioCentavos > 0 && (
        <p className="text-xs text-tinta-500">
          Línea punteada = promedio diario del recorte anterior (
          <span className="tabular-nums">
            {formatearCentavos(anteriorPromedioCentavos)}
          </span>
          )
        </p>
      )}
    </div>
  );
}
