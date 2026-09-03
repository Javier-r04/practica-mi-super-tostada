"use client";

import { useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Button, Card, Spinner, ToggleButton, ToggleButtonGroup } from "@heroui/react";
import {
  PORTAL_FACTURA_FILTROS,
  type PortalFacturaFiltro,
  type PortalFacturas,
} from "@misupertostada/shared";
import { api } from "@/lib/api";
import { usePortalSession } from "@/components/portal/portal-session";
import { PortalBackButton } from "@/components/portal/portal-back-button";
import { PortalErrorAviso } from "@/components/portal/portal-error-estado";
import { PortalFacturasLista } from "@/components/portal/portal-cuenta-paneles";
import { Skeleton } from "@/components/ui/skeleton";
import {
  esFiltroFacturas,
  FILTRO_FACTURA_ETIQUETA,
} from "@/lib/portal-cuenta-vista";

export default function PortalFacturasPage() {
  const { token } = usePortalSession();
  const base = `/p/${encodeURIComponent(token)}`;
  // Arranca en lo que se debe: las pagadas son consulta, no la tarea del día.
  const [filtro, setFiltro] = useState<PortalFacturaFiltro>("pendientes");

  const facturas = useInfiniteQuery({
    queryKey: ["portal", token, "facturas", filtro],
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      api<PortalFacturas>(
        `/p/${encodeURIComponent(token)}/facturas?estado=${filtro}&limit=20&offset=${pageParam}`,
      ),
    getNextPageParam: (last) => last.nextOffset ?? undefined,
  });

  const items = facturas.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <div className="grid gap-4 py-4">
      <PortalBackButton href={`${base}/cuenta`} label="Cuenta" />
      <h1 className="text-xl font-semibold text-tinta-900">Facturas</h1>

      <ToggleButtonGroup
        className="mst-segmento-activo w-max max-w-none"
        isDetached
        aria-label="Estado de las facturas"
        disallowEmptySelection
        selectedKeys={new Set([filtro])}
        selectionMode="single"
        size="sm"
        onSelectionChange={(keys) => {
          const next = [...keys][0];
          if (typeof next === "string" && esFiltroFacturas(next)) setFiltro(next);
        }}
      >
        {PORTAL_FACTURA_FILTROS.map((f) => (
          <ToggleButton key={f} id={f}>
            {FILTRO_FACTURA_ETIQUETA[f]}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>

      {facturas.isPending ? (
        <FacturasSkeleton />
      ) : facturas.isError ? (
        <PortalErrorAviso
          error={facturas.error}
          titulo="No se pudieron cargar sus facturas"
          reintentando={facturas.isFetching}
          onReintentar={() => void facturas.refetch()}
        />
      ) : (
        <PortalFacturasLista items={items} filtro={filtro} />
      )}

      {facturas.hasNextPage ? (
        <Button
          fullWidth
          isPending={facturas.isFetchingNextPage}
          size="lg"
          variant="secondary"
          onPress={() => void facturas.fetchNextPage()}
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
  );
}

function FacturasSkeleton() {
  return (
    <Card className="gap-0 overflow-hidden p-0" aria-hidden>
      {Array.from({ length: 4 }, (_, i) => (
        <div
          key={i}
          className="flex min-h-[60px] items-center gap-3 border-b border-[var(--border-subtle)] px-4 py-3 last:border-b-0"
        >
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-3.5 w-2/3 max-w-[14rem]" />
            <Skeleton className="h-3 w-28" />
          </div>
          <Skeleton className="h-5 w-20 rounded-pill" />
        </div>
      ))}
    </Card>
  );
}
