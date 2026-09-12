"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Button, Card } from "@heroui/react";
import {
  formatearFechaLarga,
  PAGO_METODO_ETIQUETA,
  type PortalPedidoDetalleCliente,
  type PortalPedidoDetalleFactura,
} from "@misupertostada/shared";
import { api } from "@/lib/api";
import { origenPedidoLabel } from "@/lib/portal-vista";
import { usePortalSession } from "@/components/portal/portal-session";
import { PortalBackButton } from "@/components/portal/portal-back-button";
import { EstadoBadge } from "@/components/domain/estado-badge";
import { Money } from "@/components/domain/money";
import { PedidoItemRow } from "@/components/domain/pedido-item-row";
import { NumeroDtePortal } from "@/components/portal/numero-dte";
import { Skeleton } from "@/components/ui/skeleton";
import { PortalErrorAviso } from "@/components/portal/portal-error-estado";
import { avancePagoFactura } from "@/lib/portal-cuenta-vista";

export default function PortalPedidoDetallePage({
  params,
}: {
  params: Promise<{ token: string; id: string }>;
}) {
  const { id } = use(params);
  const { token, assetPath } = usePortalSession();
  const base = `/p/${encodeURIComponent(token)}`;

  const detalle = useQuery({
    queryKey: ["portal", token, "pedidos", id],
    queryFn: () =>
      api<PortalPedidoDetalleCliente>(
        `/p/${encodeURIComponent(token)}/pedidos/${id}`,
      ),
  });

  return (
      <div className="grid gap-4 py-4">
        <PortalBackButton href={`${base}/pedidos`} label="Sus pedidos" />

        {detalle.isPending ? (
          <div className="grid gap-3">
            <Skeleton className="h-28 w-full rounded-tarjeta" />
            <Skeleton className="h-44 w-full rounded-tarjeta" />
          </div>
        ) : detalle.isError ? (
          <PortalErrorAviso
            error={detalle.error}
            titulo="No pudimos abrir ese pedido"
            reintentando={detalle.isFetching}
            onReintentar={() => void detalle.refetch()}
          />
        ) : detalle.data ? (
          <DetalleBody
            data={detalle.data}
            assetPath={assetPath}
            facturasHref={`${base}/cuenta/facturas`}
            transferenciaHref={`${base}/cuenta/transferencia`}
          />
        ) : null}
      </div>
  );
}

function DetalleBody({
  data,
  assetPath,
  facturasHref,
  transferenciaHref,
}: {
  data: PortalPedidoDetalleCliente;
  assetPath: (id: string) => string;
  facturasHref: string;
  transferenciaHref: string;
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
        <FacturaDelPedido
          factura={data.factura}
          facturasHref={facturasHref}
          transferenciaHref={transferenciaHref}
          onIr={(href) => router.push(href)}
        />
      ) : null}
    </>
  );
}

/**
 * El estado de cuenta de este pedido: cuánto se facturó, cuánto se ha abonado
 * y —lo que el cliente vino a ver— cuánto falta. Antes solo mostraba el DTE y
 * el saldo, sin decir de dónde salía ese número.
 */
function FacturaDelPedido({
  factura,
  facturasHref,
  transferenciaHref,
  onIr,
}: {
  factura: PortalPedidoDetalleFactura;
  facturasHref: string;
  transferenciaHref: string;
  onIr: (href: string) => void;
}) {
  const avance = avancePagoFactura(factura);
  const pagada = factura.estado === "PAGADO";

  return (
    <Card className="gap-3 p-5">
      <Card.Header className="gap-1">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <Card.Title>Factura</Card.Title>
          <EstadoBadge estado={factura.estado} size="sm" />
        </div>
        <Card.Description>
          <NumeroDtePortal numeroDte={factura.numeroDte} />
        </Card.Description>
      </Card.Header>

      <Card.Content className="grid gap-3">
        <dl className="grid gap-1.5 text-sm">
          <div className="flex min-w-0 items-baseline justify-between gap-2">
            <dt className="shrink-0 text-tinta-600">Facturado</dt>
            <dd>
              <Money centavos={factura.montoCentavos} tone="muted" truncate />
            </dd>
          </div>
          <div className="flex min-w-0 items-baseline justify-between gap-2">
            <dt className="shrink-0 text-tinta-600">Abonado</dt>
            <dd>
              <Money centavos={factura.abonadoCentavos} tone="pagado" truncate />
            </dd>
          </div>
          <div className="flex min-w-0 items-baseline justify-between gap-2 border-t border-[var(--border-subtle)] pt-1.5">
            <dt className="mst-label shrink-0">Falta por pagar</dt>
            <dd>
              <Money
                centavos={avance.faltaCentavos}
                tone={
                  pagada
                    ? "pagado"
                    : factura.estado === "VENCIDO"
                      ? "vencido"
                      : "pendiente"
                }
                className="text-[17px]"
                truncate
              />
            </dd>
          </div>
        </dl>

        {/* El avance se dice con texto además del color: la barra sola no es
            información accesible. */}
        <div className="grid gap-1">
          <div
            className="h-2 w-full overflow-hidden rounded-pill bg-[var(--green-100)]"
            role="img"
            aria-label={avance.etiqueta}
          >
            <div
              className="h-full rounded-pill bg-[var(--green-600)] transition-all duration-300"
              style={{ width: `${avance.porcentaje}%` }}
            />
          </div>
          <p className="text-xs text-tinta-500">
            {avance.etiqueta}
            {factura.antiguedadDias > 0 ? (
              <>
                {" · "}
                <span className="tabular-nums">
                  {factura.antiguedadDias}{" "}
                  {factura.antiguedadDias === 1 ? "día" : "días"}
                </span>
              </>
            ) : null}
          </p>
        </div>

        {factura.abonos.length > 0 ? (
          <div className="grid gap-1 rounded-campo bg-tinta-50 px-3 py-2">
            <p className="mst-label">Abonos aplicados</p>
            <ul className="grid gap-1">
              {factura.abonos.map((ab) => (
                <li
                  key={`${ab.abonoId}-${ab.fecha}-${ab.montoCentavos}`}
                  className="flex min-w-0 items-baseline justify-between gap-2 text-xs text-tinta-600"
                >
                  <span className="min-w-0 truncate">
                    {PAGO_METODO_ETIQUETA[ab.metodo]} · {ab.fecha}
                  </span>
                  <Money centavos={ab.montoCentavos} tone="muted" truncate />
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </Card.Content>

      <Card.Footer className="flex flex-wrap gap-2">
        <Button size="md" variant="secondary" onPress={() => onIr(facturasHref)}>
          Ver mi cuenta
        </Button>
        {/* Un solo amarillo por pantalla: esta va secundaria a propósito. */}
        {!pagada ? (
          <Button
            size="md"
            variant="secondary"
            onPress={() => onIr(transferenciaHref)}
          >
            Reportar transferencia
          </Button>
        ) : null}
      </Card.Footer>
    </Card>
  );
}
