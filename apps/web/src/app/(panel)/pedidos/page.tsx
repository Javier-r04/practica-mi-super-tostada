"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ClipboardList, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import {
  PEDIDO_ESTADOS,
  ESTADO_PRESENTACION,
  horaEnZona,
  tienePermiso,
  type ActorPublico,
  type CalendarioAhora,
  type ClientePublico,
  type PedidoBandeja,
  type PedidoDetalle as PedidoDetalleDto,
  type PedidoEstado,
} from "@misupertostada/shared";
import { api } from "@/lib/api";
import { PanelShell } from "@/components/layout/panel-shell";
import { PageToolbar } from "@/components/layout/page-header";
import { PedidoDetalle } from "@/components/ordering/pedido-detalle";
import { CapturaManual } from "@/components/ordering/captura-manual";
import { usePedidosSse } from "@/hooks/use-pedidos-sse";
import { EstadoBadge } from "@/components/domain/estado-badge";
import { Money } from "@/components/domain/money";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/field";
import { SearchField } from "@/components/ui/search-field";
import { EmptyState } from "@/components/ui/empty-state";
import { RowSkeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export default function PedidosPage() {
  const qc = useQueryClient();
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

  const [fecha, setFecha] = useState("");
  const [clienteId, setClienteId] = useState("");
  const [estado, setEstado] = useState<"" | PedidoEstado>("");
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<string | null>(null);
  const [captura, setCaptura] = useState(false);

  const fechaOperacion = fecha || calendario.data?.fechaOperacion || "";
  usePedidosSse(Boolean(me.data));

  const clientes = useQuery({
    queryKey: ["clientes"],
    queryFn: () => api<ClientePublico[]>("/clientes"),
    enabled: Boolean(me.data),
  });
  const pedidos = useQuery({
    queryKey: ["pedidos", { fechaOperacion, clienteId, estado }],
    queryFn: () =>
      api<PedidoBandeja[]>(
        `/pedidos${queryString({
          fechaOperacion,
          clienteId: clienteId || undefined,
          estado: estado || undefined,
        })}`,
      ),
    enabled: Boolean(fechaOperacion),
  });
  const detalle = useQuery({
    queryKey: ["pedidos", sel],
    queryFn: () => api<PedidoDetalleDto>(`/pedidos/${sel}`),
    enabled: Boolean(sel),
  });

  const lista = useMemo(() => {
    const rows = pedidos.data ?? [];
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter(
      (p) =>
        p.clienteNombre.toLowerCase().includes(needle) ||
        String(p.correlativo).includes(needle),
    );
  }, [pedidos.data, q]);

  return (
    <PanelShell title="Pedidos">
      <div className="grid gap-4">
        <PageToolbar
          description="Bandeja del día de operación. Varios pedidos del mismo cliente caben: el extra de una llamada es otro correlativo."
          meta={
            pedidos.data
              ? `${pedidos.data.length} pedido${pedidos.data.length === 1 ? "" : "s"}`
              : undefined
          }
          actions={
            puedeEscribir ? (
              <Button variant="accent" size="sm" onClick={() => setCaptura(true)}>
                <Plus size={15} aria-hidden />
                Capturar pedido
              </Button>
            ) : null
          }
        />

        <div className="grid gap-3 sm:grid-cols-3">
          <label className="grid gap-1.5">
            <span className="text-[12px] font-semibold uppercase tracking-[0.08em] text-tinta-500">
              Fecha de operación
            </span>
            <input
              type="date"
              value={fechaOperacion}
              onChange={(e) => setFecha(e.target.value)}
              className="h-campo w-full rounded-campo border border-[var(--border-default)] bg-blanco px-3 text-sm tabular-nums text-tinta-800 shadow-[var(--shadow-inset-field)] focus:border-[var(--border-focus)] focus:shadow-foco focus:outline-none"
            />
          </label>
          <Select
            id="filtro-cliente"
            label="Cliente"
            value={clienteId}
            onChange={(e) => setClienteId(e.target.value)}
          >
            <option value="">Todos</option>
            {(clientes.data ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </Select>
          <Select
            id="filtro-estado"
            label="Estado"
            value={estado}
            onChange={(e) => setEstado(e.target.value as "" | PedidoEstado)}
          >
            <option value="">Todos</option>
            {PEDIDO_ESTADOS.map((e) => (
              <option key={e} value={e}>
                {ESTADO_PRESENTACION[e].label}
              </option>
            ))}
          </Select>
        </div>

        <div className="grid items-start gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
          <Card
            flush
            title="Pedidos"
            subtitle={fechaOperacion || "Fecha de operación"}
            className={cn(sel && "hidden lg:block")}
          >
            <div className="px-4 pb-3">
              <SearchField
                value={q}
                onChange={setQ}
                placeholder="Cliente o correlativo"
                label="Buscar pedido"
              />
            </div>
            <div className="border-t border-[var(--border-subtle)]">
              {pedidos.isLoading ? (
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
                lista.map((p) => {
                  const activo = p.id === sel;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSel(p.id)}
                      className={cn(
                        "grid w-full gap-0.5 border-b border-[var(--border-subtle)] px-4 py-3 text-left",
                        "border-l-[3px] transition-[background-color,border-color] duration-control ease-out",
                        activo
                          ? "border-l-marca bg-[var(--green-50)]"
                          : "border-l-transparent hover:bg-tinta-50",
                      )}
                    >
                      <span className="flex items-center gap-2">
                        <span className="font-mono text-[12px] text-tinta-500">
                          #{p.correlativo}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-tinta-900">
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
                    </button>
                  );
                })
              )}
            </div>
          </Card>

          <div className={cn(!sel && "hidden lg:block")}>
            {sel ? (
              <div className="grid gap-3">
                <button
                  type="button"
                  onClick={() => setSel(null)}
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
