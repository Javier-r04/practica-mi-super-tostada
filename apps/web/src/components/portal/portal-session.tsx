"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useQuery } from "@tanstack/react-query";
import type { PortalProducto, PortalSesion } from "@misupertostada/shared";
import { api } from "@/lib/api";
import { cantidadesDesdePedido } from "@/lib/portal-vista";
import { intervaloRefetchVentana } from "@/lib/ventana-refetch";
import { usePortalSse } from "@/hooks/use-portal-sse";
import { PortalErrorPantalla } from "@/components/portal/portal-error-estado";
import { Skeleton } from "@/components/ui/skeleton";

type PortalSessionValue = {
  token: string;
  sesion: PortalSesion;
  cantidades: Record<string, number>;
  setCantidad: (productoId: string, cantidad: number) => void;
  resetDesdePedido: () => void;
  vaciarCantidades: () => void;
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
  const sesion = useQuery({
    queryKey: ["portal", token],
    queryFn: () => api<PortalSesion>(`/p/${encodeURIComponent(token)}`),
    // El navbar sondea el calendario; el portal tiene que hacer lo mismo.
    // Sin esto, una pestaña abierta a las 10:00 sigue «cerrada» a las 15:00
    // porque la apertura de reloj no emite SSE. Al volver al tab también:
    // el default del QueryClient apaga refetchOnWindowFocus.
    refetchInterval: (query) =>
      intervaloRefetchVentana({
        cierraAt: query.state.data?.ventana.cierraAt,
        proximaAperturaAt: query.state.data?.ventana.proximaAperturaAt,
      }),
    refetchOnWindowFocus: true,
  });

  usePortalSse(token);

  // Sin ediciones, las cantidades son las del pedido abierto en el servidor;
  // en cuanto el cliente toca un stepper, mandan las suyas. Derivarlo evita
  // sembrar el estado desde un efecto y que el carrito quede desincronizado
  // del pedido tras un refetch.
  const pedidoAbierto = sesion.data?.pedidoAbierto ?? null;
  const delServidor = useMemo(
    () => cantidadesDesdePedido(pedidoAbierto),
    [pedidoAbierto],
  );
  const [editadas, setEditadas] = useState<Record<string, number> | null>(null);
  const cantidades = editadas ?? delServidor;

  const setCantidad = useCallback(
    (productoId: string, cantidad: number) => {
      setEditadas((prev) => ({ ...(prev ?? delServidor), [productoId]: cantidad }));
    },
    [delServidor],
  );

  const resetDesdePedido = useCallback(() => {
    if (!pedidoAbierto) return;
    setEditadas(cantidadesDesdePedido(pedidoAbierto));
  }, [pedidoAbierto]);

  const vaciarCantidades = useCallback(() => {
    setEditadas({});
  }, []);

  const assetPath = useCallback(
    (assetId: string) =>
      `/p/${encodeURIComponent(token)}/assets/${assetId}`,
    [token],
  );

  if (sesion.isPending) {
    return <PortalChromeSkeleton />;
  }

  // Sin datos no hay portal que pintar. Da igual si el servidor contestó un
  // error o si el fetch nunca llegó a salir: lo que no puede pasar es que el
  // cliente se quede viendo una pantalla en blanco sin forma de reintentar.
  if (!sesion.data) {
    return (
      <PortalErrorPantalla
        error={sesion.error}
        reintentando={sesion.isFetching}
        onReintentar={() => void sesion.refetch()}
      />
    );
  }

  const value: PortalSessionValue = {
    token,
    sesion: sesion.data,
    cantidades,
    setCantidad,
    resetDesdePedido,
    vaciarCantidades,
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

/**
 * Lo que `itemsElegidosDe` descarta: producto con cantidad pero sin precio
 * cargado. Por la UI no se llega —el stepper de un producto sin precio va
 * deshabilitado—, pero sí por el pedido que ya existía: si la fábrica le quita
 * el precio a un producto entre la captura y la edición, la línea desaparece
 * del `PUT` sin que nadie lo diga. Eso es plata, así que se avisa.
 */
export function itemsBloqueadosDe(
  catalogo: readonly PortalProducto[],
  cantidades: Record<string, number>,
) {
  return catalogo
    .filter((p) => (cantidades[p.productoId] ?? 0) > 0 && !p.pedible)
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
