"use client";

import type { ReactNode } from "react";
import type { RutaParada } from "@misupertostada/shared";
import { ClienteAvatar } from "@/components/catalog/cliente-avatar";
import { EstadoBadge } from "@/components/domain/estado-badge";
import { Money } from "@/components/domain/money";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function ParadaCard({
  parada,
  sinSincronizar,
  onAbrir,
}: {
  parada: RutaParada;
  sinSincronizar: boolean;
  onAbrir: () => void;
}) {
  const hecho = parada.estado === "ENTREGADO";
  const hora = parada.horarioEntregaFijo ?? "Sin horario";
  const estadoLabel = sinSincronizar
    ? "sin sincronizar"
    : hecho
      ? "entregado"
      : "pendiente";

  return (
    <button
      type="button"
      onClick={onAbrir}
      aria-label={`${hora} ${parada.clienteNombre} ${estadoLabel}`}
      className={cn(
        "group grid gap-3 rounded-tarjeta border-2 bg-blanco p-4 text-left shadow-tarjeta",
        "transition-[border-color] duration-150 ease-out",
        "hover:border-[var(--border-accent)]",
        "focus-visible:outline-none focus-visible:shadow-foco",
        "border-[var(--border-subtle)]",
        hecho
          ? "border-l-[4px] border-l-[var(--green-600)]"
          : "border-l-[4px] border-l-[var(--yellow-400)]",
      )}
    >
      <div className="flex items-start gap-3">
        <ClienteAvatar
          nombre={parada.clienteNombre}
          fotoAssetId={parada.fotoAssetId}
          size="sm"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-display text-lg tabular-nums text-marca">
              {parada.horarioEntregaFijo ?? "—"}
            </span>
            {sinSincronizar ? (
              <EstadoBadge estado="SIN_SINCRONIZAR" size="sm" />
            ) : (
              <EstadoBadge estado={parada.estado} size="sm" />
            )}
          </div>
          <p className="mt-0.5 font-semibold text-pretty text-tinta-900">
            {parada.clienteNombre}
          </p>
          <p className="mt-0.5 font-mono text-xs tabular-nums text-tinta-500">
            #{parada.correlativo}
          </p>
        </div>
      </div>

      <div
        className={cn(
          "grid grid-cols-2 gap-2 rounded-[calc(var(--radius-card)-0.5rem)] p-2.5",
          parada.saldoAnteriorCentavos > 0 ? "bg-tinta-50" : "bg-[var(--green-50)]",
        )}
      >
        <Metric
          label="Pedido"
          value={<Money centavos={parada.totalEstimadoCentavos} />}
          tone="muted"
        />
        <Metric
          label="Saldo ant."
          value={
            parada.saldoAnteriorCentavos > 0 ? (
              <span className="inline-flex items-center gap-1.5">
                <Badge tone="amber">Cobrar</Badge>
                <Money centavos={parada.saldoAnteriorCentavos} tone="pendiente" />
              </span>
            ) : (
              <Money centavos={0} />
            )
          }
          tone={parada.saldoAnteriorCentavos > 0 ? "warn" : "ok"}
        />
      </div>
    </button>
  );
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: ReactNode;
  tone: "ok" | "warn" | "muted";
}) {
  const color =
    tone === "warn"
      ? "text-aviso"
      : tone === "ok"
        ? "text-marca"
        : "text-tinta-800";
  return (
    <div className="min-w-0 px-1 py-0.5">
      <p className="mst-label text-[10px]">{label}</p>
      <div className={cn("mt-0.5 text-sm font-semibold tabular-nums", color)}>
        {value}
      </div>
    </div>
  );
}

export function ParadaCardSkeleton() {
  return (
    <div className="grid gap-3 rounded-tarjeta border-2 border-[var(--border-subtle)] bg-blanco p-4 shadow-tarjeta">
      <div className="flex items-start gap-3">
        <Skeleton className="size-9 shrink-0 rounded-full" />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-12" />
        </div>
      </div>
      <Skeleton className="h-14 w-full rounded-[calc(var(--radius-card)-0.5rem)]" />
    </div>
  );
}
