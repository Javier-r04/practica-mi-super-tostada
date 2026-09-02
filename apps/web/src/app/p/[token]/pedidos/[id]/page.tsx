"use client";

import Link from "next/link";
import { use } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Alert, Button, Card } from "@heroui/react";
import { ChevronLeft } from "lucide-react";
import {
  formatearFechaLarga,
  type PortalPedidoDetalleCliente,
} from "@misupertostada/shared";
import { api, ApiError } from "@/lib/api";
import { origenPedidoLabel } from "@/lib/portal-vista";
import { usePortalSession } from "@/components/portal/portal-session";
import { PortalShell } from "@/components/portal/portal-shell";
import { EstadoBadge } from "@/components/domain/estado-badge";
import { Money } from "@/components/domain/money";
import { PedidoItemRow } from "@/components/domain/pedido-item-row";
import { NumeroDtePortal } from "@/components/portal/numero-dte";
import { Skeleton } from "@/components/ui/skeleton";

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
        <Link
          href={`${base}/pedidos`}
          className="inline-flex min-h-11 w-fit items-center gap-1 text-sm font-semibold text-marca no-underline hover:underline focus-visible:outline-none focus-visible:shadow-foco"
        >
          <ChevronLeft size={18} aria-hidden />
          Sus pedidos
        </Link>

        {detalle.isPending ? (
          <div className="grid gap-3">
            <Skeleton className="h-28 w-full rounded-tarjeta" />
            <Skeleton className="h-44 w-full rounded-tarjeta" />
          </div>
        ) : detalle.error instanceof ApiError ? (
          <Alert status="danger">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>No encontramos ese pedido</Alert.Title>
              <Alert.Description>
                Puede que el enlace ya no sea válido. Vuelva a sus pedidos.
              </Alert.Description>
            </Alert.Content>
          </Alert>
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
  const router = useRouter();
  return (
    <>
      <Card className="gap-3 p-5">
        <Card.Header className="gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <Card.Title className="font-mono text-lg text-tinta-900">
              #{data.correlativo}
            </Card.Title>
            <EstadoBadge estado={data.estado} />
          </div>
          <Card.Description>
            {formatearFechaLarga(data.fechaEntrega)} ·{" "}
            {origenPedidoLabel(data.origen)}
          </Card.Description>
        </Card.Header>
        <Card.Content className="flex min-w-0 items-baseline justify-between gap-2 border-t border-[var(--border-subtle)] pt-3">
          <span className="mst-label shrink-0">Total</span>
          <Money centavos={data.totalCentavos} className="text-[17px]" truncate />
        </Card.Content>
      </Card>

      <section className="grid gap-2">
        <h2 className="px-1 mst-label">Lo que pidió</h2>
        <Card className="gap-0 overflow-hidden p-0">
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
      </section>

      {data.factura ? (
        <Card className="gap-3 p-5">
          <Card.Header className="gap-1">
            <Card.Title>Factura</Card.Title>
          </Card.Header>
          <Card.Content className="grid gap-2">
            <NumeroDtePortal numeroDte={data.factura.numeroDte} />
            <div className="flex min-w-0 flex-wrap items-center gap-2">
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
              truncate
            />
            </div>
          </Card.Content>
          <Card.Footer>
            <Button
              size="md"
              variant="secondary"
              onPress={() => router.push(cuentaHref)}
            >
              Ver mi cuenta
            </Button>
          </Card.Footer>
        </Card>
      ) : null}
    </>
  );
}
