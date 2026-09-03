"use client";

import { use } from "react";
import type { ReactNode } from "react";
import { Providers } from "@/components/providers";
import { PortalSessionProvider } from "@/components/portal/portal-session";
import { PortalShell } from "@/components/portal/portal-shell";
import { Skeleton } from "@/components/ui/skeleton";

export default function PortalTokenLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  if (!token) {
    return (
      <div className="grid min-h-[100dvh] place-items-center bg-[var(--surface-page)]">
        <Skeleton className="h-10 w-40" />
      </div>
    );
  }
  return (
    <Providers>
      <PortalSessionProvider token={token}>
        <PortalShell>{children}</PortalShell>
      </PortalSessionProvider>
    </Providers>
  );
}
