"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, type ReactNode } from "react";
import {
  tienePermiso,
  type ActorPublico,
  type CalendarioAhora,
  type CarteraResumen,
  type CierreResultado,
  type OperacionResumen,
  type PedidoBandeja,
} from "@misupertostada/shared";
import { api, ApiError } from "@/lib/api";
import { PanelShell } from "@/components/layout/panel-shell";
import { PageToolbar } from "@/components/layout/page-header";
import { usePedidosSse } from "@/hooks/use-pedidos-sse";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import { DialogoCierre } from "@/components/fulfillment/dialogo-cierre";
import { DialogoReabrir } from "@/components/fulfillment/dialogo-reabrir";
import { VentanaBadge } from "@/components/domain/ventana-badge";
import { ContadorFacturas } from "@/components/domain/contador-facturas";
import { Money } from "@/components/domain/money";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

function Metric({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex-1 rounded-tarjeta border border-[var(--border-subtle)] bg-blanco p-4 shadow-tarjeta">
      <div className="text-[12px] font-semibold uppercase tracking-[0.08em] text-tinta-500">
        {label}
      </div>
      <div className="mt-1.5 font-display text-3xl leading-none text-marca">
        {children}
      </div>
      {hint && <div className="mt-1 text-xs text-tinta-500">{hint}</div>}
    </div>
  );
}

function ChipRuta({
  label,
  valor,
}: {
  label: string;
  valor: number;
}) {
  return (
    <span className="inline-flex min-h-11 items-center gap-2 rounded-campo border border-[var(--border-subtle)] bg-blanco px-3 text-sm">
      <span className="text-[12px] font-semibold uppercase tracking-[0.08em] text-tinta-500">
        {label}
      </span>
      <span className="font-semibold tabular-nums text-tinta-900">{valor}</span>
    </span>
  );
}

function HoyInner() {
  const qc = useQueryClient();
  const router = useRouter();
  const sp = useSearchParams();
  const fechaQuery = sp.get("fechaOperacion") ?? "";
  const [cerrando, setCerrando] = useState(false);
  const [reabriendo, setReabriendo] = useState(false);
  const [errorReabrir, setErrorReabrir] = useState<string>();

  const me = useQuery({
    queryKey: ["auth", "me"],
    queryFn: () => api<{ usuario: ActorPublico }>("/auth/me"),
  });
  const calendario = useQuery({
    queryKey: ["calendario", "ahora"],
    queryFn: () => api<CalendarioAhora>("/calendario/ahora"),
    enabled: Boolean(me.data),
  });
  const operacion = useQuery({
    queryKey: ["operacion", fechaQuery],
    queryFn: () =>
      api<OperacionResumen>(
        `/operacion${fechaQuery ? `?fechaOperacion=${fechaQuery}` : ""}`,
      ),
    enabled: Boolean(me.data),
  });
  const fecha = operacion.data?.fechaOperacion ?? calendario.data?.fechaOperacion;
  const pedidos = useQuery({
    queryKey: ["pedidos", { fechaOperacion: fecha }],
    queryFn: () =>
      api<PedidoBandeja[]>(`/pedidos?fechaOperacion=${fecha}`),
    enabled: Boolean(fecha),
  });
  const cartera = useQuery({
    queryKey: ["cartera", "resumen"],
    queryFn: () => api<CarteraResumen>("/cartera/resumen"),
    enabled: Boolean(me.data),
  });
  usePedidosSse(Boolean(me.data));

  const puedeCerrar = tienePermiso(
    me.data?.usuario.permisos ?? [],
    "ventana.cerrar",
  );
  const puedeReabrir = tienePermiso(
    me.data?.usuario.permisos ?? [],
    "ventana.reabrir",
  );

  const cerrar = useMutation({
    mutationFn: () =>
      api<CierreResultado>("/operacion/cerrar", {
        method: "POST",
        body: JSON.stringify({
          fechaOperacion: operacion.data?.fechaOperacion,
        }),
      }),
    onSuccess: () => {
      setCerrando(false);
      void qc.invalidateQueries({ queryKey: ["operacion"] });
      void qc.invalidateQueries({ queryKey: ["hoja"] });
      void qc.invalidateQueries({ queryKey: ["pedidos"] });
      void qc.invalidateQueries({ queryKey: ["calendario"] });
    },
  });

  const reabrir = useMutation({
    mutationFn: (motivo: string) =>
      api("/operacion/reabrir", {
        method: "POST",
        body: JSON.stringify({
          motivo,
          fechaOperacion: operacion.data?.fechaOperacion,
        }),
      }),
    onSuccess: () => {
      setReabriendo(false);
      setErrorReabrir(undefined);
      void qc.invalidateQueries({ queryKey: ["operacion"] });
      void qc.invalidateQueries({ queryKey: ["hoja"] });
      void qc.invalidateQueries({ queryKey: ["pedidos"] });
      void qc.invalidateQueries({ queryKey: ["calendario"] });
    },
    onError: (err) => {
      setErrorReabrir(err instanceof ApiError ? err.message : "No se pudo reabrir");
    },
  });

  function elegirFecha(value: string) {
    if (!value) {
      router.replace("/hoy");
      return;
    }
    router.replace(`/hoy?fechaOperacion=${value}`);
  }

  const data = operacion.data;
  const cerrado = data?.diaEstado === "CERRADO";
  const reabierto = data?.diaEstado === "REABIERTO";
  const valorFecha =
    fechaQuery || data?.fechaOperacion || calendario.data?.fechaOperacion || "";

  return (
    <PanelShell title="Hoy">
      <div className="grid gap-4">
        <PageToolbar
          description="Esta noche: pedidos, monto con snapshot y quién aún no pide. El análisis de quincena vive en Tablero."
          actions={
            <Input
              id="hoy-fecha-operacion"
              label="Fecha de operación"
              type="date"
              value={valorFecha}
              onChange={(e) => elegirFecha(e.target.value)}
            />
          }
        />
        {operacion.isLoading && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
        )}
        {operacion.error && (
          <EmptyState
            title="No se pudo cargar la operación"
            description="Revise la conexión e intente de nuevo."
          />
        )}
        {data && (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Metric
                label="Pedidos capturados"
                hint={`${data.pedidosPortal} del portal · ${data.pedidosManual} manuales`}
              >
                {data.pedidosPortal + data.pedidosManual}
              </Metric>
              <Metric
                label="Monto de la noche"
                hint="Pedido × snapshot. Aún no es la factura."
              >
                <Money centavos={data.montoPedidosCentavos} />
              </Metric>
              <Metric
                label="Libras de tortilla"
                hint={calendario.data?.esSabado ? "Planta: todo · sábado" : "Tortilla No. 16 / 14 / 12"}
              >
                {data.librasTortilla}
              </Metric>
              <Metric
                label="Por cobrar"
                hint="Saldo de facturas de esta fecha de operación"
              >
                <Money
                  centavos={cartera.data?.porCobrarFechaOperacionCentavos ?? 0}
                />
              </Metric>
              <Metric
                label="Mensajes en outbox"
                hint={`${data.outboxError} fallidos · ${data.outboxPendientes} pendientes`}
              >
                {data.outboxPendientes + data.outboxEnviados + data.outboxError}
              </Metric>
            </div>

            <div className="flex flex-wrap gap-2">
              <ChipRuta label="Confirmados" valor={data.ruta.confirmados} />
              <ChipRuta label="En producción" valor={data.ruta.enProduccion} />
              <ChipRuta label="Entregados" valor={data.ruta.entregados} />
              <ChipRuta label="Anulados" valor={data.ruta.anulados} />
            </div>

            <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr] lg:items-start">
              <div className="grid gap-4">
              <Card
                title="Pedidos de la noche"
                subtitle={`Fecha de operación: ${data.fechaOperacion}`}
                flush
                actions={
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => router.push("/pedidos")}
                  >
                    Ver todos
                  </Button>
                }
              >
                {pedidos.isLoading && <Skeleton className="mx-4 mb-4 h-32" />}
                {pedidos.data && pedidos.data.length === 0 && (
                  <EmptyState
                    title="Todavía no hay pedidos"
                    description="La ventana abre a las 15:00. Los del portal y los de llamada aparecen aquí."
                  />
                )}
                {pedidos.data && pedidos.data.length > 0 && (
                  <div className="border-t border-[var(--border-subtle)]">
                    {pedidos.data.slice(0, 8).map((p) => (
                      <button
                        type="button"
                        key={p.id}
                        onClick={() => router.push("/pedidos")}
                        className="flex min-h-11 w-full items-center gap-3 border-b border-[var(--border-subtle)] px-4 py-3 text-left"
                      >
                        <span className="font-mono text-xs text-tinta-500">
                          #{p.correlativo}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                          {p.clienteNombre}
                        </span>
                        <Badge tone={p.origen === "PORTAL" ? "green" : "neutral"}>
                          {p.origen}
                        </Badge>
                      </button>
                    ))}
                  </div>
                )}
              </Card>

              <Card
                title="Aún no piden"
                subtitle="Activos sin pedido vivo en esta fecha de operación"
                flush
              >
                {data.clientesSinPedido.length === 0 ? (
                  <p className="px-5 pb-5 text-sm text-tinta-500">
                    Todos los activos ya pidieron
                  </p>
                ) : (
                  <ul>
                    {data.clientesSinPedido.map((c) => (
                      <li key={c.clienteId}>
                        <Link
                          href="/pedidos"
                          className="flex min-h-11 items-center px-4 text-sm font-semibold text-marca"
                        >
                          {c.nombre}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
              </div>

              <div className="grid gap-4">
              <Card
                title="Cierre de la ventana"
                subtitle="15:00 → 00:00 · America/Guatemala"
                tone="accent"
              >
                <div className="grid gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <VentanaBadge abierta={Boolean(calendario.data?.ventanaAbierta)} />
                    {reabierto && <Badge tone="amber">Reabierto</Badge>}
                    {cerrado && <Badge>Día cerrado</Badge>}
                  </div>
                  <p className="text-sm leading-relaxed text-pretty text-tinta-800">
                    Al cerrar se materializa la hoja de producción. El consolidado queda
                    listo para descargar y enviar por WhatsApp. Un solo paso.
                  </p>
                  <Button
                    variant="accent"
                    size="lg"
                    className="w-full"
                    disabled={cerrado || !puedeCerrar}
                    title={
                      !puedeCerrar
                        ? "Solo quien tiene ventana.cerrar puede cerrar"
                        : cerrado
                          ? "El día ya está cerrado"
                          : undefined
                    }
                    onClick={() => setCerrando(true)}
                  >
                    {cerrado
                      ? "Día cerrado · hoja generada"
                      : reabierto
                        ? "Cerrar de nuevo y generar v2"
                        : "Cerrar ventana y generar hoja"}
                  </Button>
                  {!puedeCerrar && (
                    <p className="text-xs text-tinta-500">
                      Solo ADMIN o ADMIN_JEFE cierra la ventana.
                    </p>
                  )}
                  {cerrado && (
                    <Button
                      variant="secondary"
                      className="w-full"
                      disabled={!puedeReabrir}
                      title={
                        puedeReabrir
                          ? undefined
                          : "Solo ADMIN_JEFE puede reabrir un día cerrado"
                      }
                      onClick={() => setReabriendo(true)}
                    >
                      Reabrir día
                    </Button>
                  )}
                  {cerrado && !puedeReabrir && (
                    <p className="text-xs text-tinta-500">
                      Solo ADMIN_JEFE puede reabrir un día cerrado.
                    </p>
                  )}
                  {cerrado && (
                    <Link
                      href="/produccion"
                      className={cn(
                        "text-center text-sm font-semibold text-marca underline-offset-2 hover:underline",
                      )}
                    >
                      Ver hoja de producción
                    </Link>
                  )}
                </div>
              </Card>

              <Card
                title="Clientes al límite"
                subtitle="Alerta, no bloquea entrega ni cobro"
                flush
              >
                {(cartera.data?.clientesSobreLimite.length ?? 0) === 0 ? (
                  <p className="px-5 pb-5 text-sm text-tinta-500">
                    Ningún cliente en el límite
                  </p>
                ) : (
                  <div className="grid gap-2 px-4 pb-4">
                    {cartera.data?.clientesSobreLimite.map((c) => (
                      <ContadorFacturas
                        key={c.clienteId}
                        pendientes={c.pendientes}
                        limite={c.limite}
                        etiqueta={c.nombre}
                      />
                    ))}
                  </div>
                )}
              </Card>
              </div>
            </div>
          </>
        )}
      </div>

      <DialogoCierre
        open={cerrando}
        resumen={data}
        loading={cerrar.isPending}
        onClose={() => setCerrando(false)}
        onConfirm={() => cerrar.mutate()}
      />
      <DialogoReabrir
        open={reabriendo}
        loading={reabrir.isPending}
        error={errorReabrir}
        onClose={() => setReabriendo(false)}
        onConfirm={(motivo) => reabrir.mutate(motivo)}
      />
    </PanelShell>
  );
}

export default function HoyPage() {
  return (
    <Suspense
      fallback={
        <PanelShell title="Hoy">
          <Skeleton className="h-48" />
        </PanelShell>
      }
    >
      <HoyInner />
    </Suspense>
  );
}
