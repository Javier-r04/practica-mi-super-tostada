import { Wordmark } from "@/components/brand/wordmark";
import type { ReactNode } from "react";

export function PortalShell({
  clienteNombre,
  children,
  footer,
}: {
  clienteNombre: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-[430px] flex-col bg-[var(--surface-page)]">
      <header className="flex h-14 items-center justify-between gap-3 bg-[var(--surface-brand)] px-4">
        <Wordmark compact onBrand />
        <p className="min-w-0 truncate text-sm font-semibold text-blanco">
          {clienteNombre}
        </p>
      </header>
      <main className="flex min-h-0 flex-1 flex-col">{children}</main>
      {footer}
    </div>
  );
}
