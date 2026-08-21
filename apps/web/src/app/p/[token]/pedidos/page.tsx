"use client";

import Link from "next/link";
import { useInfiniteQuery } from "@tanstack/react-query";
import type { PortalHistorial } from "@misupertostada/shared";
import { api, ApiError } from "@/lib/api";
import { origenPedidoLabel } from "@/lib/portal-vista";
import { usePortalSession } from "@/components/portal/portal-session";
import { PortalShell } from "@/components/portal/portal-shell";
import { EstadoBadge } from "@/components/domain/estado-badge";
import { Money } from "@/components/domain/money";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { ClipboardList } from "lucide-react";

export default function PortalPedidosPage() {
  const { token, sesion } = usePortalSession();
  const base = `/p/${encodeURIComponent(token)}`;

  const historial = useInfiniteQuery({
    queryKey: ["portal", token, "pedidos"],
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      api<PortalHistorial>(
        `/p/${encodeURIComponent(token)}/pedidos?limit=20&offset=${pageParam}`,
      ),
    getNextPageParam: (last) => last.nextOffset ?? undefined,
  });

  const items = historial.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <PortalShell clienteNombre={sesion.cliente.nombre}>
      <div className="grid gap-4 py-4">
        <div>
          <h1 className="text-xl font-semibold text-tinta-900">Sus pedidos</h1>
          <p className="mt-1 text-sm text-tinta-500">
            Últimos pedidos de este restaurante.
          </p>
        </div>

        {historial.isPending ? (
          <div className="grid gap-0 rounded-tarjeta border border-[var(--border-subtle)] bg-blanco">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-none border-b border-[var(--border-subtle)] last:border-0" />
            ))}
          </div>
        ) : historial.error instanceof ApiError ? (
          <EmptyState
            title="No se pudo cargar el historial"
            description={historial.error.message}
          />
        ) : items.length === 0 ? (
          <EmptyState
            icon={<ClipboardList size={20} aria-hidden />}
            title="Aún no ha pedido por este enlace."
            description="Cuando confirme un pedido, aparece aquí."
          />
        ) : (
          <ul className="overflow-hidden rounded-tarjeta border border-[var(--border-subtle)] bg-blanco">
            {items.map((p) => (
              <li
                key={p.id}
                className="border-b border-[var(--border-subtle)] last:border-b-0"
              >
                <Link
                  href={`${base}/pedidos/${p.id}`}
                  className="flex min-h-fila items-center gap-3 px-4 py-2.5 text-inherit no-underline hover:bg-tinta-50 hover:text-inherit hover:no-underline focus-visible:outline-none focus-visible:shadow-foco"
                >
                  <span className="w-14 shrink-0 font-mono text-xs text-tinta-500">
                    #{p.correlativo}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold tabular-nums text-tinta-900">
                      {p.fechaOperacion}
                    </span>
                    <span className="block text-xs text-tinta-500">
                      {origenPedidoLabel(p.origen)}
                    </span>
                  </span>
                  <EstadoBadge estado={p.estado} size="sm" />
                  <Money centavos={p.totalCentavos} />
                </Link>
              </li>
            ))}
          </ul>
        )}

        {historial.hasNextPage ? (
          <Button
            variant="secondary"
            size="lg"
            className="w-full"
            loading={historial.isFetchingNextPage}
            onClick={() => historial.fetchNextPage()}
          >
            Cargar más
          </Button>
        ) : null}
      </div>
    </PortalShell>
  );
}
