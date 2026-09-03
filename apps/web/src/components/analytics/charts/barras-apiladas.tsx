"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { formatearCentavos } from "@misupertostada/shared";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
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

type Dia = {
  fecha: string;
  efectivoCentavos: number;
  transferenciaCentavos: number;
  chequeCentavos: number;
};

/* Amarillo = efectivo (mano), verde = transferencia (sistema), anaranjado = cheque. */
const chartConfig = {
  efectivoCentavos: {
    label: "Efectivo",
    color: SERIE_COLOR.manual,
  },
  transferenciaCentavos: {
    label: "Transferencia",
    color: SERIE_COLOR.digital,
  },
  chequeCentavos: {
    label: "Cheque",
    color: SERIE_COLOR.cheque,
  },
} satisfies ChartConfig;

const ETIQUETA_SERIE: Record<string, string> = {
  efectivoCentavos: "Efectivo",
  transferenciaCentavos: "Transferencia",
  chequeCentavos: "Cheque",
};

export function ChartBarrasApiladas({
  serie,
  cargando = false,
}: {
  serie: Dia[];
  cargando?: boolean;
}) {
  const animar = useAnimarGraficas();
  const totales = serie.map(
    (d) =>
      d.efectivoCentavos + d.transferenciaCentavos + d.chequeCentavos,
  );

  if (cargando) {
    return <Skeleton className="h-[260px] w-full rounded-tarjeta" />;
  }

  if (serieTodoCero(totales)) {
    return (
      <EmptyState
        title="Nada cobrado en este rango"
        description="El cobro se cuenta por la fecha del pago, no por la fecha de operación."
      />
    );
  }

  const marks = etiquetasEjeX(
    serie.map((d) => d.fecha),
    serie.length > 10 ? 6 : 8,
  );
  const fechasEtiqueta = new Set(
    serie.filter((_, i) => marks[i]).map((d) => d.fecha),
  );
  const data = serie.map((d) => ({
    fecha: d.fecha,
    efectivoCentavos: d.efectivoCentavos,
    transferenciaCentavos: d.transferenciaCentavos,
    chequeCentavos: d.chequeCentavos,
  }));

  return (
    <ChartContainer
      config={chartConfig}
      className="aspect-auto h-[260px] w-full"
      initialDimension={{ width: 560, height: 260 }}
    >
      <BarChart
        data={data}
        margin={{ left: 4, right: 8, top: 8, bottom: 0 }}
        accessibilityLayer
      >
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
        <ChartTooltip
          cursor={{ fill: "var(--ink-100)" }}
          content={
            <ChartTooltipContent
              labelFormatter={(_, payload) => {
                const fecha = payload?.[0]?.payload?.fecha as
                  | string
                  | undefined;
                return fecha ? formatearFechaCorta(fecha) : "";
              }}
              formatter={(value, name) => (
                <div className="flex w-full items-center justify-between gap-4">
                  <span className="text-tinta-500">
                    {ETIQUETA_SERIE[String(name)] ?? String(name)} cobrado
                  </span>
                  <span className="font-mono font-medium tabular-nums text-tinta-900">
                    {formatearCentavos(Number(value))}
                  </span>
                </div>
              )}
            />
          }
        />
        <ChartLegend content={<ChartLegendContent />} />
        <Bar
          dataKey="efectivoCentavos"
          stackId="cobrado"
          fill="var(--color-efectivoCentavos)"
          maxBarSize={24}
          isAnimationActive={animar}
          animationDuration={560}
          animationEasing="ease-out"
        />
        <Bar
          dataKey="transferenciaCentavos"
          stackId="cobrado"
          fill="var(--color-transferenciaCentavos)"
          maxBarSize={24}
          isAnimationActive={animar}
          animationDuration={560}
          animationEasing="ease-out"
        />
        <Bar
          dataKey="chequeCentavos"
          stackId="cobrado"
          fill="var(--color-chequeCentavos)"
          maxBarSize={24}
          radius={[4, 4, 0, 0]}
          isAnimationActive={animar}
          animationDuration={560}
          animationEasing="ease-out"
        />
      </BarChart>
    </ChartContainer>
  );
}
