"use client";

import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { Money } from "@/components/domain/money";
import { EstadoBadge } from "@/components/domain/estado-badge";
import { PedidoItemRow } from "@/components/domain/pedido-item-row";
import { PortalShell } from "@/components/portal/portal-shell";
import { usePortalSession } from "@/components/portal/portal-session";
import { origenPedidoLabel } from "@/lib/portal-vista";
import { api, ApiError } from "@/lib/api";
import {
  formatearFechaLarga,
  type PortalPedidoDetalleCliente,
} from "@misupertostada/shared";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { use } from "react";

export default function PortalPedidoDetallePage({
  params,
}: {
  params: Promise<{ token: string; id: string }>;
}) {
  const { id } = use(params);
  const { token, sesion, assetPath } = usePortalSession();
  const base = `/p/${encodeURIComponent(token)}`;

  const detalle = useQuery({
    queryKey: ["portal", token, "pedidos", id],
    queryFn: () =>
      api<PortalPedidoDetalleCliente>(
        `/p/${encodeURIComponent(token)}/pedidos/${id}`,
      ),
  });

  return (
    <PortalShell clienteNombre={sesion.cliente.nombre}>
      <div className="grid gap-4 py-4">
        <div>
          <Link
            href={`${base}/pedidos`}
            className="text-sm font-semibold text-marca no-underline hover:underline"
          >
            ← Pedidos
          </Link>
        </div>

        {detalle.isPending ? (
          <div className="grid gap-3">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : detalle.error instanceof ApiError ? (
          <EmptyState
            title="No encontramos ese pedido."
            description="Puede que el enlace no sea válido. Vuelva al historial."
          />
        ) : detalle.data ? (
          <DetalleBody
            data={detalle.data}
            assetPath={assetPath}
            cuentaHref={`${base}/cuenta`}
          />
        ) : null}
      </div>
    </PortalShell>
  );
}

function DetalleBody({
  data,
  assetPath,
  cuentaHref,
}: {
  data: PortalPedidoDetalleCliente;
  assetPath: (id: string) => string;
  cuentaHref: string;
}) {
  return (
    <>
      <Card>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="font-mono text-lg font-semibold text-tinta-900">
            #{data.correlativo}
          </h1>
          <EstadoBadge estado={data.estado} />
        </div>
        <p className="mt-2 text-sm text-tinta-500">
          {formatearFechaLarga(data.fechaOperacion)} ·{" "}
          {origenPedidoLabel(data.origen)}
        </p>
        <div className="mt-3 flex items-baseline justify-between border-t border-[var(--border-subtle)] pt-3">
          <span className="mst-label">Total</span>
          <Money centavos={data.totalCentavos} />
        </div>
      </Card>

      <Card flush title="Ítems">
        {data.items.map((item) => (
          <PedidoItemRow
            key={`${item.productoId}-${item.nombreMostrado}`}
            nombreMostrado={item.nombreMostrado}
            unidadMedida={item.unidadMedida}
            cantidad={item.cantidad}
            precioUnitarioCentavos={item.precioUnitarioCentavos}
            fotoAssetId={item.fotoAssetId}
            fotoSrcPath={
              item.fotoAssetId ? assetPath(item.fotoAssetId) : undefined
            }
          />
        ))}
      </Card>

      {data.factura ? (
        <Card title="Factura">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm text-tinta-500">
              {data.factura.numeroDte ?? "Sin DTE"}
            </span>
            <EstadoBadge estado={data.factura.estado} size="sm" />
            <Money
              centavos={data.factura.saldoCentavos}
              tone={
                data.factura.estado === "VENCIDO"
                  ? "vencido"
                  : data.factura.estado === "ABONO_PARCIAL"
                    ? "pendiente"
                    : "default"
              }
            />
          </div>
          <Link
            href={cuentaHref}
            className="mt-3 inline-flex h-campo items-center justify-center rounded-pill border border-[var(--border-default)] bg-blanco px-4 text-[15px] font-semibold text-tinta-900 no-underline shadow-[var(--shadow-xs)] hover:bg-tinta-50 hover:text-tinta-900 hover:no-underline"
          >
            Ver cuenta
          </Link>
        </Card>
      ) : null}
    </>
  );
}
