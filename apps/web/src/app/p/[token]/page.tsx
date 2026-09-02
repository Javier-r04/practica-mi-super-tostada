"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Alert, Button, Card } from "@heroui/react";
import { ChevronRight } from "lucide-react";
import {
  formatearFechaLarga,
  type PortalPedido,
  type PortalPedidoResumen,
} from "@misupertostada/shared";
import {
  avisoLimiteCredito,
  cierreAnticipadoVentana,
  ctaInicio,
  ctaInicioSecundaria,
  entregaCopy,
  copyProximaApertura,
  propsVentanaCountdown,
  propsVentanaPedido,
  saludoCopy,
} from "@/lib/portal-vista";
import { usePortalSession } from "@/components/portal/portal-session";
import { PortalShell } from "@/components/portal/portal-shell";
import { PortalPedidoChip } from "@/components/portal/portal-pedido-chip";
import { VentanaCountdown } from "@/components/portal/ventana-countdown";
import { VentanaBadge } from "@/components/domain/ventana-badge";
import { EstadoBadge } from "@/components/domain/estado-badge";
import { Money } from "@/components/domain/money";
import { cn } from "@/lib/utils";

export default function PortalInicioPage() {
  const router = useRouter();
  const { token, sesion } = usePortalSession();
  const base = `/p/${encodeURIComponent(token)}`;
  const abierta = sesion.ventana.abierta;
  const cierreAnticipado = cierreAnticipadoVentana(sesion.ventana);
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
        {/* Encabezado de marca: saludo, estado de la ventana y —lo que decide
            el día— cuánto falta para que cierre el pedido. */}
        <Card
          className="min-w-0 gap-3 border-[var(--green-900)] bg-[var(--surface-brand)] p-5 text-[var(--text-on-brand)] shadow-[var(--shadow-md)]"
        >
          <h1 className="min-w-0 text-balance font-display text-2xl leading-tight text-acento">
            {saludoCopy(sesion.saludo, sesion.cliente.nombre)}
          </h1>
          <VentanaBadge {...propsVentanaPedido(sesion.ventana)} />
          {abierta ? (
            <VentanaCountdown {...propsVentanaCountdown(sesion.ventana)} />
          ) : null}
          <p className="text-sm leading-relaxed text-[var(--green-100)]">
            {cierreAnticipado ? (
              <>
                {entregaCopy(sesion)} El día ya cerró.{" "}
                {copyProximaApertura(sesion.ventana.proximaAperturaAt)}
              </>
            ) : abierta ? (
              entregaCopy(sesion)
            ) : (
              <>
                La ventana de pedido está cerrada.{" "}
                {copyProximaApertura(sesion.ventana.proximaAperturaAt)}
              </>
            )}
          </p>
        </Card>

        {/* La acción principal va antes que las losetas: el cliente entra a
            pedir, no a leer su historial. */}
        <div className="grid gap-2">
          <Button
            fullWidth
            size="lg"
            variant="primary"
            className={cta.kind === "pedidos" ? "button--accent" : undefined}
            onPress={() => router.push(hrefCta)}
          >
            <span className="inline-flex flex-wrap items-center justify-center gap-2">
              <span>{cta.label}</span>
              {cta.kind === "editar" && sesion.pedidoAbierto ? (
                <PortalPedidoChip pedido={sesion.pedidoAbierto} tono="oscuro" />
              ) : null}
            </span>
          </Button>
          {ctaSec ? (
            <Button
              fullWidth
              size="lg"
              variant="secondary"
              onPress={() => router.push(`${base}/pedir`)}
            >
              {ctaSec.label}
            </Button>
          ) : null}
        </div>

        {aviso ? (
          <Alert status="warning">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>Facturas pendientes</Alert.Title>
              <Alert.Description>{aviso}</Alert.Description>
            </Alert.Content>
          </Alert>
        ) : null}

        <div className="grid min-w-0 gap-3 sm:grid-cols-3 [&>*]:min-w-0">
          <LosetaPedidoEstaNoche
            pedido={sesion.pedidoAbierto}
            abierta={abierta}
            href={`${base}/pedir`}
          />
          <LosetaCuenta
            pendientes={sesion.cuenta.facturasPendientes}
            saldoCentavos={sesion.cuenta.saldoCentavos}
            destacado={aviso != null}
            href={`${base}/cuenta`}
          />
          <LosetaUltimoPedido pedido={sesion.ultimoPedido} hrefBase={base} />
        </div>
      </div>
    </PortalShell>
  );
}

function Loseta({
  etiqueta,
  href,
  children,
}: {
  etiqueta: string;
  href?: string;
  children: ReactNode;
}) {
  const cuerpo = (
    <Card
      className={cn(
        "h-full min-w-0 gap-2 p-4",
        href &&
          "transition-shadow duration-control ease-out group-hover:shadow-[var(--shadow-md)]",
      )}
    >
      <p className="flex items-center justify-between gap-2 mst-label">
        <span>{etiqueta}</span>
        {href ? (
          <ChevronRight size={16} className="text-tinta-400" aria-hidden />
        ) : null}
      </p>
      {children}
    </Card>
  );

  if (!href) return cuerpo;
  return (
    <Link
      href={href}
      className="group block rounded-tarjeta text-inherit no-underline hover:text-inherit hover:no-underline focus-visible:outline-none focus-visible:shadow-foco"
    >
      {cuerpo}
    </Link>
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
    <Loseta etiqueta="Pedido de esta noche" href={href}>
      {pedido ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-sm font-semibold text-tinta-900">
            #{pedido.correlativo}
          </span>
          <EstadoBadge estado={pedido.estado} size="sm" />
        </div>
      ) : (
        <p className="text-sm text-tinta-600">
          {abierta ? "Aún no ha pedido." : "La ventana ya cerró."}
        </p>
      )}
    </Loseta>
  );
}

function LosetaCuenta({
  pendientes,
  saldoCentavos,
  destacado,
  href,
}: {
  pendientes: number;
  saldoCentavos: number;
  destacado?: boolean;
  href: string;
}) {
  return (
    <Loseta etiqueta="Estado de cuenta" href={href}>
      {pendientes === 0 ? (
        <p className="text-sm text-tinta-600">Sin facturas pendientes.</p>
      ) : (
        <div className="grid gap-1">
          <p className="text-sm leading-snug">
            <span
              className={cn(
                "text-[22px] font-semibold leading-none tabular-nums",
                destacado ? "text-aviso-700" : "text-tinta-900",
              )}
            >
              {pendientes}
            </span>{" "}
            <span className="text-tinta-900">
              {pendientes === 1 ? "factura pendiente" : "facturas pendientes"}
            </span>
          </p>
          <p className="min-w-0 text-sm text-tinta-600">
            <Money
              centavos={saldoCentavos}
              tone={saldoCentavos > 0 ? "pendiente" : "default"}
              truncate
            />{" "}
            por pagar
          </p>
        </div>
      )}
    </Loseta>
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
      <Loseta etiqueta="Último pedido">
        <p className="text-sm text-tinta-600">Aún no hay historial.</p>
      </Loseta>
    );
  }
  return (
    <Loseta etiqueta="Último pedido" href={`${hrefBase}/pedidos/${pedido.id}`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-sm font-semibold text-tinta-900">
          #{pedido.correlativo}
        </span>
        <EstadoBadge estado={pedido.estado} size="sm" />
      </div>
      <p className="text-xs tabular-nums text-tinta-500">
        {formatearFechaLarga(pedido.fechaEntrega)}
      </p>
    </Loseta>
  );
}
