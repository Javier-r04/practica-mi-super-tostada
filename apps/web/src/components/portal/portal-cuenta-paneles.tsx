"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Alert, Button, Card, Label, TextArea } from "@heroui/react";
import { ChevronRight, Receipt } from "lucide-react";
import { ComprobantePicker } from "@/components/receivables/comprobante-picker";
import {
  formatearFechaLarga,
  MENSAJE_ABONO_PENDIENTE,
  MENSAJE_DESCRIPCION_REQUERIDA,
  PAGO_METODO_ETIQUETA,
  quetzalesTextoACentavos,
  type PortalAbonoAplicacion,
  type PortalCuenta,
  type PortalFactura,
  type PortalFacturaFiltro,
} from "@misupertostada/shared";
import { api } from "@/lib/api";
import { toastError, toastPromise } from "@/lib/toast";
import { usePortalSession } from "@/components/portal/portal-session";
import { PortalBackButton } from "@/components/portal/portal-back-button";
import { EstadoBadge } from "@/components/domain/estado-badge";
import { Money } from "@/components/domain/money";
import { EmptyState } from "@/components/ui/empty-state";
import { ComprobanteAssetPreview } from "@/components/receivables/comprobante-asset-preview";
import { subirComprobanteAbonoPortal } from "@/lib/upload-asset";
import { usePortalCuenta } from "@/hooks/use-portal-cuenta";
import { hrefPedidoPortal, resumenAplicacion } from "@/lib/portal-cuenta-vista";
import { PortalErrorAviso } from "@/components/portal/portal-error-estado";

/**
 * La cuenta viaja dentro de la sesión (`initialData` en `usePortalCuenta`), así
 * que la query nunca está `pending` ni se queda sin datos. Lo que sí puede
 * fallar es el refresco de fondo: se avisa sin borrar lo que ya se ve, porque
 * un saldo de hace un minuto es mucho mejor que una pantalla vacía.
 */
export function PortalCuentaDesactualizada({
  cuenta,
}: {
  cuenta: ReturnType<typeof usePortalCuenta>;
}) {
  if (!cuenta.isError) return null;
  return (
    <PortalErrorAviso
      error={cuenta.error}
      titulo="No pudimos actualizar su cuenta"
      reintentando={cuenta.isFetching}
      onReintentar={() => void cuenta.refetch()}
    />
  );
}

/** Aviso de acumulación de facturas. Avisa, nunca bloquea. */
export function PortalAvisoCredito({ aviso }: { aviso: string | null }) {
  if (!aviso) return null;
  return (
    <Alert status="warning">
      <Alert.Indicator />
      <Alert.Content>
        <Alert.Title>Facturas pendientes</Alert.Title>
        <Alert.Description>{aviso}</Alert.Description>
      </Alert.Content>
    </Alert>
  );
}

export function PortalCuentaFrame({
  titulo,
  children,
}: {
  titulo: string;
  children: (data: PortalCuenta) => ReactNode;
}) {
  const { token, sesion } = usePortalSession();
  const cuenta = usePortalCuenta();
  const data = cuenta.data ?? sesion.cuenta;
  const base = `/p/${encodeURIComponent(token)}`;

  return (
      <div className="grid gap-4 py-4">
        <PortalBackButton href={`${base}/cuenta`} label="Cuenta" />
        <h1 className="text-xl font-semibold text-tinta-900">{titulo}</h1>
        <PortalCuentaDesactualizada cuenta={cuenta} />
        {children(data)}
      </div>
  );
}

function tonoSaldo(estado: PortalFactura["estado"]) {
  if (estado === "VENCIDO") return "vencido" as const;
  if (estado === "ABONO_PARCIAL") return "pendiente" as const;
  if (estado === "PAGADO") return "pagado" as const;
  return "default" as const;
}

/**
 * Cada factura lleva a su pedido. El DTE por sí solo no le dice nada al
 * cliente: identifica la factura ante el SAT, no la entrega. Por eso manda el
 * correlativo y la fecha, y el renglón entero es el enlace.
 */
export function PortalFacturasLista({
  items,
  filtro,
  vacio,
}: {
  items: readonly PortalFactura[];
  filtro: PortalFacturaFiltro;
  vacio?: ReactNode;
}) {
  const { token } = usePortalSession();

  if (items.length === 0) {
    return (
      <Card className="p-0">
        {vacio ?? (
          <EmptyState
            icon={<Receipt size={22} aria-hidden />}
            title={
              filtro === "pagadas"
                ? "Todavía no hay facturas saldadas."
                : "No tiene facturas pendientes."
            }
            description={
              filtro === "pagadas"
                ? "Cuando termine de pagar una factura, queda aquí para consulta."
                : "Cuando haya saldo, lo verá aquí."
            }
          />
        )}
      </Card>
    );
  }

  return (
    <Card className="gap-0 overflow-hidden p-0">
      <ul>
        {items.map((f) => (
          <li
            key={f.id}
            className="border-b border-[var(--border-subtle)] last:border-b-0"
          >
            <Link
              href={hrefPedidoPortal(token, f.pedidoId)}
              className="flex min-h-[60px] min-w-0 items-center gap-3 px-4 py-3 text-inherit no-underline transition-colors duration-control ease-out hover:bg-[var(--ink-50)] hover:text-inherit hover:no-underline focus-visible:outline-none focus-visible:shadow-foco"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-semibold text-tinta-900">
                  <span className="font-mono tabular-nums">#{f.correlativo}</span>
                  {" · "}
                  {formatearFechaLarga(f.fechaEntrega)}
                </span>
                <span className="block truncate text-xs text-tinta-500">
                  {f.numeroDte ? `DTE ${f.numeroDte}` : "Sin DTE"}
                  {" · "}
                  <span className="tabular-nums">
                    {f.antiguedadDias} {f.antiguedadDias === 1 ? "día" : "días"}
                  </span>
                </span>
              </span>
              <span className="grid min-w-0 shrink-0 justify-items-end gap-1">
                <Money
                  centavos={f.estado === "PAGADO" ? f.montoCentavos : f.saldoCentavos}
                  tone={tonoSaldo(f.estado)}
                  truncate
                />
                <EstadoBadge estado={f.estado} size="sm" />
              </span>
              <ChevronRight
                size={18}
                className="shrink-0 text-tinta-400"
                aria-hidden
              />
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}

/** Renglón de «aplicado a»: dos líneas para que el DTE no se recorte. */
function AplicacionFila({
  aplicacion,
  token,
}: {
  aplicacion: PortalAbonoAplicacion;
  token: string;
}) {
  const { titulo, detalle } = resumenAplicacion(aplicacion);
  return (
    <Link
      href={hrefPedidoPortal(token, aplicacion.pedidoId)}
      className="flex min-h-tap min-w-0 items-center gap-2 rounded-campo px-1 py-1 text-inherit no-underline transition-colors duration-control ease-out hover:bg-tinta-100 hover:text-inherit hover:no-underline focus-visible:outline-none focus-visible:shadow-foco"
    >
      <span className="min-w-0 flex-1">
        <span className="block truncate text-xs font-medium text-tinta-800">
          {titulo}
        </span>
        <span className="block truncate text-[11px] text-tinta-500">
          {detalle}
        </span>
      </span>
      <Money
        centavos={aplicacion.montoCentavos}
        tone="muted"
        truncate
        className="shrink-0"
      />
      <ChevronRight size={16} className="shrink-0 text-tinta-400" aria-hidden />
    </Link>
  );
}

export function PortalAbonosLista({ data }: { data: PortalCuenta }) {
  const { token } = usePortalSession();
  return (
    <div className="grid gap-3">
      {data.transferenciasEnRevisionCentavos > 0 ? (
        <Alert status="warning">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>Transferencias en revisión</Alert.Title>
            <Alert.Description>
              Tiene{" "}
              <Money
                centavos={data.transferenciasEnRevisionCentavos}
                tone="pendiente"
                truncate
              />{" "}
              en comprobantes que aún no confirma la fábrica. Su saldo no baja
              hasta entonces.
            </Alert.Description>
          </Alert.Content>
        </Alert>
      ) : null}
      <Card className="gap-0 overflow-hidden p-0">
        {data.abonos.length === 0 ? (
          <EmptyState
            title="Aún no hay abonos registrados"
            description="Los pagos en efectivo o cheque con el repartidor y las transferencias confirmadas aparecen aquí."
          />
        ) : (
          <ul>
            {data.abonos.map((a) => (
              <li
                key={a.id}
                className="grid gap-2 border-b border-[var(--border-subtle)] px-4 py-3 last:border-b-0"
              >
                {/* En el teléfono no caben método, fecha, estado y monto en un
                    solo renglón: el bloque de la derecha era `shrink-0` y
                    empujaba «Transferencia · 2026-08-21» a dos y tres líneas.
                    El monto se queda arriba a la derecha —es lo que se busca—
                    y el estado baja a su propia línea, donde puede envolver
                    sin aplastar a nadie. */}
                <div className="grid gap-1">
                  <div className="flex min-w-0 items-baseline justify-between gap-2">
                    <p className="min-w-0 truncate text-sm font-medium text-tinta-900">
                      {PAGO_METODO_ETIQUETA[a.metodo]} · {a.fecha}
                    </p>
                    <Money
                      centavos={a.montoCentavos}
                      truncate
                      className="shrink-0"
                    />
                  </div>
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <EstadoBadge dominio="abono" estado={a.estado} size="sm" />
                    {a.descripcion ? (
                      <p className="min-w-0 flex-1 text-pretty text-xs text-tinta-500">
                        {a.descripcion}
                      </p>
                    ) : null}
                  </div>
                </div>
                {a.estado === "PENDIENTE" ? (
                  <p className="text-xs text-tinta-500">{MENSAJE_ABONO_PENDIENTE}</p>
                ) : null}
                {a.estado === "RECHAZADO" && a.motivoRechazo ? (
                  <p className="text-xs text-[var(--estado-vencido-fg)]">
                    {a.motivoRechazo}
                  </p>
                ) : null}
                {a.comprobanteAssetId ? (
                  <ComprobanteAssetPreview
                    assetId={a.comprobanteAssetId}
                    alt={`Comprobante ${PAGO_METODO_ETIQUETA[a.metodo].toLowerCase()} del ${a.fecha}`}
                    srcPath={`/p/${encodeURIComponent(token)}/assets/${a.comprobanteAssetId}`}
                  />
                ) : null}
                {/* A dónde fue el dinero. El abono se reparte por FIFO entre
                    varias facturas, así que aquí es donde el cliente responde
                    «¿este pago a qué pedido fue?» — y por eso cada renglón
                    abre esa entrega. */}
                {a.aplicaciones.length > 0 ? (
                  <div className="grid gap-1 rounded-campo bg-tinta-50 px-2 py-1.5">
                    <p className="px-1 mst-label">Aplicado a</p>
                    <ul className="grid">
                      {a.aplicaciones.map((ap) => (
                        <li key={`${a.id}-${ap.facturaId}`}>
                          <AplicacionFila aplicacion={ap} token={token} />
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

export function PortalReportarTransferencia() {
  const { token } = usePortalSession();
  const qc = useQueryClient();
  const [monto, setMonto] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [archivo, setArchivo] = useState<File | null>(null);
  const [abonoId, setAbonoId] = useState<string | null>(null);

  const reportar = useMutation({
    mutationFn: async () => {
      if (!archivo || !abonoId) {
        throw new Error("Adjunte la foto de la transferencia");
      }
      const montoCentavos = quetzalesTextoACentavos(monto);
      const comprobanteAssetId = await subirComprobanteAbonoPortal(
        token,
        archivo,
        abonoId,
      );
      return api(`/p/${encodeURIComponent(token)}/abonos`, {
        method: "POST",
        body: JSON.stringify({
          id: abonoId,
          idempotencyKey: `portal-abono-${abonoId}`,
          montoCentavos,
          descripcion: descripcion.trim(),
          comprobanteAssetId,
        }),
      });
    },
    onSuccess: () => {
      setMonto("");
      setDescripcion("");
      setArchivo(null);
      setAbonoId(null);
      void qc.invalidateQueries({ queryKey: ["portal", token, "cuenta"] });
    },
  });

  function enviarComprobante() {
    if (!archivo || !abonoId) {
      toastError("Adjunte la foto de la transferencia");
      return;
    }
    if (!descripcion.trim()) {
      toastError(MENSAJE_DESCRIPCION_REQUERIDA);
      return;
    }
    try {
      quetzalesTextoACentavos(monto);
    } catch (err) {
      toastError(err instanceof Error ? err.message : "Monto inválido");
      return;
    }

    void toastPromise(reportar.mutateAsync(), {
      loading: "Enviando comprobante",
      loadingDescription: "Subiendo la imagen y registrando su transferencia…",
      success: "Comprobante recibido",
      successDescription: MENSAJE_ABONO_PENDIENTE,
      error: "No se pudo enviar el comprobante",
    });
  }

  return (
    <section className="grid gap-3 rounded-tarjeta border border-[var(--border-subtle)] bg-blanco p-4 sm:p-5">
      <p className="text-sm text-tinta-500">
        Suba el comprobante y una nota. Queda en revisión hasta que la fábrica
        confirme el depósito.
      </p>
      <div className="grid gap-1.5">
        <Label htmlFor="monto-transferencia">Monto transferido</Label>
        <input
          className="w-full rounded-campo border border-[var(--border-default)] px-3 py-2.5 text-sm tabular-nums"
          id="monto-transferencia"
          inputMode="decimal"
          placeholder="0.00"
          value={monto}
          onChange={(e) => setMonto(e.target.value)}
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="desc-transferencia">Descripción</Label>
        <TextArea
          id="desc-transferencia"
          placeholder="Banco, referencia, fecha del depósito…"
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
        />
      </div>
      <ComprobantePicker
        label="Comprobante de transferencia"
        hint="JPEG, PNG o WebP. Obligatorio."
        selectorOrigen
        value={archivo}
        onChange={(file) => {
          setArchivo(file);
          setAbonoId(file ? crypto.randomUUID() : null);
        }}
      />
      <Button
        className="button--accent min-h-11"
        isPending={reportar.isPending}
        variant="primary"
        onPress={enviarComprobante}
      >
        Enviar comprobante
      </Button>
    </section>
  );
}
