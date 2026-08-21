import { cn } from "@/lib/utils";

export type MedidorParte = {
  id: string;
  label: string;
  valor: number;
  /** Token CSS o color de marca. */
  color: string;
};

/**
 * Medidor horizontal apilado con % escrito.
 * Sustituye donuts de 2–3 partes (nada depende solo del color).
 */
export function MedidorApilado({
  partes,
  vacio = "Sin datos",
}: {
  partes: MedidorParte[];
  vacio?: string;
}) {
  const total = partes.reduce((acc, p) => acc + p.valor, 0);
  if (total <= 0) {
    return <p className="text-sm text-tinta-500">{vacio}</p>;
  }

  const conPct = partes.map((p) => ({
    ...p,
    pct: Math.round((p.valor / total) * 100),
  }));

  return (
    <div className="grid gap-3">
      <div
        className="flex h-3.5 overflow-hidden rounded-pill bg-[var(--ink-100)]"
        role="img"
        aria-label={conPct.map((p) => `${p.label} ${p.pct} %`).join(" · ")}
      >
        {conPct.map((p) =>
          p.pct <= 0 ? null : (
            <div
              key={p.id}
              className="h-full"
              style={{
                width: `${p.pct}%`,
                background: p.color,
              }}
              title={`${p.label}: ${p.valor} (${p.pct} %)`}
            />
          ),
        )}
      </div>
      <ul className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
        {conPct.map((p) => (
          <li key={p.id} className="inline-flex items-center gap-2">
            <span
              className="size-2.5 shrink-0 rounded-sm"
              style={{ background: p.color }}
              aria-hidden
            />
            <span className="text-tinta-800">
              {p.label}{" "}
              <span className="font-semibold tabular-nums text-tinta-900">
                {p.pct} %
              </span>
              <span className={cn("ml-1 tabular-nums text-tinta-500")}>
                ({p.valor})
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
