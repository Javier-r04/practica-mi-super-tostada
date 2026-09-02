"use client";

import type { ReactNode } from "react";
import { Wordmark } from "@/components/brand/wordmark";
import { PortalNav } from "@/components/portal/portal-nav";
import { VentanaBadge } from "@/components/domain/ventana-badge";
import { usePortalSession } from "@/components/portal/portal-session";
import { propsVentanaPedido } from "@/lib/portal-vista";
import { cn } from "@/lib/utils";

/* El portal lo abre el dueño del restaurante desde su teléfono, sin
   entrenamiento: una sola columna, medida de lectura corta y todo lo accionable
   por encima del pulgar (pie pegajoso + barra inferior). */
export function PortalShell({
  clienteNombre,
  children,
  footer,
  mainClassName,
}: {
  clienteNombre: string;
  children: ReactNode;
  /** Pie sticky encima de la bottom nav (catálogo móvil). */
  footer?: ReactNode;
  mainClassName?: string;
}) {
  const { sesion } = usePortalSession();
  const { abierta, reabierta, diaCerrado } = propsVentanaPedido(sesion.ventana);
  return (
    <div className="flex min-h-[100dvh] w-full flex-col bg-[var(--surface-page)]">
      <header className="sticky top-0 z-[var(--z-sticky)] flex h-14 shrink-0 items-center justify-between gap-2 bg-[var(--surface-brand)] px-4 sm:gap-3 lg:px-6">
        <Wordmark compact onBrand className="shrink-0" />
        <div className="flex min-w-0 flex-1 items-center justify-end gap-1.5 sm:gap-2">
          {/* En móvil el nombre va en el hero de inicio o en el contexto de la
              pantalla; aquí solo compite con el badge de ventana. */}
          <p className="hidden min-w-0 truncate text-sm font-semibold text-blanco lg:block">
            {clienteNombre}
          </p>
          {/* Estado operativo, misma fuente que el navbar del panel. El
              countdown largo vive en el hero: `size="sm"` solo muestra la
              etiqueta corta para que no reviente el header en móvil. */}
          <VentanaBadge
            size="sm"
            abierta={abierta}
            reabierta={reabierta}
            diaCerrado={diaCerrado}
          />
        </div>
      </header>
      <PortalNav variant="top" />
      <main
        className={cn(
          "mx-auto flex min-h-0 w-full max-w-[var(--page-max)] flex-1 flex-col px-4 lg:px-6 lg:pb-10",
          footer
            ? "pb-[calc(var(--bottombar-height)+var(--portal-footer-height)+env(safe-area-inset-bottom,0px))]"
            : "pb-[calc(var(--bottombar-height)+1rem+env(safe-area-inset-bottom,0px))]",
          mainClassName,
        )}
      >
        {children}
      </main>
      {footer ? (
        <div className="sticky bottom-[calc(var(--bottombar-height)+env(safe-area-inset-bottom,0px))] z-[calc(var(--z-nav)-1)] border-t border-[var(--border-subtle)] bg-blanco shadow-[0_-2px_8px_rgba(23,25,15,.06)] lg:static lg:shadow-none">
          <div className="mx-auto max-w-[var(--page-max)] px-4 py-3 lg:px-6">
            {footer}
          </div>
        </div>
      ) : null}
      <PortalNav variant="bottom" />
    </div>
  );
}
