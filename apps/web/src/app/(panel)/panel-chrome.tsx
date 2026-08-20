"use client";

import { useEffect, type ReactNode } from "react";
import { Providers } from "@/components/providers";
import { ColaOfflineProvider } from "@/hooks/use-cola-offline";
import { registerServiceWorker } from "@/lib/sw-register";

export function PanelChrome({ children }: { children: ReactNode }) {
  useEffect(() => {
    registerServiceWorker();
  }, []);
  return (
    <Providers>
      <ColaOfflineProvider>{children}</ColaOfflineProvider>
    </Providers>
  );
}
