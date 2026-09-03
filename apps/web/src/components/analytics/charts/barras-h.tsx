"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { SERIE_COLOR } from "@/components/ui/chart";
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

/** Una sola serie: todas las barras del mismo tono; «Otros» en neutro. */
function colorDeBarra(item: BarraHItem): string {
  if (item.color) return item.color;
  return item.id === "otros" ? SERIE_COLOR.neutral : SERIE_COLOR.digital;
}

export function ChartBarrasH({
  items,
  vacioTitulo,
  vacioHint,
  cargando = false,
  filasCargando = 5,
}: {
  items: BarraHItem[];
  vacioTitulo: string;
  vacioHint?: string;
  cargando?: boolean;
  filasCargando?: number;
}) {
  const [listo, setListo] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setListo(true));
    return () => cancelAnimationFrame(id);
  }, []);

  if (cargando) {
    // Misma silueta que la fila real: avatar, nombre, cifra y barra.
    return (
      <ul className="grid gap-1" aria-hidden>
        {Array.from({ length: filasCargando }, (_, i) => (
          <li key={i}>
            <div className="flex min-h-11 items-center gap-3 rounded-campo px-3 py-2">
              <Skeleton className="size-9 shrink-0 rounded-full" />
              <div className="grid flex-1 gap-1.5">
                <Skeleton className="h-3 w-2/5" />
                <Skeleton className="h-3.5 w-full rounded-pill" />
              </div>
            </div>
          </li>
        ))}
      </ul>
    );
  }

  const max = Math.max(1, ...items.map((i) => i.valor));
  if (items.length === 0 || items.every((i) => i.valor === 0)) {
    return <EmptyState title={vacioTitulo} description={vacioHint} />;
  }
  return (
    <ul className="grid gap-1">
      {items.map((item) => {
        const pct = Math.round((item.valor / max) * 100);
        const esLink = Boolean(item.href && item.id !== "otros");
        const fila = (
          <>
            {item.leading}
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <span className="min-w-0 text-pretty text-sm font-semibold text-tinta-900">
                  {item.label}
                </span>
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
                  className={cn(
                    "h-full rounded-pill transition-[width] duration-slow ease-out",
                  )}
                  style={{
                    width: listo ? `${pct}%` : "0%",
                    background: colorDeBarra(item),
                  }}
                />
              </div>
            </div>
          </>
        );

        return (
          <li key={item.id}>
            {esLink ? (
              <Link
                href={item.href!}
                className="flex min-h-11 items-center gap-3 rounded-campo px-3 py-2 text-inherit no-underline transition-colors hover:bg-tinta-50 hover:text-inherit hover:no-underline focus-visible:outline-none focus-visible:shadow-foco"
              >
                {fila}
              </Link>
            ) : (
              <div className="flex min-h-11 items-center gap-3 px-3 py-2">
                {fila}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
