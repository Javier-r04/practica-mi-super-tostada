import { EmptyState } from "@/components/ui/empty-state";

export type BarraHItem = {
  id: string;
  label: string;
  valor: number;
  etiqueta: string;
  color?: string;
};

export function ChartBarrasH({
  items,
  vacioTitulo,
  vacioHint,
}: {
  items: BarraHItem[];
  vacioTitulo: string;
  vacioHint?: string;
}) {
  const max = Math.max(1, ...items.map((i) => i.valor));
  if (items.length === 0 || items.every((i) => i.valor === 0)) {
    return <EmptyState title={vacioTitulo} description={vacioHint} />;
  }
  return (
    <ul className="grid gap-2">
      {items.map((item) => (
        <li key={item.id} className="grid gap-1">
          <div className="flex items-baseline justify-between gap-2">
            <span className="truncate text-sm font-semibold text-tinta-900">
              {item.label}
            </span>
            <span className="shrink-0 font-mono text-xs tabular-nums text-tinta-500">
              {item.etiqueta}
            </span>
          </div>
          <div
            role="meter"
            aria-valuenow={item.valor}
            aria-valuemin={0}
            aria-valuemax={max}
            aria-label={item.label}
            className="h-2 overflow-hidden rounded-pill bg-[var(--ink-100)]"
          >
            <div
              className="h-full rounded-pill"
              style={{
                width: `${Math.round((item.valor / max) * 100)}%`,
                background: item.color ?? "var(--green-800)",
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
