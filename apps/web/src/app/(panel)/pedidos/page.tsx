"use client";

import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ClipboardList, Plus, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  horaEnZona,
  tienePermiso,
  type ActorPublico,
  type CalendarioAhora,
  type ClientePublico,
  type PedidoBandeja,
  type PedidoDetalle as PedidoDetalleDto,
} from "@misupertostada/shared";
import { api } from "@/lib/api";
import {
  aplicarSegmentoLista,
  buildPedidosHref,
  estadoDeSegmento,
  filtrarBandeja,
  parsePedidoSegmento,
  type PedidoSegmento,
} from "@/lib/pedido-vista";
import { PanelShell } from "@/components/layout/panel-shell";
import { PedidoDetalle } from "@/components/ordering/pedido-detalle";
import { CapturaManual } from "@/components/ordering/captura-manual";
import { ClienteAvatar } from "@/components/catalog/cliente-avatar";
import { EstadoBadge } from "@/components/domain/estado-badge";
import { Money } from "@/components/domain/money";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DateField } from "@/components/ui/date-field";
import { SearchField } from "@/components/ui/search-field";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { EmptyState } from "@/components/ui/empty-state";
import { RowSkeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export default function PedidosPage() {
  const qc = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const clienteIdUrl = searchParams.get("clienteId") ?? "";
  const historialUrl = searchParams.get("historial") === "1";
  const pedidoIdUrl = searchParams.get("pedidoId");
  const fechaUrl = searchParams.get("fechaOperacion") ?? "";
  const segmentoUrl = parsePedidoSegmento(searchParams.get("estado"));

  const me = useQuery({
    queryKey: ["auth", "me"],
    queryFn: () => api<{ usuario: ActorPublico }>("/auth/me"),
  });
  const calendario = useQuery({
    queryKey: ["calendario", "ahora"],
    queryFn: () => api<CalendarioAhora>("/calendario/ahora"),
    enabled: Boolean(me.data),
  });
  const puedeEscribir = tienePermiso(
    me.data?.usuario.permisos ?? [],
    "pedidos.capturar_manual",
  );

  const [fecha, setFecha] = useState(fechaUrl);
  const [clienteId, setClienteId] = useState(clienteIdUrl);
  const [historialMode, setHistorialMode] = useState(
    historialUrl && Boolean(clienteIdUrl),
  );
  const [segmento, setSegmento] = useState<PedidoSegmento>(segmentoUrl);
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<string | null>(pedidoIdUrl);
  const [captura, setCaptura] = useState(false);

  // Sync when URL cambia (Hoy / ficha cliente).
  useEffect(() => {
    setClienteId(clienteIdUrl);
    setHistorialMode(historialUrl && Boolean(clienteIdUrl));
    if (fechaUrl) setFecha(fechaUrl);
    setSegmento(segmentoUrl);
    if (pedidoIdUrl) setSel(pedidoIdUrl);
  }, [clienteIdUrl, historialUrl, fechaUrl, segmentoUrl, pedidoIdUrl]);

  const historialCliente = Boolean(clienteId) && historialMode && !fecha;
  const fechaOperacion = historialCliente
    ? ""
    : fecha || calendario.data?.fechaOperacion || "";
  const estadoApi = estadoDeSegmento(segmento);

  const clientes = useQuery({
    queryKey: ["clientes"],
    queryFn: () => api<ClientePublico[]>("/clientes"),
    enabled: Boolean(me.data),
  });
  const pedidos = useQuery({
    queryKey: ["pedidos", { fechaOperacion, clienteId, estadoApi, historialCliente }],
    queryFn: () =>
      api<PedidoBandeja[]>(
        `/pedidos${queryString({
          fechaOperacion: fechaOperacion || undefined,
          clienteId: clienteId || undefined,
          estado: estadoApi,
          historial: historialCliente ? "1" : undefined,
        })}`,
      ),
    enabled: historialCliente || Boolean(fechaOperacion),
    placeholderData: keepPreviousData,
  });
  const detalle = useQuery({
    queryKey: ["pedidos", sel],
    queryFn: () => api<PedidoDetalleDto>(`/pedidos/${sel}`),
    enabled: Boolean(sel),
  });

  const clientePorId = useMemo(() => {
    const map = new Map<string, ClientePublico>();
    for (const c of clientes.data ?? []) map.set(c.id, c);
    return map;
  }, [clientes.data]);

  const lista = useMemo(() => {
    const segmentados = aplicarSegmentoLista(pedidos.data ?? [], segmento);
    return filtrarBandeja(segmentados, q);
  }, [pedidos.data, segmento, q]);

  const historialNombre = clienteId
    ? (clientePorId.get(clienteId)?.nombre ?? "cliente")
    : null;

  const meta = pedidos.data
    ? `${pedidos.data.length} pedido${pedidos.data.length === 1 ? "" : "s"}${
        fechaOperacion
          ? ` · ${formatearFechaCorta(fechaOperacion)}`
          : historialCliente
            ? " · historial"
            : ""
      }`
    : undefined;

  function syncUrl(next: {
    fecha?: string;
    clienteId?: string;
    historial?: boolean;
    pedidoId?: string | null;
    segmento?: PedidoSegmento;
  }) {
    const href = buildPedidosHref({
      fechaOperacion:
        next.fecha !== undefined
          ? next.fecha || undefined
          : historialCliente
            ? undefined
            : fechaOperacion || undefined,
      clienteId:
        next.clienteId !== undefined
          ? next.clienteId || undefined
          : clienteId || undefined,
      historial:
        next.historial !== undefined
          ? next.historial
          : historialCliente,
      pedidoId:
        next.pedidoId === null
          ? undefined
          : (next.pedidoId ?? sel) || undefined,
      estado: next.segmento ?? segmento,
    });
    if (href !== `${pathname}${searchParams.toString() ? `?${searchParams}` : ""}`) {
      router.replace(href, { scroll: false });
    }
  }

  function onFechaChange(next: string) {
    setFecha(next);
    if (next) setHistorialMode(false);
    else if (clienteId) setHistorialMode(true);
    syncUrl({
      fecha: next,
      historial: !next && Boolean(clienteId),
    });
  }

  function onSegmentoChange(next: PedidoSegmento) {
    setSegmento(next);
    syncUrl({ segmento: next });
  }

  function onSelect(id: string) {
    setSel(id);
    syncUrl({ pedidoId: id });
  }

  function salirHistorial() {
    setHistorialMode(false);
    setClienteId("");
    setFecha(calendario.data?.fechaOperacion ?? "");
    syncUrl({
      clienteId: "",
      historial: false,
      fecha: calendario.data?.fechaOperacion ?? "",
      pedidoId: null,
    });
    setSel(null);
  }

  return (
    <PanelShell title="Pedidos">
      <div className="grid gap-4">
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          <div className="flex min-w-0 items-center gap-2 overflow-x-auto sm:contents">
            {puedeEscribir ? (
              <Button
                size="sm"
                variant="accent"
                className="shrink-0"
                onClick={() => setCaptura(true)}
              >
                <Plus size={15} aria-hidden />
                Capturar pedido
              </Button>
            ) : null}
            <SearchField
              value={q}
              onChange={setQ}
              label="Buscar pedido"
              placeholder="Cliente o correlativo"
              className="min-w-[10rem] flex-1"
            />
            <SegmentedControl
              label="Filtrar por estado"
              value={segmento}
              onChange={onSegmentoChange}
              className="shrink-0"
              options={
                [
                  { id: "todos", label: "Todos" },
                  { id: "vivos", label: "Vivos" },
                  { id: "ANULADO", label: "Anulados" },
                ] as const
              }
            />
          </div>
        </div>

        {meta ? <p className="mst-label -mt-1 tabular-nums">{meta}</p> : null}

        <div className="grid gap-3 sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)] sm:items-end">
          <DateField
            id="filtro-fecha-operacion"
            label="Fecha de operación"
            value={
              fecha ||
              (historialCliente ? "" : (calendario.data?.fechaOperacion ?? ""))
            }
            onChange={onFechaChange}
            clearable={Boolean(clienteId)}
          />
          {historialCliente && historialNombre ? (
            <div className="flex min-h-11 items-center gap-2 rounded-campo border border-[var(--border-subtle)] bg-[var(--green-50)] px-3">
              <span className="min-w-0 flex-1 truncate text-sm font-semibold text-tinta-900 text-pretty">
                Historial de {historialNombre}
              </span>
              <Button
                size="sm"
                variant="secondary"
                onClick={salirHistorial}
                aria-label="Volver a la bandeja del día"
              >
                <X size={14} aria-hidden />
                Día
              </Button>
            </div>
          ) : null}
        </div>

        <div className="grid items-start gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
          <Card
            flush
            title="Pedidos"
            subtitle={
              historialCliente
                ? "Historial del cliente"
                : fechaOperacion || "Fecha de operación"
            }
            className={cn(sel && "hidden lg:block")}
          >
            <div
              className={cn(
                "border-t border-[var(--border-subtle)] transition-opacity duration-surface ease-out",
                pedidos.isFetching && pedidos.data ? "opacity-55" : "opacity-100",
              )}
              aria-busy={pedidos.isFetching || undefined}
            >
              {pedidos.isLoading && !pedidos.data ? (
                <RowSkeleton rows={8} />
              ) : lista.length === 0 ? (
                <EmptyState
                  icon={<ClipboardList size={22} aria-hidden />}
                  title={q ? "Sin resultados" : "Nadie ha pedido todavía"}
                  description={
                    q
                      ? "Pruebe con el nombre del restaurante o el correlativo."
                      : puedeEscribir
                        ? "Capture el extra de una llamada o espere al portal."
                        : "Los pedidos del portal y de tienda aparecen aquí."
                  }
                />
              ) : (
                <ul>
                  {lista.map((p) => {
                    const activo = p.id === sel;
                    const cliente = clientePorId.get(p.clienteId);
                    return (
                      <li key={p.id}>
                        <button
                          type="button"
                          onClick={() => onSelect(p.id)}
                          aria-current={activo ? "true" : undefined}
                          className={cn(
                            "grid min-h-fila w-full grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-0.5 border-b border-[var(--border-subtle)] px-4 py-2.5 text-left",
                            "border-l-[3px] transition-[background-color,border-color] duration-control ease-out",
                            "focus-visible:outline-none focus-visible:shadow-foco",
                            activo
                              ? "border-l-marca bg-[var(--green-50)]"
                              : "border-l-transparent hover:bg-tinta-50",
                          )}
                        >
                          <ClienteAvatar
                            nombre={p.clienteNombre}
                            fotoAssetId={cliente?.fotoAssetId}
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
                                <Money centavos={p.totalCentavos} tone="muted" />
                              </span>
                            </span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </Card>

          <div className={cn(!sel && "hidden lg:block")}>
            {sel ? (
              <div className="grid gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setSel(null);
                    syncUrl({ pedidoId: null });
                  }}
                  className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-marca hover:text-marca-hover lg:hidden"
                >
                  <ChevronLeft size={16} aria-hidden />
                  Pedidos
                </button>
                {detalle.isLoading || !detalle.data ? (
                  <Card>
                    <div className="grid gap-3">
                      <div className="h-6 w-48 animate-pulse rounded-campo bg-[var(--ink-100)]" />
                      <div className="h-32 animate-pulse rounded-campo bg-[var(--ink-100)]" />
                    </div>
                  </Card>
                ) : (
                  <PedidoDetalle
                    pedido={detalle.data}
                    puedeEscribir={puedeEscribir}
                    fotoAssetId={
                      clientePorId.get(detalle.data.clienteId)?.fotoAssetId
                    }
                  />
                )}
              </div>
            ) : (
              <EmptyState
                icon={<ClipboardList size={22} aria-hidden />}
                title="Elija un pedido"
                description="La lista de la izquierda muestra portal y llamadas del día de operación."
              />
            )}
          </div>
        </div>
      </div>

      <CapturaManual
        open={captura}
        onClose={() => setCaptura(false)}
        onCaptured={(pedido) => {
          setCaptura(false);
          setSel(pedido.id);
          void qc.invalidateQueries({ queryKey: ["pedidos"] });
          if (pedido.fechaOperacion !== fechaOperacion) {
            setFecha(pedido.fechaOperacion);
          }
          syncUrl({
            pedidoId: pedido.id,
            fecha: pedido.fechaOperacion,
            historial: false,
          });
        }}
      />
    </PanelShell>
  );
}

function queryString(params: Record<string, string | undefined>): string {
  const s = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v) s.set(k, v);
  }
  const out = s.toString();
  return out ? `?${out}` : "";
}

function formatearFechaCorta(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.toLocaleDateString("es-GT", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}
