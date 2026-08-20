export function ChartAnillo({
  partes,
}: {
  partes: { id: string; label: string; valor: number; color: string }[];
}) {
  const total = partes.reduce((acc, p) => acc + p.valor, 0);
  const r = 42;
  const c = 2 * Math.PI * r;
  const segmentos =
    total === 0
      ? []
      : partes.reduce<{
          cursor: number;
          items: {
            parte: (typeof partes)[number];
            dash: string;
            offset: number;
          }[];
        }>(
          (state, parte) => {
            const len = (parte.valor / total) * c;
            return {
              cursor: state.cursor + len,
              items: [
                ...state.items,
                { parte, dash: `${len} ${c - len}`, offset: state.cursor },
              ],
            };
          },
          { cursor: 0, items: [] },
        ).items;
  const etiqueta = partes.map((p) => `${p.label} ${p.valor}`).join(", ");
  return (
    <div className="flex items-center gap-4">
      <svg
        viewBox="0 0 120 120"
        className="size-28 shrink-0"
        role="img"
        aria-label={`Distribución: ${etiqueta || "sin datos"}`}
      >
        <circle
          cx={60}
          cy={60}
          r={r}
          fill="none"
          stroke="var(--ink-100)"
          strokeWidth={16}
        />
        {segmentos.map(({ parte, dash, offset }) => (
          <circle
            key={parte.id}
            cx={60}
            cy={60}
            r={r}
            fill="none"
            stroke={parte.color}
            strokeWidth={16}
            strokeDasharray={dash}
            strokeDashoffset={-offset}
            transform="rotate(-90 60 60)"
          />
        ))}
        <text
          x={60}
          y={64}
          textAnchor="middle"
          className="fill-tinta-900"
          fontSize={14}
          fontWeight={700}
        >
          {total}
        </text>
      </svg>
      <ul className="grid gap-1.5 text-sm">
        {partes.map((p) => (
          <li key={p.id} className="flex items-center gap-2">
            <span
              className="size-2.5 rounded-full"
              style={{ background: p.color }}
              aria-hidden
            />
            <span className="text-tinta-800">{p.label}</span>
            <span className="tabular-nums font-semibold text-tinta-900">
              {p.valor}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
