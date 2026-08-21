"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, type ReactNode } from "react";
import type { ActorPublico } from "@misupertostada/shared";
import { Providers } from "@/components/providers";
import { ColaOfflineProvider } from "@/hooks/use-cola-offline";
import { usePanelSse } from "@/hooks/use-panel-sse";
import { api } from "@/lib/api";
import { registerServiceWorker } from "@/lib/sw-register";

function PanelSseBridge() {
  const me = useQuery({
    queryKey: ["auth", "me"],
    queryFn: () => api<{ usuario: ActorPublico }>("/auth/me"),
  });
  usePanelSse(Boolean(me.data));
  return null;
}

export function PanelChrome({ children }: { children: ReactNode }) {
  useEffect(() => {
    registerServiceWorker();
  }, []);
  return (
    <Providers>
      <PanelSseBridge />
      <ColaOfflineProvider>{children}</ColaOfflineProvider>
    </Providers>
  );
}
