"use client";

import type { ReactNode } from "react";
import { Wordmark } from "@/components/brand/wordmark";
import { PortalNav } from "@/components/portal/portal-nav";
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
  return (
    <div className="flex min-h-[100dvh] w-full flex-col bg-[var(--surface-page)]">
      <header className="sticky top-0 z-[var(--z-sticky)] flex h-14 shrink-0 items-center justify-between gap-3 bg-[var(--surface-brand)] px-4 lg:px-6">
        <Wordmark compact onBrand />
        <p className="min-w-0 truncate text-sm font-semibold text-blanco">
          {clienteNombre}
        </p>
      </header>
      <PortalNav variant="top" />
      <main
        className={cn(
          "mx-auto flex min-h-0 w-full max-w-[var(--page-max)] flex-1 flex-col px-4 pb-24 lg:px-6 lg:pb-10",
          mainClassName,
        )}
      >
        {children}
      </main>
      {footer ? (
        <div className="sticky bottom-16 z-[calc(var(--z-nav)-1)] border-t border-[var(--border-subtle)] bg-blanco shadow-[0_-2px_8px_rgba(23,25,15,.06)] lg:static lg:shadow-none">
          <div className="mx-auto max-w-[var(--page-max)] px-4 py-3 lg:px-6">
            {footer}
          </div>
        </div>
      ) : null}
      <PortalNav variant="bottom" />
    </div>
  );
}
