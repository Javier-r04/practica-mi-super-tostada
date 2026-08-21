"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { FileDown } from "lucide-react";
import {
  fechasEnRango,
  formatearCentavos,
  UNIDAD_CORTA,
  type ActorPublico,
  type ClientePublico,
  type Tablero,
} from "@misupertostada/shared";
import { api, ApiError } from "@/lib/api";
import {
  agruparProductosPorFamilia,
  formatearFechaCorta,
  participacionTopN,
} from "@/lib/tablero-vista";
import { PanelShell } from "@/components/layout/panel-shell";
import { PageToolbar } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Money } from "@/components/domain/money";
import { EstadoBadge } from "@/components/domain/estado-badge";
import { ClienteAvatar } from "@/components/catalog/cliente-avatar";
import {
  FiltrosTableroBarra,
  filtrosDesdeSearch,
  mismosFiltros,
  queryDeFiltros,
  type FiltrosTablero,
} from "@/components/analytics/filtros-tablero";
import { KpiStrip } from "@/components/analytics/kpi-strip";
import { ChartLinea } from "@/components/analytics/charts/linea";
import { ChartBarrasH } from "@/components/analytics/charts/barras-h";
import { ChartBarrasApiladas } from "@/components/analytics/charts/barras-apiladas";
import { MedidorApilado } from "@/components/analytics/charts/medidor-apilado";
import { cn } from "@/lib/utils";

function ChipRuta({
  label,
  valor,
}: {
  label: string;
  valor: number;
}) {
  return (
    <span className="inline-flex min-h-11 items-center gap-2 rounded-campo border border-[var(--border-subtle)] bg-blanco px-3 text-sm">
      <span className="mst-label">{label}</span>
      <span className="font-semibold tabular-nums text-tinta-900">{valor}</span>
    </span>
  );
}

function fotoDeCliente(
  clientes: ClientePublico[] | undefined,
  clienteId: string,
): string | null | undefined {
  return clientes?.find((c) => c.id === clienteId)?.fotoAssetId;
}

function TableroInner() {
  const sp = useSearchParams();
  const [filtros, setFiltros] = useState<FiltrosTablero>(() =>
    filtrosDesdeSearch(sp),
  );
  const qs = queryDeFiltros(filtros);
  const [descargando, setDescargando] = useState(false);
  const [errorPdf, setErrorPdf] = useState<string>();

  const spKey = sp.toString();
  useEffect(() => {
    const fromUrl = filtrosDesdeSearch(new URLSearchParams(spKey));
    setFiltros((prev) => (mismosFiltros(prev, fromUrl) ? prev : fromUrl));
  }, [spKey]);

  const me = useQuery({
    queryKey: ["auth", "me"],
    queryFn: () => api<{ usuario: ActorPublico }>("/auth/me"),
  });

  const clientes = useQuery({
    queryKey: ["clientes"],
    queryFn: () => api<ClientePublico[]>("/clientes"),
    enabled: Boolean(me.data),
  });
  const tablero = useQuery({
    queryKey: ["tablero", filtros],
    queryFn: () => api<Tablero>(`/tablero${qs}`),
    enabled: Boolean(me.data),
    placeholderData: keepPreviousData,
  });

  async function descargar() {
    setDescargando(true);
    setErrorPdf(undefined);
    try {
      const blob = await api<Blob>(`/tablero/quincena.pdf${qs}`);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "cierre-quincena.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setErrorPdf(
        err instanceof ApiError ? err.message : "No se pudo descargar el PDF",
      );
    } finally {
      setDescargando(false);
    }
  }

  const data = tablero.data;
  const mostrandoPrevios = tablero.isPlaceholderData;

  const participacion = useMemo(() => {
    const porCliente = data?.ventas.porCliente ?? [];
    const total = porCliente.reduce((acc, c) => acc + c.montoCentavos, 0);
    const top = participacionTopN(
      porCliente.map((c) => ({
        id: c.clienteId,
        label: c.nombre,
        valor: c.montoCentavos,
      })),
      5,
    );
    return top.map((c) => ({
      id: c.id,
      label: c.label,
      valor: c.valor,
      etiqueta: formatearCentavos(c.valor),
      meta:
        total > 0
          ? `${Math.round((c.valor / total) * 100)} %`
          : undefined,
      href: c.id === "otros" ? undefined : `/clientes/${c.id}`,
      leading:
        c.id === "otros" ? undefined : (
          <ClienteAvatar
            nombre={c.label}
            fotoAssetId={fotoDeCliente(clientes.data, c.id)}
            size="sm"
          />
        ),
    }));
  }, [data?.ventas.porCliente, clientes.data]);

  const promedioAnterior = data
    ? Math.trunc(
        data.ventas.anterior.totalCentavos /
          Math.max(
            1,
            fechasEnRango(
              data.ventas.anterior.desde,
              data.ventas.anterior.hasta,
            ).length,
          ),
      )
    : 0;

  const gruposProducto = useMemo(
    () => agruparProductosPorFamilia(data?.productos ?? []),
    [data?.productos],
  );

  const maxCantidadProducto = Math.max(
    1,
    ...(data?.productos.map((p) => p.cantidad) ?? [0]),
  );

  return (
    <PanelShell title="Tablero">
      <FiltrosTableroBarra
        clientes={clientes.data ?? []}
        aplicados={mostrandoPrevios ? undefined : data?.filtrosAplicados}
        value={filtros}
        onChange={setFiltros}
      />
      <div
        className={cn(
          "mt-4 grid gap-4 transition-opacity duration-surface ease-out",
        )}
        aria-busy={tablero.isFetching || undefined}
      >
        <PageToolbar
          description={
            mostrandoPrevios
              ? "Actualizando el recorte…"
              : `${data?.filtrosAplicados.etiqueta ?? "Cierre de quincena y recortes de la operación."} Pagado cuando la suma de abonos cubre la factura.`
          }
          actions={
            <Button
              variant="accent"
              onClick={() => void descargar()}
              loading={descargando}
              disabled={!data || mostrandoPrevios}
            >
              <FileDown size={15} aria-hidden />
              Descargar cierre de quincena
            </Button>
          }
        />
        {errorPdf && (
          <p className="text-sm text-peligro" role="alert">
            {errorPdf}
          </p>
        )}

        {tablero.isLoading && !data && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
        )}
        {tablero.error && (
          <EmptyState
            title="No se pudo cargar el tablero"
            description="Revise la conexión e intente de nuevo."
          />
        )}
        {data && (
          <>
            <KpiStrip data={data} />
            <div className="grid gap-4 lg:grid-cols-2">
              <div id="chart-ventas" className="scroll-mt-24">
                <Card
                  title="Ventas por día"
                  subtitle={`Anterior ${formatearFechaCorta(data.ventas.anterior.desde)} – ${formatearFechaCorta(data.ventas.anterior.hasta)}`}
                >
                  <ChartLinea
                    serie={data.ventas.porDia}
                    anteriorPromedioCentavos={promedioAnterior}
                  />
                </Card>
              </div>
              <div id="chart-cobrado" className="scroll-mt-24">
                <Card
                  title="Cobrado"
                  subtitle="Por fecha del pago"
                >
                  <ChartBarrasApiladas serie={data.cobradoPorDia} />
                </Card>
              </div>
              <div id="chart-participacion" className="scroll-mt-24">
                <Card
                  title="Participación por cliente"
                  subtitle="Quién mueve la planta · top 5 + otros"
                >
                  <ChartBarrasH
                    items={participacion}
                    vacioTitulo="Sin ventas por cliente"
                  />
                </Card>
              </div>
              <div id="chart-productos" className="scroll-mt-24">
                <Card
                  title="Volumen por producto"
                  subtitle="Agrupado por familia · punto de carga"
                >
                  {gruposProducto.length === 0 ? (
                    <EmptyState title="Sin volumen en este recorte" />
                  ) : (
                    <div className="grid gap-5">
                      {gruposProducto.map((g) => (
                        <div key={g.familia} className="grid gap-2">
                          <p className="mst-label">{g.label}</p>
                          <ul className="grid gap-2">
                            {g.items.map((p) => (
                              <li
                                key={`${p.nombreMostrado}-${p.puntoCarga}`}
                                className="grid gap-1.5"
                              >
                                <div className="flex min-h-11 flex-wrap items-center justify-between gap-2">
                                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                                    <span className="text-pretty text-sm font-semibold text-tinta-900">
                                      {p.nombreMostrado}
                                    </span>
                                    <EstadoBadge
                                      estado={p.puntoCarga}
                                      size="sm"
                                    />
                                  </div>
                                  <span className="font-display text-xl tabular-nums leading-none text-marca">
                                    {p.cantidad}{" "}
                                    <span className="text-sm font-semibold text-tinta-500">
                                      {UNIDAD_CORTA[p.unidadMedida]}
                                    </span>
                                  </span>
                                </div>
                                <div
                                  className="h-2 overflow-hidden rounded-pill bg-[var(--ink-100)]"
                                  aria-hidden
                                >
                                  <div
                                    className="h-full rounded-pill bg-[var(--ink-300)]"
                                    style={{
                                      width: `${Math.round((p.cantidad / maxCantidadProducto) * 100)}%`,
                                    }}
                                  />
                                </div>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              </div>
              <div id="chart-cartera" className="scroll-mt-24">
                <Card
                  title="Antigüedad de cartera"
                  subtitle="15+ días es el caso de Victorias"
                >
                  {data.cartera.tramos.every((t) => t.saldoCentavos === 0) ? (
                    <EmptyState title="Sin saldo pendiente" />
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {data.cartera.tramos.map((t) => {
                        const peligro =
                          t.clave === "15-30" || t.clave === "31+";
                        return (
                          <div
                            key={t.clave}
                            className={cn(
                              "rounded-tarjeta border p-4",
                              peligro
                                ? "border-[var(--red-600)] bg-[var(--red-100)]"
                                : "border-[var(--border-subtle)] bg-blanco",
                            )}
                          >
                            <p className="mst-label">
                              {t.clave} días
                              {peligro ? " · atención" : ""}
                            </p>
                            <p className="mt-1.5 font-display text-2xl tabular-nums leading-none text-tinta-900">
                              <Money centavos={t.saldoCentavos} />
                            </p>
                            <p className="mt-1 text-xs tabular-nums text-tinta-500">
                              {t.facturas}{" "}
                              {t.facturas === 1 ? "factura" : "facturas"}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Card>
              </div>
              <div id="chart-adopcion" className="scroll-mt-24">
                <Card
                  title="Ruta y adopción"
                  subtitle="Estados de pedido · portal vs manual"
                >
                  <div className="grid gap-5">
                    <div className="flex flex-wrap gap-2">
                      <ChipRuta
                        label="Confirmados"
                        valor={data.operacion.ruta.confirmados}
                      />
                      <ChipRuta
                        label="En producción"
                        valor={data.operacion.ruta.enProduccion}
                      />
                      <ChipRuta
                        label="Entregados"
                        valor={data.operacion.ruta.entregados}
                      />
                      <ChipRuta
                        label="Anulados"
                        valor={data.operacion.ruta.anulados}
                      />
                    </div>
                    <div>
                      <p className="mst-label mb-2">Origen del pedido</p>
                      <MedidorApilado
                        partes={[
                          {
                            id: "portal",
                            label: "Portal",
                            valor: data.adopcion.portal,
                            color: "var(--green-800)",
                          },
                          {
                            id: "manual",
                            label: "Manual",
                            valor: data.adopcion.manual,
                            color: "var(--blue-700)",
                          },
                        ]}
                        vacio="Sin pedidos en este recorte"
                      />
                    </div>
                  </div>
                </Card>
              </div>
            </div>

            <div id="chart-clientes" className="scroll-mt-24">
              <Card
                title="Salud de clientes"
                subtitle="Ticket promedio, días de pago y quién dejó de pedir"
                flush
              >
                {data.clientes.length === 0 ? (
                  <EmptyState title="Sin clientes en este recorte" />
                ) : (
                  <ul className="divide-y divide-[var(--border-subtle)]">
                    {data.clientes.map((c) => (
                      <li key={c.clienteId}>
                        <Link
                          href={`/clientes/${c.clienteId}`}
                          className="flex min-h-[52px] items-center gap-3 px-4 py-3 transition-colors hover:bg-[var(--ink-50)] focus-visible:outline-none focus-visible:shadow-foco"
                        >
                          <ClienteAvatar
                            nombre={c.nombre}
                            fotoAssetId={fotoDeCliente(
                              clientes.data,
                              c.clienteId,
                            )}
                            size="sm"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-pretty text-sm font-semibold text-tinta-900">
                                {c.nombre}
                              </span>
                              {c.dejoDePedir && (
                                <span className="inline-flex h-[22px] items-center rounded-pill bg-[var(--red-100)] px-2 text-[12px] font-medium text-[var(--red-700)]">
                                  Dejó de pedir
                                </span>
                              )}
                            </div>
                            <p className="mt-0.5 text-xs text-tinta-500">
                              {c.pedidos} pedidos · mediana pago {c.diasPagoMediana}{" "}
                              d · último{" "}
                              {c.ultimoPedidoFecha
                                ? formatearFechaCorta(c.ultimoPedidoFecha)
                                : "—"}
                            </p>
                          </div>
                          <span className="shrink-0 font-mono text-sm tabular-nums text-tinta-800">
                            <Money centavos={c.ticketPromedioCentavos} />
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </div>

            {(data.filtrosAplicados.desde === data.filtrosAplicados.hasta ||
              data.operacion.clientesSinPedido.length > 0) && (
              <div id="chart-sin-pedido" className="scroll-mt-24">
                <Card
                  title="Aún no piden"
                  subtitle="Activos sin pedido en esta fecha de operación"
                  flush
                >
                  {data.operacion.clientesSinPedido.length === 0 ? (
                    <p className="px-5 pb-5 text-sm text-tinta-500">
                      Todos los activos ya pidieron
                    </p>
                  ) : (
                    <ul className="divide-y divide-[var(--border-subtle)]">
                      {data.operacion.clientesSinPedido.map((c) => (
                        <li key={c.clienteId}>
                          <Link
                            href={`/clientes/${c.clienteId}`}
                            className="flex min-h-11 items-center gap-3 px-4 py-2.5 text-sm font-semibold text-tinta-900 transition-colors hover:bg-[var(--ink-50)] focus-visible:outline-none focus-visible:shadow-foco"
                          >
                            <ClienteAvatar
                              nombre={c.nombre}
                              fotoAssetId={fotoDeCliente(
                                clientes.data,
                                c.clienteId,
                              )}
                              size="sm"
                            />
                            <span className="text-pretty">{c.nombre}</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </Card>
              </div>
            )}
          </>
        )}
      </div>
    </PanelShell>
  );
}

export default function TableroPage() {
  return (
    <Suspense
      fallback={
        <PanelShell title="Tablero">
          <Skeleton className="h-48" />
        </PanelShell>
      }
    >
      <TableroInner />
    </Suspense>
  );
}
