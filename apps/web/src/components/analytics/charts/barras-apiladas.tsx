import { formatearCentavos } from "@misupertostada/shared";
import { EmptyState } from "@/components/ui/empty-state";

type Dia = {
  fecha: string;
  efectivoCentavos: number;
  transferenciaCentavos: number;
};

export function ChartBarrasApiladas({ serie }: { serie: Dia[] }) {
  const max = Math.max(
    1,
    ...serie.map((d) => d.efectivoCentavos + d.transferenciaCentavos),
  );
  if (serie.every((d) => d.efectivoCentavos + d.transferenciaCentavos === 0)) {
    return (
      <EmptyState
        title="Nada cobrado en este rango"
        description="El cobro se cuenta por la fecha del pago, no por la fecha de operación."
      />
    );
  }
  const w = 400;
  const h = 180;
  const pad = { l: 52, r: 8, t: 12, b: 28 };
  const innerW = w - pad.l - pad.r;
  const innerH = h - pad.t - pad.b;
  const gap = 4;
  const barW = Math.max(4, innerW / serie.length - gap);
  const y = (v: number) => pad.t + innerH - (v / max) * innerH;
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="h-auto w-full"
      role="img"
      aria-label="Cobrado por día, efectivo y transferencia"
    >
      {serie.map((d, i) => {
        const x = pad.l + i * (barW + gap);
        const hEf = (d.efectivoCentavos / max) * innerH;
        const hTr = (d.transferenciaCentavos / max) * innerH;
        return (
          <g key={d.fecha}>
            <rect
              x={x}
              y={y(d.efectivoCentavos)}
              width={barW}
              height={hEf}
              fill="var(--green-800)"
            >
              <title>
                {d.fecha} efectivo {formatearCentavos(d.efectivoCentavos)}
              </title>
            </rect>
            <rect
              x={x}
              y={y(d.efectivoCentavos + d.transferenciaCentavos)}
              width={barW}
              height={hTr}
              fill="var(--blue-700)"
            >
              <title>
                {d.fecha} transferencia {formatearCentavos(d.transferenciaCentavos)}
              </title>
            </rect>
          </g>
        );
      })}
      <text x={pad.l} y={h - 6} className="fill-tinta-500" fontSize={9}>
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
