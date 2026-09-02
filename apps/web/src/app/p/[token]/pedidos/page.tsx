"use client";

import Link from "next/link";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Alert, Button, Card, Spinner } from "@heroui/react";
import { ChevronRight, ClipboardList } from "lucide-react";
import {
  formatearFechaLarga,
  type PortalHistorial,
} from "@misupertostada/shared";
import { api, ApiError } from "@/lib/api";
import { origenPedidoLabel } from "@/lib/portal-vista";
import { usePortalSession } from "@/components/portal/portal-session";
import { PortalShell } from "@/components/portal/portal-shell";
import { EstadoBadge } from "@/components/domain/estado-badge";
import { Money } from "@/components/domain/money";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";

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
          <h1 className="sr-only text-xl font-semibold text-tinta-900 lg:not-sr-only">
            Sus pedidos
          </h1>
          <p className="mt-1 text-sm text-tinta-500 lg:mt-1">
            Últimos pedidos de este restaurante.
          </p>
        </div>

        {historial.isPending ? (
          <PedidosSkeleton />
        ) : historial.error instanceof ApiError ? (
          <Alert status="danger">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>No se pudo cargar el historial</Alert.Title>
              <Alert.Description>{historial.error.message}</Alert.Description>
            </Alert.Content>
          </Alert>
        ) : items.length === 0 ? (
          <Card className="p-0">
            <EmptyState
              icon={<ClipboardList size={22} aria-hidden />}
              title="Aún no ha pedido por este enlace."
              description="Cuando confirme un pedido, aparece aquí."
            />
          </Card>
        ) : (
          <Card className="gap-0 overflow-hidden p-0">
            <ul>
              {items.map((p) => (
                <li
                  key={p.id}
                  className="border-b border-[var(--border-subtle)] last:border-b-0"
                >
                  <Link
                    href={`${base}/pedidos/${p.id}`}
                    className="flex min-h-[60px] min-w-0 items-center gap-2 px-4 py-3 text-inherit no-underline transition-colors duration-control ease-out hover:bg-[var(--ink-50)] hover:text-inherit hover:no-underline focus-visible:outline-none focus-visible:shadow-foco sm:gap-3"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-semibold tabular-nums text-tinta-900">
                        {formatearFechaLarga(p.fechaEntrega)}
                      </span>
                      <span className="block truncate text-xs text-tinta-500">
                        <span className="font-mono">#{p.correlativo}</span> ·{" "}
                        {origenPedidoLabel(p.origen)}
                      </span>
                    </span>
                    <span className="grid min-w-0 shrink-0 justify-items-end gap-1">
                      <Money centavos={p.totalCentavos} truncate />
                      <EstadoBadge estado={p.estado} size="sm" />
                    </span>
                    <ChevronRight
                      size={18}
                      className="shrink-0 text-tinta-400"
                      aria-hidden
                    />
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {historial.hasNextPage ? (
          <Button
            fullWidth
            isPending={historial.isFetchingNextPage}
            size="lg"
            variant="secondary"
            onPress={() => void historial.fetchNextPage()}
          >
            {({ isPending }) => (
              <>
                {isPending && <Spinner color="current" size="sm" />}
                Cargar más
              </>
            )}
          </Button>
        ) : null}
      </div>
    </PortalShell>
  );
}

function PedidosSkeleton() {
  return (
    <Card className="gap-0 overflow-hidden p-0" aria-hidden>
      {Array.from({ length: 4 }, (_, i) => (
        <div
          key={i}
          className="flex min-h-[60px] items-center gap-3 border-b border-[var(--border-subtle)] px-4 py-3 last:border-b-0"
        >
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-3.5 w-2/3 max-w-[14rem]" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-5 w-20 rounded-pill" />
        </div>
      ))}
    </Card>
  );
}
