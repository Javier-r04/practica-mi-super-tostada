"use client";

import { Card, Chip } from "@heroui/react";
import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import type { RutaParada } from "@misupertostada/shared";
import { ClienteAvatar } from "@/components/catalog/cliente-avatar";
import { EstadoBadge } from "@/components/domain/estado-badge";
import { Money } from "@/components/domain/money";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/* Mismo lenguaje que ClienteMiniCard: filete lateral con el estado, Card
   compuesto y Chips. Aquí el filete dice si la parada ya está hecha, que es
   lo único que Tony busca al bajar la lista con el dedo. */
const RAIL_HECHO = "border-l-[var(--green-600)]";
const RAIL_PENDIENTE = "border-l-[var(--amber-600)]";

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
  const porCobrar = parada.saldoAnteriorCentavos > 0;
  const estadoLabel = sinSincronizar
    ? "sin sincronizar"
    : hecho
      ? "entregado"
      : "pendiente";

  return (
    /* La tarjeta entera es el área táctil: en la calle no hay que apuntar a un
       botón chico, se toca la parada. Botón nativo → onClick. */
    <button
      type="button"
      onClick={onAbrir}
      aria-label={`${hora} ${parada.clienteNombre} ${estadoLabel}`}
      className={cn(
        "group block w-full rounded-tarjeta text-left",
        "focus-visible:outline-none focus-visible:shadow-foco",
      )}
    >
      <Card
        className={cn(
          "gap-3 border-l-[4px] p-4",
          "transition-shadow duration-control ease-out group-hover:shadow-[var(--shadow-md)]",
          hecho ? RAIL_HECHO : RAIL_PENDIENTE,
        )}
      >
        <Card.Header className="flex-row items-start gap-3">
          <ClienteAvatar
            nombre={parada.clienteNombre}
            fotoAssetId={parada.fotoAssetId}
            size="md"
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-display text-xl leading-none tabular-nums text-marca">
                {parada.horarioEntregaFijo ?? "—"}
              </span>
              {sinSincronizar ? (
                <EstadoBadge estado="SIN_SINCRONIZAR" size="sm" />
              ) : (
                <EstadoBadge estado={parada.estado} size="sm" />
              )}
            </div>
            <Card.Title className="mt-1 text-[17px] leading-snug text-pretty text-tinta-900">
              {parada.clienteNombre}
            </Card.Title>
            <p className="mt-0.5 font-mono text-xs tabular-nums text-tinta-500">
              #{parada.correlativo}
            </p>
          </div>
          <ChevronRight
            size={22}
            aria-hidden
            className="mt-1 shrink-0 text-tinta-500"
          />
        </Card.Header>

        <Card.Content
          className={cn(
            "mt-auto grid grid-cols-2 gap-2 rounded-[calc(var(--radius-card)-6px)] px-3 py-2.5",
            porCobrar ? "bg-[var(--amber-100)]" : "bg-[var(--ink-50)]",
          )}
        >
          <Cifra
            etiqueta="Pedido"
            valor={
              <Money
                centavos={parada.totalEstimadoCentavos}
                className="text-[15px]"
              />
            }
          />
          <Cifra
            etiqueta="Saldo anterior"
            valor={
              porCobrar ? (
                <span className="inline-flex flex-wrap items-center gap-1.5">
                  <Money
                    centavos={parada.saldoAnteriorCentavos}
                    tone="pendiente"
                    className="text-[15px]"
                  />
                  <Chip color="warning" size="sm" variant="soft">
                    Cobrar
                  </Chip>
                </span>
              ) : (
                <Money centavos={0} tone="muted" className="text-[15px]" />
              )
            }
          />
        </Card.Content>
      </Card>
    </button>
  );
}

function Cifra({ etiqueta, valor }: { etiqueta: string; valor: ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="mst-label text-[11px]">{etiqueta}</p>
      <div className="mt-0.5 tabular-nums">{valor}</div>
    </div>
  );
}

export function ParadaCardSkeleton() {
  return (
    <Card className="gap-3 border-l-[4px] border-l-[var(--ink-100)] p-4">
      <div className="flex items-start gap-3">
        <Skeleton className="size-11 shrink-0 rounded-full" />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-12" />
        </div>
      </div>
      <Skeleton className="h-14 w-full rounded-[calc(var(--radius-card)-6px)]" />
    </Card>
  );
}
