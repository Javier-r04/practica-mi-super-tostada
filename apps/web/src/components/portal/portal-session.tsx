"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useQuery } from "@tanstack/react-query";
import type { PortalProducto, PortalSesion } from "@misupertostada/shared";
import { api, ApiError } from "@/lib/api";
import { cantidadesDesdePedido } from "@/lib/portal-vista";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";

type PortalSessionValue = {
  token: string;
  sesion: PortalSesion;
  cantidades: Record<string, number>;
  setCantidad: (productoId: string, cantidad: number) => void;
  resetDesdePedido: () => void;
  assetPath: (assetId: string) => string;
};

const PortalSessionContext = createContext<PortalSessionValue | null>(null);

export function usePortalSession(): PortalSessionValue {
  const ctx = useContext(PortalSessionContext);
  if (!ctx) {
    throw new Error("usePortalSession requiere PortalSessionProvider");
  }
  return ctx;
}

export function usePortalSessionOptional(): PortalSessionValue | null {
  return useContext(PortalSessionContext);
}

export function PortalSessionProvider({
  token,
  children,
}: {
  token: string;
  children: ReactNode;
}) {
  const [cantidades, setCantidades] = useState<Record<string, number>>({});

  const sesion = useQuery({
    queryKey: ["portal", token],
    queryFn: () => api<PortalSesion>(`/p/${encodeURIComponent(token)}`),
  });

  useEffect(() => {
    if (!sesion.data) return;
    setCantidades((prev) => {
      if (Object.keys(prev).length > 0) return prev;
      return cantidadesDesdePedido(sesion.data.pedidoAbierto);
    });
  }, [sesion.data]);

  const setCantidad = useCallback((productoId: string, cantidad: number) => {
    setCantidades((prev) => ({ ...prev, [productoId]: cantidad }));
  }, []);

  const resetDesdePedido = useCallback(() => {
    if (!sesion.data?.pedidoAbierto) return;
    setCantidades(cantidadesDesdePedido(sesion.data.pedidoAbierto));
  }, [sesion.data?.pedidoAbierto]);

  const assetPath = useCallback(
    (assetId: string) =>
      `/p/${encodeURIComponent(token)}/assets/${assetId}`,
    [token],
  );

  if (sesion.isPending) {
    return <PortalChromeSkeleton />;
  }

  if (sesion.error instanceof ApiError) {
    return (
      <div className="grid min-h-[100dvh] place-items-center bg-[var(--surface-page)] p-6">
        <EmptyState
          title="No encontramos esa página"
          description="El enlace no es válido o ya no está activo. Pida uno nuevo a la fábrica."
        />
      </div>
    );
  }

  if (!sesion.data) return null;

  const value: PortalSessionValue = {
    token,
    sesion: sesion.data,
    cantidades,
    setCantidad,
    resetDesdePedido,
    assetPath,
  };

  return (
    <PortalSessionContext.Provider value={value}>
      {children}
    </PortalSessionContext.Provider>
  );
}

export function itemsElegidosDe(
  catalogo: readonly PortalProducto[],
  cantidades: Record<string, number>,
) {
  return catalogo
    .filter((p) => (cantidades[p.productoId] ?? 0) > 0 && p.pedible)
    .map((p) => ({
      producto: p,
      cantidad: cantidades[p.productoId] ?? 0,
    }));
}

function PortalChromeSkeleton() {
  return (
    <div className="flex min-h-[100dvh] flex-col bg-[var(--surface-page)]">
      <div className="h-14 bg-[var(--surface-brand)] px-4">
        <Skeleton className="mt-3 h-8 w-40 bg-[var(--green-700)]" />
      </div>
      <div className="hidden h-12 border-b border-[var(--border-subtle)] bg-blanco lg:block" />
      <div className="mx-auto grid w-full max-w-[var(--page-max)] gap-3 px-4 py-4 lg:px-6">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
      <div className="fixed inset-x-0 bottom-0 h-16 border-t border-[var(--border-subtle)] bg-blanco lg:hidden" />
    </div>
  );
}
