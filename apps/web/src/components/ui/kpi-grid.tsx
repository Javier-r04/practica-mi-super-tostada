"use client";

import { Card } from "@heroui/react";
import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export type KpiTono = "neutro" | "ok" | "marca" | "aviso" | "peligro";

const columnLayouts = {
  standard: "grid-cols-2 lg:grid-cols-4",
  /** En móvil: 2 columnas; la quinta KPI ocupa el ancho completo para no dejar hueco. */
  tablero:
    "grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 [&>*:nth-child(5):nth-last-child(1)]:col-span-2 lg:[&>*:nth-child(5):nth-last-child(1)]:col-span-1",
  tres: "grid-cols-2 sm:grid-cols-3",
} as const;

export type KpiColumns = keyof typeof columnLayouts;

function tonoClase(tono: KpiTono): string {
  switch (tono) {
    case "peligro":
      return "text-peligro";
    case "aviso":
      return "text-aviso-700";
    case "ok":
    case "marca":
      return "text-marca";
    default:
      return "text-tinta-900";
  }
}

function scrollToAnchor(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  el.scrollIntoView({ behavior: reduce ? "auto" : "smooth" });
}

export function KpiGrid({
  children,
  columns = "standard",
  className,
}: {
  children: ReactNode;
  columns?: KpiColumns;
  className?: string;
}) {
  return (
    <dl
      className={cn(
        "grid min-w-0 gap-3 [&>*]:min-w-0",
        columnLayouts[columns],
        className,
      )}
    >
      {children}
    </dl>
  );
}

export function KpiCard({
  etiqueta,
  valor,
  nota,
  tono = "neutro",
  variant = "default",
  size = "md",
  className,
  valorInactivo = false,
}: {
  etiqueta: string;
  valor: ReactNode;
  nota?: string;
  tono?: KpiTono;
  variant?: "default" | "secondary";
  size?: "md" | "lg";
  className?: string;
  /** Cuando el valor es cero o vacío, usa color neutro en lugar del tono. */
  valorInactivo?: boolean;
}) {
  const valorTono = valorInactivo ? "text-tinta-400" : tonoClase(tono);

  return (
    <Card
      variant={variant === "secondary" ? "secondary" : undefined}
      className={cn(
        "min-w-0 gap-1",
        variant === "secondary" ? "p-3" : "p-4",
        className,
      )}
    >
      <dt className="mst-label line-clamp-2 text-[11px] leading-snug">{etiqueta}</dt>
      <dd
        className={cn(
          "min-w-0 font-semibold leading-tight tabular-nums [overflow-wrap:anywhere]",
          size === "lg" ? "text-xl sm:text-[22px]" : "text-base sm:text-[22px]",
          valorTono,
        )}
      >
        {valor}
      </dd>
      {nota ? (
        <p className="min-w-0 text-pretty text-[11px] leading-snug text-tinta-500">
          {nota}
        </p>
      ) : null}
    </Card>
  );
}

/** Tarjeta KPI con overlay clicable para navegar a un ancla en la misma página. */
export function KpiCardAncla({
  etiqueta,
  valor,
  nota,
  tono = "neutro",
  ancla,
}: {
  etiqueta: string;
  valor: ReactNode;
  nota?: string;
  tono?: KpiTono;
  ancla: string;
}) {
  return (
    <Card className="relative min-w-0 gap-1 p-4">
      <dt className="mst-label line-clamp-2 text-[11px] leading-snug">{etiqueta}</dt>
      <dd
        className={cn(
          "min-w-0 text-base font-semibold leading-tight tabular-nums [overflow-wrap:anywhere] sm:text-[22px]",
          tonoClase(tono),
        )}
      >
        {valor}
      </dd>
      {nota ? (
        <p className="min-w-0 text-pretty text-[11px] leading-snug text-tinta-500">
          {nota}
        </p>
      ) : null}
      <button
        type="button"
        onClick={() => scrollToAnchor(ancla)}
        className="absolute inset-0 rounded-tarjeta transition-shadow duration-control ease-out hover:shadow-tarjeta focus-visible:outline-none focus-visible:shadow-foco"
      >
        <span className="sr-only">Ver el detalle de {etiqueta}</span>
      </button>
    </Card>
  );
}

export function KpiGridSkeleton({
  count = 4,
  columns = "standard",
  rowHeight = 76,
}: {
  count?: number;
  columns?: KpiColumns;
  rowHeight?: 76 | 92;
}) {
  const heightClass = rowHeight === 92 ? "h-[92px]" : "h-[76px]";
  return (
    <div
      className={cn(
        "grid min-w-0 gap-3 [&>*]:min-w-0",
        columnLayouts[columns],
      )}
    >
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} className={cn("w-full rounded-tarjeta", heightClass)} />
      ))}
    </div>
  );
}
