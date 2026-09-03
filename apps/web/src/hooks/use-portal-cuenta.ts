"use client";

import { useQuery } from "@tanstack/react-query";
import type { PortalCuenta } from "@misupertostada/shared";
import { api } from "@/lib/api";
import { usePortalSession } from "@/components/portal/portal-session";

export function usePortalCuenta() {
  const { token, sesion } = usePortalSession();
  return useQuery({
    queryKey: ["portal", token, "cuenta"],
    queryFn: () => api<PortalCuenta>(`/p/${encodeURIComponent(token)}/cuenta`),
    initialData: sesion.cuenta,
  });
}
