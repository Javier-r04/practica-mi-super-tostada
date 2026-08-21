"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  formatearFechaLarga,
  type PortalPedido,
  type PortalPedidoResumen,
} from "@misupertostada/shared";
import {
  avisoLimiteCredito,
  ctaInicio,
  ctaInicioSecundaria,
  entregaCopy,
  copyProximaApertura,
  saludoCopy,
} from "@/lib/portal-vista";
import { usePortalSession } from "@/components/portal/portal-session";
import { PortalShell } from "@/components/portal/portal-shell";
import { VentanaCountdown } from "@/components/portal/ventana-countdown";
import { VentanaBadge } from "@/components/domain/ventana-badge";
import { EstadoBadge } from "@/components/domain/estado-badge";
import { Money } from "@/components/domain/money";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function PortalInicioPage() {
  const router = useRouter();
  const { token, sesion } = usePortalSession();
  const base = `/p/${encodeURIComponent(token)}`;
  const abierta = sesion.ventana.abierta;
  const cta = ctaInicio({
    abierta,
    pedidoAbierto: sesion.pedidoAbierto,
  });
  const ctaSec = ctaInicioSecundaria(abierta);
  const aviso = avisoLimiteCredito(sesion.cuenta);
  const hrefCta =
    cta.kind === "pedidos" ? `${base}/pedidos` : `${base}/pedir`;

  return (
    <PortalShell clienteNombre={sesion.cliente.nombre}>
      <div className="grid gap-4 py-4">
        <Card tone="brand">
          <div className="grid gap-3">
            <h1 className="font-display text-2xl leading-tight text-acento">
              {saludoCopy(sesion.saludo, sesion.cliente.nombre)}
            </h1>
            <div className="flex flex-wrap items-center gap-2">
              <VentanaBadge abierta={abierta} />
              {abierta ? (
                <VentanaCountdown cierraAt={sesion.ventana.cierraAt} />
              ) : null}
            </div>
            <p className="text-sm leading-relaxed text-[var(--green-100)]">
              {abierta ? (
                entregaCopy(sesion)
              ) : (
                <>
                  La ventana de pedido está cerrada.{" "}
                  {copyProximaApertura(sesion.ventana.proximaAperturaAt)}
                </>
              )}
            </p>
          </div>
        </Card>

        {aviso ? (
          <p className="rounded-campo bg-[var(--red-100)] px-4 py-3 text-sm text-peligro">
            {aviso}
          </p>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-3">
          <LosetaPedidoEstaNoche
            pedido={sesion.pedidoAbierto}
            abierta={abierta}
            href={`${base}/pedir`}
          />
          <LosetaCuenta
            pendientes={sesion.cuenta.facturasPendientes}
            limite={sesion.cuenta.limiteFacturasPendientes}
            saldoCentavos={sesion.cuenta.saldoCentavos}
            href={`${base}/cuenta`}
          />
          <LosetaUltimoPedido pedido={sesion.ultimoPedido} hrefBase={base} />
        </div>

        <div className="grid gap-2">
          <Button
            variant="accent"
            size="lg"
            className="w-full"
            onClick={() => router.push(hrefCta)}
          >
            {cta.label}
          </Button>
          {ctaSec ? (
            <Button
              variant="secondary"
              size="lg"
              className="w-full"
              onClick={() => router.push(`${base}/pedir`)}
            >
              {ctaSec.label}
            </Button>
          ) : null}
        </div>
      </div>
    </PortalShell>
  );
}

function LosetaPedidoEstaNoche({
  pedido,
  abierta,
  href,
}: {
  pedido: PortalPedido | null;
  abierta: boolean;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="block rounded-tarjeta border border-[var(--border-subtle)] bg-blanco p-4 text-inherit no-underline hover:bg-tinta-50 hover:text-inherit hover:no-underline"
    >
      <p className="mst-label">Pedido de esta noche</p>
      {pedido ? (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="font-mono text-sm font-semibold text-tinta-900">
            #{pedido.correlativo}
          </span>
          <EstadoBadge estado={pedido.estado} size="sm" />
        </div>
      ) : (
        <p className="mt-2 text-sm text-tinta-600">
          {abierta ? "Aún no ha pedido." : "La ventana ya cerró."}
        </p>
      )}
    </Link>
  );
}

function LosetaCuenta({
  pendientes,
  limite,
  saldoCentavos,
  href,
}: {
  pendientes: number;
  limite: number | null;
  saldoCentavos: number;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="block rounded-tarjeta border border-[var(--border-subtle)] bg-blanco p-4 text-inherit no-underline hover:bg-tinta-50 hover:text-inherit hover:no-underline"
    >
      <p className="mst-label">Cuenta</p>
      {pendientes === 0 ? (
        <p className="mt-2 text-sm text-tinta-600">Sin facturas pendientes.</p>
      ) : (
        <div className="mt-2 flex flex-wrap items-baseline gap-2">
          <span className="font-display text-2xl tabular-nums text-marca">
            {pendientes}
            {limite != null ? (
              <span className="text-sm text-tinta-500">/{limite}</span>
            ) : null}
          </span>
          <Money centavos={saldoCentavos} />
        </div>
      )}
    </Link>
  );
}

function LosetaUltimoPedido({
  pedido,
  hrefBase,
}: {
  pedido: PortalPedidoResumen | null;
  hrefBase: string;
}) {
  if (!pedido) {
    return (
      <div className="rounded-tarjeta border border-[var(--border-subtle)] bg-blanco p-4">
        <p className="mst-label">Último pedido</p>
        <p className="mt-2 text-sm text-tinta-600">Aún no hay historial.</p>
      </div>
    );
  }
  return (
    <Link
      href={`${hrefBase}/pedidos/${pedido.id}`}
      className="block rounded-tarjeta border border-[var(--border-subtle)] bg-blanco p-4 text-inherit no-underline hover:bg-tinta-50 hover:text-inherit hover:no-underline"
    >
      <p className="mst-label">Último pedido</p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span className="font-mono text-sm font-semibold text-tinta-900">
          #{pedido.correlativo}
        </span>
        <span className="text-xs tabular-nums text-tinta-500">
          {formatearFechaLarga(pedido.fechaOperacion)}
        </span>
        <EstadoBadge estado={pedido.estado} size="sm" />
      </div>
    </Link>
  );
}
