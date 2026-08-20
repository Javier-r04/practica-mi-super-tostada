"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
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
import { PanelShell } from "@/components/layout/panel-shell";
import { usePedidosSse } from "@/hooks/use-pedidos-sse";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Money } from "@/components/domain/money";
import {
  FiltrosTableroBarra,
  filtrosDesdeSearch,
  queryDeFiltros,
} from "@/components/analytics/filtros-tablero";
import { KpiStrip } from "@/components/analytics/kpi-strip";
import { ChartLinea } from "@/components/analytics/charts/linea";
import { ChartBarrasH } from "@/components/analytics/charts/barras-h";
import { ChartBarrasApiladas } from "@/components/analytics/charts/barras-apiladas";
import { ChartAnillo } from "@/components/analytics/charts/anillo";

function TableroInner() {
  const sp = useSearchParams();
  const filtros = filtrosDesdeSearch(sp);
  const qs = queryDeFiltros(filtros);
  const [descargando, setDescargando] = useState(false);
  const [errorPdf, setErrorPdf] = useState<string>();

  const me = useQuery({
    queryKey: ["auth", "me"],
    queryFn: () => api<{ usuario: ActorPublico }>("/auth/me"),
  });
  usePedidosSse(Boolean(me.data));

  const clientes = useQuery({
    queryKey: ["clientes"],
    queryFn: () => api<ClientePublico[]>("/clientes"),
    enabled: Boolean(me.data),
  });
  const tablero = useQuery({
    queryKey: ["tablero", filtros],
    queryFn: () => api<Tablero>(`/tablero${qs}`),
    enabled: Boolean(me.data),
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
  const topClientes = (data?.ventas.porCliente ?? []).slice(0, 8);
  const otros = (data?.ventas.porCliente ?? []).slice(8);
  const otrosMonto = otros.reduce((acc, c) => acc + c.montoCentavos, 0);
  const participacion = [
    ...topClientes.map((c) => ({
      id: c.clienteId,
      label: c.nombre,
      valor: c.montoCentavos,
      etiqueta: formatearCentavos(c.montoCentavos),
    })),
    ...(otros.length
      ? [
          {
            id: "otros",
            label: "Otros",
            valor: otrosMonto,
            etiqueta: formatearCentavos(otrosMonto),
          },
        ]
      : []),
  ];
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

  return (
    <PanelShell title="Tablero">
      <FiltrosTableroBarra
        clientes={clientes.data ?? []}
        aplicados={data?.filtrosAplicados}
      />
      <div className="mt-4 grid gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <p className="max-w-[62ch] text-sm text-pretty text-tinta-500">
            {data?.filtrosAplicados.etiqueta ??
              "Cierre de quincena y recortes de la operación."}{" "}
            Pagado cuando la suma de abonos cubre la factura.
          </p>
          <Button
            variant="accent"
            onClick={() => void descargar()}
            loading={descargando}
            disabled={!data}
          >
            <FileDown size={15} aria-hidden />
            Descargar cierre de quincena
          </Button>
        </div>
        {errorPdf && (
          <p className="text-sm text-peligro" role="alert">
            {errorPdf}
          </p>
        )}

        {tablero.isLoading && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
                  subtitle={`Anterior ${data.ventas.anterior.desde} – ${data.ventas.anterior.hasta}`}
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
                  subtitle="Efectivo verde · transferencia azul · por fecha del pago"
                >
                  <ChartBarrasApiladas serie={data.cobradoPorDia} />
                </Card>
              </div>
              <div id="chart-participacion" className="scroll-mt-24">
                <Card
                  title="Participación por cliente"
                  subtitle="Quién mueve la planta"
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
                  subtitle="Color por punto de carga"
                >
                  <ChartBarrasH
                    items={data.productos.map((p) => ({
                      id: `${p.nombreMostrado}-${p.puntoCarga}`,
                      label: p.nombreMostrado,
                      valor: p.cantidad,
                      etiqueta: `${p.cantidad} ${UNIDAD_CORTA[p.unidadMedida]}`,
                      color:
                        p.puntoCarga === "PLANTA"
                          ? "var(--carga-planta-fg)"
                          : "var(--carga-democracia-fg)",
                    }))}
                    vacioTitulo="Sin volumen en este recorte"
                  />
                </Card>
              </div>
              <div id="chart-cartera" className="scroll-mt-24">
                <Card
                  title="Antigüedad de cartera"
                  subtitle="15+ días es el caso de Victorias"
                >
                  <ChartBarrasH
                    items={data.cartera.tramos.map((t) => ({
                      id: t.clave,
                      label: `${t.clave} días`,
                      valor: t.saldoCentavos,
                      etiqueta: formatearCentavos(t.saldoCentavos),
                      color:
                        t.clave === "15-30" || t.clave === "31+"
                          ? "var(--red-600)"
                          : "var(--green-800)",
                    }))}
                    vacioTitulo="Sin saldo pendiente"
                  />
                </Card>
              </div>
              <div id="chart-adopcion" className="scroll-mt-24">
                <Card
                  title="Ruta y adopción"
                  subtitle="Pendiente vs entregado · portal vs manual"
                >
                  <div className="grid gap-4 sm:grid-cols-2">
                    <ChartAnillo
                      partes={[
                        {
                          id: "pend",
                          label: "En ruta",
                          valor:
                            data.operacion.ruta.confirmados +
                            data.operacion.ruta.enProduccion,
                          color: "var(--gold-500)",
                        },
                        {
                          id: "ent",
                          label: "Entregado",
                          valor: data.operacion.ruta.entregados,
                          color: "var(--green-800)",
                        },
                        {
                          id: "anu",
                          label: "Anulado",
                          valor: data.operacion.ruta.anulados,
                          color: "var(--ink-400)",
                        },
                      ]}
                    />
                    <ChartAnillo
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
                    />
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
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-[var(--border-subtle)] text-[12px] font-semibold uppercase tracking-[0.08em] text-tinta-500">
                          <th scope="col" className="px-4 py-2">Cliente</th>
                          <th scope="col" className="px-4 py-2">Pedidos</th>
                          <th scope="col" className="px-4 py-2">Ticket</th>
                          <th scope="col" className="px-4 py-2">Días pago</th>
                          <th scope="col" className="px-4 py-2">Último</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.clientes.map((c) => (
                          <tr
                            key={c.clienteId}
                            className="border-b border-[var(--border-subtle)]"
                          >
                            <td className="px-4 py-3 font-semibold">
                              {c.nombre}
                              {c.dejoDePedir && (
                                <span className="ml-2 text-xs font-semibold text-peligro">
                                  Dejó de pedir
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 tabular-nums">{c.pedidos}</td>
                            <td className="px-4 py-3">
                              <Money centavos={c.ticketPromedioCentavos} />
                            </td>
                            <td className="px-4 py-3 tabular-nums">
                              {c.diasPagoMediana}
                            </td>
                            <td className="px-4 py-3 tabular-nums text-tinta-500">
                              {c.ultimoPedidoFecha ?? "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
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
                    <ul>
                      {data.operacion.clientesSinPedido.map((c) => (
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
