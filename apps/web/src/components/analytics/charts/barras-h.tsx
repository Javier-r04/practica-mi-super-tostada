import type { ReactNode } from "react";
import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";

export type BarraHItem = {
  id: string;
  label: string;
  valor: number;
  etiqueta: string;
  color?: string;
  href?: string;
  leading?: ReactNode;
  /** Texto secundario (p. ej. porcentaje). */
  meta?: string;
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
    <ul className="grid gap-3">
      {items.map((item) => {
        const label = (
          <span className="min-w-0 text-pretty text-sm font-semibold text-tinta-900">
            {item.label}
          </span>
        );
        return (
          <li key={item.id} className="grid gap-1.5">
            <div className="flex min-h-11 items-center gap-3">
              {item.leading}
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  {item.href && item.id !== "otros" ? (
                    <Link
                      href={item.href}
                      className="min-w-0 rounded-campo focus-visible:outline-none focus-visible:shadow-foco"
                    >
                      {label}
                    </Link>
                  ) : (
                    label
                  )}
                  <span className="shrink-0 text-right">
                    <span className="font-mono text-sm tabular-nums text-tinta-900">
                      {item.etiqueta}
                    </span>
                    {item.meta ? (
                      <span className="ml-1.5 text-xs tabular-nums text-tinta-500">
                        {item.meta}
                      </span>
                    ) : null}
                  </span>
                </div>
                <div
                  role="meter"
                  aria-valuenow={item.valor}
                  aria-valuemin={0}
                  aria-valuemax={max}
                  aria-label={item.label}
                  className="mt-1.5 h-3.5 overflow-hidden rounded-pill bg-[var(--ink-100)]"
                >
                  <div
                    className={cn("h-full rounded-pill")}
                    style={{
                      width: `${Math.round((item.valor / max) * 100)}%`,
                      background: item.color ?? "var(--green-800)",
                    }}
                  />
                </div>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
