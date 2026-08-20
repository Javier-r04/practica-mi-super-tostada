import { formatearCentavos } from "@misupertostada/shared";
import { EmptyState } from "@/components/ui/empty-state";

type Punto = { fecha: string; montoCentavos: number };

export function ChartLinea({
  serie,
  anteriorPromedioCentavos,
}: {
  serie: Punto[];
  anteriorPromedioCentavos?: number;
}) {
  const w = 400;
  const h = 180;
  const pad = { l: 52, r: 8, t: 12, b: 28 };
  const innerW = w - pad.l - pad.r;
  const innerH = h - pad.t - pad.b;
  const max = Math.max(
    1,
    ...serie.map((p) => p.montoCentavos),
    anteriorPromedioCentavos ?? 0,
  );
  if (serie.every((p) => p.montoCentavos === 0)) {
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
  const ticks = [0, max];
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="h-auto w-full"
      role="img"
      aria-label={`Ventas por día. Rango: ${serie[0]?.fecha ?? "sin datos"} a ${serie.at(-1)?.fecha ?? "sin datos"}`}
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
            x={pad.l - 6}
            y={y(t) + 3}
            textAnchor="end"
            className="fill-tinta-500"
            fontSize={9}
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
          strokeWidth={1}
          strokeDasharray="4 3"
        />
      )}
      <polygon points={area} fill="var(--ink-200)" fillOpacity={0.5} />
      <polyline
        points={puntos}
        fill="none"
        stroke="var(--green-800)"
        strokeWidth={2}
      />
      {serie.map((p, i) => (
        <circle
          key={p.fecha}
          cx={x(i)}
          cy={y(p.montoCentavos)}
          r={3}
          fill="var(--green-800)"
        >
          <title>
            {p.fecha}: {formatearCentavos(p.montoCentavos)}
          </title>
        </circle>
      ))}
      <text
        x={pad.l}
        y={h - 6}
        className="fill-tinta-500"
        fontSize={9}
      >
        {serie[0]?.fecha}
      </text>
      <text
        x={w - pad.r}
        y={h - 6}
        textAnchor="end"
        className="fill-tinta-500"
        fontSize={9}
      >
        {serie.at(-1)?.fecha}
      </text>
    </svg>
  );
}
