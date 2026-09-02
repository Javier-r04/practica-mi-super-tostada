"use client";

import { Suspense, useMemo, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Alert, Card, Chip } from "@heroui/react";
import { FileDown } from "lucide-react";
import {
  fechasEnRango,
  formatearCentavos,
  reporteTablero,
  UNIDAD_CORTA,
  type ActorPublico,
  type ClientePublico,
  type Tablero,
} from "@misupertostada/shared";
import { api, ApiError } from "@/lib/api";
import {
  formatearFechaCorta,
  participacionTopN,
  topProductosVolumen,
} from "@/lib/tablero-vista";
import { Button } from "@/components/ui/button";
import { PanelShell } from "@/components/layout/panel-shell";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { SERIE_COLOR } from "@/components/ui/chart";
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
import { KpiStrip, KpiStripSkeleton } from "@/components/analytics/kpi-strip";
import { SaludClientesCard } from "@/components/analytics/salud-clientes";
import { ChartLinea } from "@/components/analytics/charts/linea";
import { ChartBarrasH } from "@/components/analytics/charts/barras-h";
import { ChartBarrasApiladas } from "@/components/analytics/charts/barras-apiladas";
import { MedidorApilado } from "@/components/analytics/charts/medidor-apilado";
import { cn } from "@/lib/utils";

/** Tarjeta de gráfica: mismo encabezado y misma altura en toda la rejilla. */
function TarjetaGrafica({
  ancla,
  titulo,
  subtitulo,
  children,
}: {
  ancla: string;
  titulo: string;
  subtitulo?: string;
  children: ReactNode;
}) {
  return (
    <div id={ancla} className="min-w-0 scroll-mt-24">
      <Card className="h-full min-w-0">
        <Card.Header>
          <Card.Title>{titulo}</Card.Title>
          {subtitulo && <Card.Description>{subtitulo}</Card.Description>}
        </Card.Header>
        <Card.Content className="min-w-0 overflow-x-auto pb-1">{children}</Card.Content>
      </Card>
    </div>
  );
}

function ChipRuta({ label, valor }: { label: string; valor: number }) {
  return (
    <Chip size="lg" variant="soft">
      <span className="mst-label">{label}</span>
      <span className="ml-2 font-semibold tabular-nums text-tinta-900">
        {valor}
      </span>
    </Chip>
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
  const [descargando, setDescargando] = useState(false);
  const [errorPdf, setErrorPdf] = useState<string>();

  // La URL es la fuente de verdad de los filtros. `eco` solo adelanta el
  // cambio mientras la transición de `router.replace` llega; en cuanto el
  // search param cambia (o alguien navega), la URL vuelve a mandar.
  const spKey = sp.toString();
  const desdeUrl = useMemo(
    () => filtrosDesdeSearch(new URLSearchParams(spKey)),
    [spKey],
  );
  const [eco, setEco] = useState<{
    url: string;
    valor: FiltrosTablero;
  } | null>(null);
  const filtros = eco && eco.url === spKey ? eco.valor : desdeUrl;
  const qs = queryDeFiltros(filtros);

  function cambiarFiltros(next: FiltrosTablero) {
    if (mismosFiltros(filtros, next)) return;
    setEco({ url: spKey, valor: next });
  }

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

  // El reporte no siempre es «la quincena»: el título, el botón y el archivo
  // salen del recorte elegido. Se calcula del filtro local para que la etiqueta
  // cambie con el clic, sin esperar la respuesta del servidor.
  const reporte = reporteTablero({
    periodo: filtros.periodo,
    desde: (filtros.desde || tablero.data?.filtrosAplicados.desde) ?? "",
    hasta: (filtros.hasta || tablero.data?.filtrosAplicados.hasta) ?? "",
  });

  async function descargar() {
    setDescargando(true);
    setErrorPdf(undefined);
    try {
      const blob = await api<Blob>(`/tablero/quincena.pdf${qs}`);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = reporte.nombreArchivo;
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
  const cargandoPrimeraVez = tablero.isLoading && !data;

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
      meta: total > 0 ? `${Math.round((c.valor / total) * 100)} %` : undefined,
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

  const volumenProductos = useMemo(() => {
    const all = data?.productos ?? [];
    const { items, ocultos } = topProductosVolumen(all, 5);
    const maxCantidad = Math.max(1, ...items.map((p) => p.cantidad));
    return { items, ocultos, maxCantidad, total: all.length };
  }, [data?.productos]);

  return (
    <PanelShell
      title="Tablero"
      barraFija={
        <FiltrosTableroBarra
          clientes={clientes.data ?? []}
          aplicados={mostrandoPrevios ? undefined : data?.filtrosAplicados}
          value={filtros}
          onChange={cambiarFiltros}
          acciones={
            <Button
              className="button--accent"
              variant="primary"
              size="sm"
              loading={descargando}
              disabled={descargando || !data || mostrandoPrevios}
              onClick={() => void descargar()}
              aria-label={`Descargar el PDF de ${reporte.titulo.toLowerCase()} con el recorte actual`}
            >
              <FileDown size={16} aria-hidden />
              {`Descargar ${reporte.titulo.toLowerCase()}`}
            </Button>
          }
        />
      }
    >
      <div
        className={cn(
          "grid min-w-0 gap-5 transition-opacity duration-slow ease-out",
          (tablero.isFetching || mostrandoPrevios) && "opacity-70",
        )}
        aria-busy={tablero.isFetching || undefined}
      >
        {errorPdf && (
          <Alert status="danger">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>No se pudo descargar el PDF</Alert.Title>
              <Alert.Description>{errorPdf}</Alert.Description>
            </Alert.Content>
          </Alert>
        )}

        {cargandoPrimeraVez && (
          <>
            <KpiStripSkeleton />
            <div className="grid min-w-0 gap-4 lg:grid-cols-2 lg:items-stretch">
              <TarjetaGrafica
                ancla="chart-ventas-cargando"
                titulo="Ventas por día"
              >
                <ChartLinea serie={[]} cargando />
              </TarjetaGrafica>
              <TarjetaGrafica
                ancla="chart-cobrado-cargando"
                titulo="Cobrado"
                subtitulo="Por fecha del pago"
              >
                <ChartBarrasApiladas serie={[]} cargando />
              </TarjetaGrafica>
            </div>
          </>
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

            <div className="grid min-w-0 gap-4 lg:grid-cols-2 lg:items-stretch">
              <TarjetaGrafica
                ancla="chart-ventas"
                titulo="Ventas por día"
                subtitulo={`Quetzales entregados · anterior ${formatearFechaCorta(data.ventas.anterior.desde)} – ${formatearFechaCorta(data.ventas.anterior.hasta)}`}
              >
                <ChartLinea
                  serie={data.ventas.porDia}
                  anteriorPromedioCentavos={promedioAnterior}
                />
              </TarjetaGrafica>
              <TarjetaGrafica
                ancla="chart-cobrado"
                titulo="Cobrado"
                subtitulo="Quetzales por fecha del pago · efectivo y transferencia"
              >
                <ChartBarrasApiladas serie={data.cobradoPorDia} />
              </TarjetaGrafica>
            </div>

            {/* Listas rankeadas del mismo tipo → misma densidad, sin huecos */}
            <div className="grid min-w-0 gap-4 lg:grid-cols-2 lg:items-stretch">
              <TarjetaGrafica
                ancla="chart-participacion"
                titulo="Participación por cliente"
                subtitulo="Quién mueve la planta · top 5 + otros"
              >
                <ChartBarrasH
                  items={participacion}
                  vacioTitulo="Sin ventas por cliente"
                  vacioHint="Al entregar pedidos, cada restaurante aparece con su parte."
                />
              </TarjetaGrafica>
              <TarjetaGrafica
                ancla="chart-productos"
                titulo="Volumen por producto"
                subtitulo="Top 5 del recorte · punto de carga"
              >
                {volumenProductos.items.length === 0 ? (
                  <EmptyState
                    title="Sin volumen en este recorte"
                    description="Cambie el periodo o quite el filtro de familia."
                  />
                ) : (
                  <div className="grid gap-3">
                    <ul className="grid gap-2">
                      {volumenProductos.items.map((p) => (
                        <li
                          key={`${p.nombreMostrado}-${p.puntoCarga}`}
                          className="grid gap-1.5"
                        >
                          <div className="flex min-h-11 flex-wrap items-center justify-between gap-2">
                            <div className="flex min-w-0 flex-wrap items-center gap-2">
                              <span className="text-pretty text-sm font-semibold text-tinta-900">
                                {p.nombreMostrado}
                              </span>
                              <EstadoBadge estado={p.puntoCarga} size="sm" />
                            </div>
                            <span className="text-lg font-semibold leading-none tabular-nums text-tinta-900">
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
                              className="h-full rounded-pill transition-[width] duration-slow ease-out"
                              style={{
                                width: `${Math.round((p.cantidad / volumenProductos.maxCantidad) * 100)}%`,
                                background: SERIE_COLOR.digital,
                              }}
                            />
                          </div>
                        </li>
                      ))}
                    </ul>
                    {volumenProductos.ocultos > 0 && (
                      <p className="text-xs tabular-nums text-tinta-500">
                        +{volumenProductos.ocultos} productos más en el recorte
                        (de {volumenProductos.total}).
                      </p>
                    )}
                  </div>
                )}
              </TarjetaGrafica>
            </div>

            {/* Widgets compactos · misma altura natural */}
            <div className="grid min-w-0 gap-4 lg:grid-cols-2 lg:items-stretch">
              <TarjetaGrafica
                ancla="chart-cartera"
                titulo="Antigüedad de cartera"
                subtitulo="15+ días es el caso de Victorias"
              >
                {data.cartera.tramos.every((t) => t.saldoCentavos === 0) ? (
                  <EmptyState
                    title="Sin saldo pendiente"
                    description="Nadie debe facturas en este recorte."
                  />
                ) : (
                  <dl className="grid gap-3 sm:grid-cols-2">
                    {data.cartera.tramos.map((t) => {
                      const peligro = t.clave === "15-30" || t.clave === "31+";
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
                          <dt className="mst-label text-[11px]">
                            {t.clave} días
                            {peligro ? " · atención" : ""}
                          </dt>
                          <dd
                            className={cn(
                              "mt-1.5 text-[22px] font-semibold leading-none tabular-nums",
                              peligro ? "text-peligro" : "text-tinta-900",
                            )}
                          >
                            <Money centavos={t.saldoCentavos} />
                          </dd>
                          <p className="mt-1 text-[11px] tabular-nums text-tinta-500">
                            {t.facturas}{" "}
                            {t.facturas === 1 ? "factura" : "facturas"}
                          </p>
                        </div>
                      );
                    })}
                  </dl>
                )}
              </TarjetaGrafica>
              <TarjetaGrafica
                ancla="chart-adopcion"
                titulo="Ruta y adopción"
                subtitulo="Estados de pedido · portal vs manual"
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
                    <p className="mst-label mb-2">
                      Origen del pedido · cuántos pedidos
                    </p>
                    <MedidorApilado
                      partes={[
                        {
                          id: "portal",
                          label: "Portal",
                          valor: data.adopcion.portal,
                          color: SERIE_COLOR.digital,
                        },
                        {
                          id: "manual",
                          label: "Manual",
                          valor: data.adopcion.manual,
                          color: SERIE_COLOR.manual,
                        },
                      ]}
                      vacio="Sin pedidos en este recorte"
                    />
                  </div>
                </div>
              </TarjetaGrafica>
            </div>

            <div id="chart-clientes" className="scroll-mt-24">
              <SaludClientesCard
                clientes={data.clientes}
                catalogo={clientes.data}
              />
            </div>

            {(data.filtrosAplicados.desde === data.filtrosAplicados.hasta ||
              data.operacion.clientesSinPedido.length > 0) && (
              <div id="chart-sin-pedido" className="scroll-mt-24">
                <Card>
                  <Card.Header>
                    <Card.Title>Aún no piden</Card.Title>
                    <Card.Description>
                      Activos sin pedido en esta fecha de operación
                    </Card.Description>
                  </Card.Header>
                  <Card.Content className="px-0 pb-0">
                    {data.operacion.clientesSinPedido.length === 0 ? (
                      <p className="px-5 pb-5 text-sm text-tinta-500">
                        Todos los activos ya pidieron
                      </p>
                    ) : (
                      <>
                        <ul className="divide-y divide-[var(--border-subtle)]">
                          {data.operacion.clientesSinPedido
                            .slice(0, 12)
                            .map((c) => (
                              <li key={c.clienteId}>
                                <Link
                                  href={`/clientes/${c.clienteId}`}
                                  className="flex min-h-11 items-center gap-3 px-4 py-2.5 text-sm font-semibold text-tinta-900 no-underline transition-colors hover:bg-[var(--ink-50)] focus-visible:outline-none focus-visible:shadow-foco"
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
                        {data.operacion.clientesSinPedido.length > 12 && (
                          <p className="px-4 py-3 text-xs tabular-nums text-tinta-500">
                            +{data.operacion.clientesSinPedido.length - 12} más ·{" "}
                            <Link
                              href="/clientes"
                              className="font-semibold text-marca underline-offset-2 hover:underline"
                            >
                              Ver clientes
                            </Link>
                          </p>
                        )}
                      </>
                    )}
                  </Card.Content>
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
