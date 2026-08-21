"use client";

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, startTransition, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  horaEnZona,
  tienePermiso,
  type ActorPublico,
  type CalendarioAhora,
  type CarteraResumen,
  type CierreResultado,
  type ClientePublico,
  type OperacionResumen,
  type PedidoBandeja,
  type PedidoEstado,
} from "@misupertostada/shared";
import { api, ApiError } from "@/lib/api";
import { buildPedidosHref } from "@/lib/pedido-vista";
import {
  hrefClienteSinPedido,
  hrefLimiteCredito,
  hrefPedidoNoche,
  mapaFotoCliente,
  recortarPedidosNoche,
} from "@/lib/hoy-vista";
import { toastFromError } from "@/lib/toast";
import { PanelShell } from "@/components/layout/panel-shell";
import { PageToolbar } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { DateField } from "@/components/ui/date-field";
import { Skeleton } from "@/components/ui/skeleton";
import { DialogoCierre } from "@/components/fulfillment/dialogo-cierre";
import { DialogoReabrir } from "@/components/fulfillment/dialogo-reabrir";
import { VentanaBadge } from "@/components/domain/ventana-badge";
import { ContadorFacturas } from "@/components/domain/contador-facturas";
import { ClienteAvatar } from "@/components/catalog/cliente-avatar";
import { EstadoBadge } from "@/components/domain/estado-badge";
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
      <div className="mst-label">{label}</div>
      <div className="mt-1.5 font-display text-3xl leading-none tabular-nums text-marca">
        {children}
      </div>
      {hint ? <div className="mt-1 text-xs text-tinta-500">{hint}</div> : null}
    </div>
  );
}

function ChipRuta({ estado, valor }: { estado: PedidoEstado; valor: number }) {
  return (
    <span className="inline-flex min-h-11 items-center gap-2 rounded-campo border border-[var(--border-subtle)] bg-blanco px-3 text-sm">
      <EstadoBadge estado={estado} size="sm" />
      <span className="font-semibold tabular-nums text-tinta-900">{valor}</span>
    </span>
  );
}

function HoyInner() {
  const qc = useQueryClient();
  const router = useRouter();
  const sp = useSearchParams();
  const fechaFromUrl = sp.get("fechaOperacion") ?? "";
  const [fechaLocal, setFechaLocal] = useState(fechaFromUrl);
  const [cerrando, setCerrando] = useState(false);
  const [reabriendo, setReabriendo] = useState(false);
  const [errorReabrir, setErrorReabrir] = useState<string>();

  useEffect(() => {
    setFechaLocal(fechaFromUrl);
  }, [fechaFromUrl]);

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
    queryKey: ["operacion", fechaLocal],
    queryFn: () =>
      api<OperacionResumen>(
        `/operacion${fechaLocal ? `?fechaOperacion=${fechaLocal}` : ""}`,
      ),
    enabled: Boolean(me.data),
    placeholderData: keepPreviousData,
  });
  const fecha = operacion.isPlaceholderData
    ? fechaLocal || calendario.data?.fechaOperacion
    : (operacion.data?.fechaOperacion ?? calendario.data?.fechaOperacion);
  const pedidos = useQuery({
    queryKey: ["pedidos", { fechaOperacion: fecha }],
    queryFn: () =>
      api<PedidoBandeja[]>(`/pedidos?fechaOperacion=${fecha}`),
    enabled: Boolean(fecha),
    placeholderData: keepPreviousData,
  });
  const clientes = useQuery({
    queryKey: ["clientes"],
    queryFn: () => api<ClientePublico[]>("/clientes"),
    enabled: Boolean(me.data),
  });
  const cartera = useQuery({
    queryKey: ["cartera", "resumen"],
    queryFn: () => api<CarteraResumen>("/cartera/resumen"),
    enabled: Boolean(me.data),
  });

  const fotoPorCliente = useMemo(
    () => mapaFotoCliente(clientes.data ?? []),
    [clientes.data],
  );
  const listaNoche = useMemo(
    () => recortarPedidosNoche(pedidos.data ?? []),
    [pedidos.data],
  );

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
    onError: (err) => toastFromError(err, "No se pudo cerrar la ventana"),
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

  useEffect(() => {
    if (operacion.error) {
      toastFromError(operacion.error, "No se pudo cargar la operación");
    }
  }, [operacion.error]);

  function elegirFecha(value: string) {
    setFechaLocal(value);
    startTransition(() => {
      if (!value) {
        router.replace("/hoy", { scroll: false });
        return;
      }
      router.replace(`/hoy?fechaOperacion=${value}`, { scroll: false });
    });
  }

  const data = operacion.data;
  const cerrado = data?.diaEstado === "CERRADO";
  const reabierto = data?.diaEstado === "REABIERTO";
  const valorFecha =
    fechaLocal || data?.fechaOperacion || calendario.data?.fechaOperacion || "";
  const actualizando = operacion.isFetching && Boolean(data);

  return (
    <PanelShell title="Hoy">
      <div className="grid gap-4" aria-busy={actualizando || undefined}>
        <PageToolbar
          actions={
            <div className="flex flex-wrap items-center gap-2">
              {actualizando ? (
                <span className="mst-label text-tinta-500" aria-live="polite">
                  Actualizando…
                </span>
              ) : null}
              <DateField
                id="hoy-fecha-operacion"
                label="Fecha de operación"
                value={valorFecha}
                onChange={elegirFecha}
                clearable={false}
                className="min-w-[220px]"
              />
            </div>
          }
        />

        {operacion.isLoading && !data && (
          <div className="grid gap-4">
            <Skeleton className="h-28 rounded-tarjeta" />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
            </div>
            <Skeleton className="h-40 rounded-tarjeta" />
          </div>
        )}

        {operacion.error && !data && (
          <EmptyState
            title="No se pudo cargar la operación"
            description="Revise la conexión e intente de nuevo."
            action={
              <Button
                variant="secondary"
                onClick={() => void operacion.refetch()}
              >
                Reintentar
              </Button>
            }
          />
        )}

        {data && (
          <>
            <Card
              tone="brand"
              title="Monto de la noche"
              subtitle="Pedido × snapshot. Aún no es la factura."
            >
              <p className="font-display text-4xl leading-none tabular-nums text-acento sm:text-5xl">
                <Money
                  centavos={data.montoPedidosCentavos}
                  className="text-acento"
                />
              </p>
            </Card>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Metric
                label="Pedidos capturados"
                hint={`${data.pedidosPortal} del portal · ${data.pedidosManual} manuales`}
              >
                {data.pedidosPortal + data.pedidosManual}
              </Metric>
              <Metric
                label="Libras de tortilla"
                hint={
                  calendario.data?.esSabado
                    ? "Planta: todo · sábado"
                    : "Tortilla No. 16 / 14 / 12"
                }
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
              <ChipRuta estado="CONFIRMADO" valor={data.ruta.confirmados} />
              <ChipRuta estado="EN_PRODUCCION" valor={data.ruta.enProduccion} />
              <ChipRuta estado="ENTREGADO" valor={data.ruta.entregados} />
              <ChipRuta estado="ANULADO" valor={data.ruta.anulados} />
            </div>

            <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr] lg:items-start">
              <div className="grid gap-4">
                <Card
                  title="Pedidos de la noche"
                  subtitle={
                    listaNoche.meta
                      ? `${listaNoche.meta} · ${data.fechaOperacion}`
                      : `Fecha de operación: ${data.fechaOperacion}`
                  }
                  flush
                  actions={
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() =>
                        router.push(
                          buildPedidosHref({
                            fechaOperacion: data.fechaOperacion,
                          }),
                        )
                      }
                    >
                      Ver todos
                    </Button>
                  }
                >
                  {pedidos.isLoading && !pedidos.data && (
                    <Skeleton className="mx-4 mb-4 h-32" />
                  )}
                  {pedidos.data && pedidos.data.length === 0 && (
                    <EmptyState
                      title="Todavía no hay pedidos"
                      description="La ventana abre a las 15:00. Los del portal y los de llamada aparecen aquí."
                    />
                  )}
                  {pedidos.data && pedidos.data.length > 0 && (
                    <ul className="border-t border-[var(--border-subtle)]">
                      {listaNoche.visible.map((p) => (
                        <li key={p.id}>
                          <Link
                            href={hrefPedidoNoche({
                              fechaOperacion: data.fechaOperacion,
                              pedidoId: p.id,
                            })}
                            aria-label={`Pedido #${p.correlativo} ${p.clienteNombre}`}
                            className={cn(
                              "grid min-h-fila w-full grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-0.5 border-b border-[var(--border-subtle)] px-4 py-2.5 text-left",
                              "transition-[background-color] duration-control ease-out hover:bg-tinta-50",
                              "focus-visible:outline-none focus-visible:shadow-foco",
                            )}
                          >
                            <ClienteAvatar
                              nombre={p.clienteNombre}
                              fotoAssetId={fotoPorCliente.get(p.clienteId)}
                              size="sm"
                            />
                            <span className="min-w-0">
                              <span className="flex items-center gap-2">
                                <span className="font-mono text-[12px] tabular-nums text-tinta-500">
                                  #{p.correlativo}
                                </span>
                                <span className="min-w-0 flex-1 truncate text-sm font-semibold text-pretty text-tinta-900">
                                  {p.clienteNombre}
                                </span>
                                <EstadoBadge estado={p.estado} size="sm" />
                              </span>
                              <span className="flex gap-2 text-[12px] text-tinta-500">
                                <span>
                                  {p.origen === "PORTAL" ? "Portal" : "Manual"} ·{" "}
                                  {horaEnZona(new Date(p.capturadoAt))}
                                </span>
                                <span className="ml-auto">
                                  <Money
                                    centavos={p.totalCentavos}
                                    tone="muted"
                                  />
                                </span>
                              </span>
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
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
                            href={hrefClienteSinPedido(c.clienteId)}
                            aria-label={`Ficha de ${c.nombre}`}
                            className="flex min-h-fila items-center gap-3 border-b border-[var(--border-subtle)] px-4 py-2.5 hover:bg-tinta-50 focus-visible:outline-none focus-visible:shadow-foco"
                          >
                            <ClienteAvatar
                              nombre={c.nombre}
                              fotoAssetId={fotoPorCliente.get(c.clienteId)}
                              size="sm"
                            />
                            <span className="min-w-0 flex-1 truncate text-sm font-semibold text-pretty text-marca">
                              {c.nombre}
                            </span>
                            <span className="text-[12px] text-tinta-500">
                              Capture en Pedidos
                            </span>
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
                      <VentanaBadge
                        abierta={Boolean(calendario.data?.ventanaAbierta)}
                      />
                      {reabierto && <Badge tone="amber">Reabierto</Badge>}
                      {cerrado && <Badge>Día cerrado</Badge>}
                    </div>
                    <p className="text-sm leading-relaxed text-pretty text-tinta-800">
                      Al cerrar se materializa la hoja de producción. El
                      consolidado queda listo para descargar y enviar por
                      WhatsApp. Un solo paso.
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
                        className="text-center text-sm font-semibold text-marca underline-offset-2 hover:underline"
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
                          href={hrefLimiteCredito(c.clienteId)}
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
