"use client";

import { useQuery } from "@tanstack/react-query";
import type { PortalCuenta } from "@misupertostada/shared";
import { api, ApiError } from "@/lib/api";
import { usePortalSession } from "@/components/portal/portal-session";
import { PortalShell } from "@/components/portal/portal-shell";
import { ContadorFacturas } from "@/components/domain/contador-facturas";
import { EstadoBadge } from "@/components/domain/estado-badge";
import { Money } from "@/components/domain/money";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Receipt } from "lucide-react";

export default function PortalCuentaPage() {
  const { token, sesion } = usePortalSession();

  const cuenta = useQuery({
    queryKey: ["portal", token, "cuenta"],
    queryFn: () =>
      api<PortalCuenta>(`/p/${encodeURIComponent(token)}/cuenta`),
    initialData: sesion.cuenta,
  });

  const data = cuenta.data ?? sesion.cuenta;

  return (
    <PortalShell clienteNombre={sesion.cliente.nombre}>
      <div className="grid gap-4 py-4">
        <div>
          <h1 className="text-xl font-semibold text-tinta-900">Su cuenta</h1>
          <p className="mt-1 text-sm text-tinta-500">
            Facturas pendientes. Solo informativo.
          </p>
        </div>

        {cuenta.isPending && !cuenta.data ? (
          <Skeleton className="h-20 w-full" />
        ) : cuenta.error instanceof ApiError ? (
          <EmptyState
            title="No se pudo cargar la cuenta"
            description={cuenta.error.message}
          />
        ) : (
          <>
            <ContadorFacturas
              pendientes={data.facturasPendientes}
              limite={data.limiteFacturasPendientes}
              montoCentavos={data.saldoCentavos}
            />

            <Card flush title="Facturas abiertas">
              {data.facturas.length === 0 ? (
                <EmptyState
                  icon={<Receipt size={20} aria-hidden />}
                  title="No tiene facturas pendientes."
                  description="Cuando haya saldo, lo verá aquí."
                />
              ) : (
                <ul>
                  {data.facturas.map((f) => (
                    <li
                      key={f.id}
                      className="flex flex-wrap items-center gap-2 border-b border-[var(--border-subtle)] px-4 py-3 last:border-b-0"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-mono text-xs text-tinta-500">
                          {f.numeroDte ?? "Sin DTE"}
                        </p>
                        <p className="text-sm text-tinta-500">
                          {f.antiguedadDias}{" "}
                          {f.antiguedadDias === 1 ? "día" : "días"}
                        </p>
                      </div>
                      <EstadoBadge estado={f.estado} size="sm" />
                      {!f.numeroDte ? (
                        <Badge tone="amber">Por facturar</Badge>
                      ) : null}
                      <div className="w-full text-right sm:w-auto">
                        <Money
                          centavos={f.saldoCentavos}
                          tone={
                            f.estado === "VENCIDO"
                              ? "vencido"
                              : f.estado === "ABONO_PARCIAL"
                                ? "pendiente"
                                : "default"
                          }
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <p className="text-center text-sm text-tinta-500">
              El pago se registra con el repartidor o por transferencia. Este
              portal no cobra.
            </p>
          </>
        )}
      </div>
    </PortalShell>
  );
}
