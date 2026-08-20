"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, Phone, Truck } from "lucide-react";
import {
  MENSAJE_SIN_SENAL,
  tienePermiso,
  type ActorPublico,
  type EntregaResultado,
  type PagoRegistroResultado,
  type RutaParada,
  type RutaReparto,
} from "@misupertostada/shared";
import { api, ApiError } from "@/lib/api";
import { PanelShell } from "@/components/layout/panel-shell";
import { usePedidosSse } from "@/hooks/use-pedidos-sse";
import { useOnline } from "@/hooks/use-online";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { EstadoBadge } from "@/components/domain/estado-badge";
import { Money } from "@/components/domain/money";
import { Badge } from "@/components/ui/badge";
import { EntregaForm } from "@/components/fulfillment/entrega-form";
import { DialogoPago } from "@/components/receivables/dialogo-pago";

export default function RepartoPage() {
  const qc = useQueryClient();
  const online = useOnline();
  const [sel, setSel] = useState<string | null>(null);
  const [vista, setVista] = useState<"entrega" | "cobro">("entrega");
  const [cantidades, setCantidades] = useState<Map<string, number>>(new Map());
  const [cobrando, setCobrando] = useState(false);
  const [error, setError] = useState<string>();

  const me = useQuery({
    queryKey: ["auth", "me"],
    queryFn: () => api<{ usuario: ActorPublico }>("/auth/me"),
  });
  const ruta = useQuery({
    queryKey: ["ruta"],
    queryFn: () => api<RutaReparto>("/reparto"),
    enabled: Boolean(me.data),
  });
  usePedidosSse(Boolean(me.data));

  const puedeEntregar = tienePermiso(
    me.data?.usuario.permisos ?? [],
    "pedidos.entregar",
  );
  const puedeCobrar = tienePermiso(
    me.data?.usuario.permisos ?? [],
    "cobranza.registrar_pago",
  );
  const parada = ruta.data?.paradas.find((p) => p.pedidoId === sel) ?? null;

  const entregar = useMutation({
    mutationFn: (body: unknown) =>
      api<EntregaResultado>("/entregas", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      setError(undefined);
      void qc.invalidateQueries({ queryKey: ["ruta"] });
      void qc.invalidateQueries({ queryKey: ["pedidos"] });
      void qc.invalidateQueries({ queryKey: ["cartera"] });
      setVista("cobro");
    },
    onError: (err) => {
      setError(
        err instanceof ApiError ? err.message : "No se pudo marcar la entrega",
      );
    },
  });

  const cobrar = useMutation({
    mutationFn: (body: unknown) =>
      api<PagoRegistroResultado>("/pagos", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      setCobrando(false);
      setError(undefined);
      void qc.invalidateQueries({ queryKey: ["ruta"] });
      void qc.invalidateQueries({ queryKey: ["cartera"] });
      void qc.invalidateQueries({ queryKey: ["cuadre"] });
    },
    onError: (err) => {
      setError(
        err instanceof ApiError ? err.message : "No se pudo registrar el cobro",
      );
    },
  });

  const entregados =
    ruta.data?.paradas.filter((p) => p.estado === "ENTREGADO").length ?? 0;
  const total = ruta.data?.paradas.length ?? 0;

  function abrir(p: RutaParada) {
    setSel(p.pedidoId);
    setError(undefined);
    setCantidades(new Map());
    const saldo =
      p.saldoAnteriorCentavos + (p.factura?.saldoCentavos ?? 0);
    setVista(p.estado === "ENTREGADO" && saldo > 0 ? "cobro" : "entrega");
  }

  return (
    <PanelShell title="Reparto">
      {!sel && (
        <div className="grid gap-3">
          <div className="grid grid-cols-2 gap-3">
            <Card>
              <div className="text-[12px] font-semibold uppercase tracking-[0.08em] text-tinta-500">
                Entregas
              </div>
              <div className="font-display text-3xl text-marca">
                {entregados}/{total}
              </div>
            </Card>
            <Card>
              <div className="text-[12px] font-semibold uppercase tracking-[0.08em] text-tinta-500">
                Fecha
              </div>
              <div className="text-sm font-semibold">
                {ruta.data?.fechaOperacion ?? "—"}
              </div>
            </Card>
          </div>
          {ruta.isLoading && <Skeleton className="h-40" />}
          {ruta.data && ruta.data.paradas.length === 0 && (
            <EmptyState
              title="No hay ruta hasta que se cierre la ventana"
              description="Al cerrar se pasan los pedidos a producción y aparecen aquí, ordenados por horario de entrega."
              icon={<Truck size={22} />}
            />
          )}
          {ruta.data?.paradas.map((p) => (
            <ParadaCard key={p.pedidoId} parada={p} onAbrir={() => abrir(p)} />
          ))}
        </div>
      )}

      {sel && parada && vista === "entrega" && (
        <DetalleEntrega
          parada={parada}
          online={online}
          puedeEntregar={puedeEntregar}
          error={error}
          loading={entregar.isPending}
          onBack={() => setSel(null)}
          onCantidades={setCantidades}
          onEntregar={() => {
            if (!online) {
              setError(MENSAJE_SIN_SENAL);
              return;
            }
            entregar.mutate({
              pedidoId: parada.pedidoId,
              items: parada.items.map((i) => ({
                productoId: i.productoId,
                cantidadEntregada:
                  cantidades.get(i.productoId) ?? i.cantidadPedida,
              })),
            });
          }}
          onCobrar={() => setVista("cobro")}
        />
      )}

      {sel && parada && vista === "cobro" && (
        <DetalleCobro
          parada={parada}
          online={online}
          puedeCobrar={puedeCobrar}
          error={error}
          onBack={() => setVista("entrega")}
          onCobrar={() => setCobrando(true)}
        />
      )}

      {parada && (
        <DialogoPago
          key={parada.pedidoId}
          open={cobrando}
          titulo="Registrar cobro"
          descripcion={`${parada.clienteNombre} · se aplica a la factura más antigua`}
          saldoCentavos={
            parada.saldoAnteriorCentavos + (parada.factura?.saldoCentavos ?? 0)
          }
          online={online}
          loading={cobrar.isPending}
          error={error}
          onClose={() => setCobrando(false)}
          onConfirm={(input) =>
            cobrar.mutate({
              id: input.id,
              idempotencyKey: `reparto-${input.id}`,
              clienteId: parada.clienteId,
              montoCentavos: input.montoCentavos,
              metodo: input.metodo,
              comprobanteAssetId: input.comprobanteAssetId,
            })
          }
        />
      )}
    </PanelShell>
  );
}

function ParadaCard({
  parada,
  onAbrir,
}: {
  parada: RutaParada;
  onAbrir: () => void;
}) {
  const hecho = parada.estado === "ENTREGADO";
  return (
    <button
      type="button"
      onClick={onAbrir}
      className="grid gap-1.5 rounded-tarjeta border border-[var(--border-subtle)] bg-blanco p-4 text-left shadow-tarjeta"
      style={{
        borderLeft: `4px solid ${hecho ? "var(--green-600)" : "var(--yellow-400)"}`,
      }}
    >
      <div className="flex items-center gap-2">
        <span className="font-display text-lg tabular-nums text-marca">
          {parada.horarioEntregaFijo ?? "—"}
        </span>
        <span className="min-w-0 flex-1 truncate font-semibold">
          {parada.clienteNombre}
        </span>
        <EstadoBadge estado={parada.estado} size="sm" />
      </div>
      <div className="flex items-center text-xs text-tinta-500">
        <span className="ml-auto">
          <Money centavos={parada.totalEstimadoCentavos} />
        </span>
      </div>
      {parada.saldoAnteriorCentavos > 0 && (
        <div className="flex items-center gap-2">
          <Badge tone="amber">Cobrar</Badge>
          <span className="text-xs font-semibold text-aviso">
            Saldo anterior{" "}
            <Money centavos={parada.saldoAnteriorCentavos} tone="pendiente" />
          </span>
        </div>
      )}
    </button>
  );
}

function DetalleEntrega({
  parada,
  online,
  puedeEntregar,
  error,
  loading,
  onBack,
  onCantidades,
  onEntregar,
  onCobrar,
}: {
  parada: RutaParada;
  online: boolean;
  puedeEntregar: boolean;
  error?: string;
  loading?: boolean;
  onBack: () => void;
  onCantidades: (c: Map<string, number>) => void;
  onEntregar: () => void;
  onCobrar: () => void;
}) {
  const entregado = parada.estado === "ENTREGADO";
  const hint = !puedeEntregar
    ? "Producción ve la ruta; no marca entregas."
    : !online
      ? MENSAJE_SIN_SENAL
      : undefined;

  return (
    <div className="grid max-w-[375px] gap-3">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-marca"
      >
        <ChevronLeft size={16} /> Ruta
      </button>
      <Card>
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <div className="font-semibold">{parada.clienteNombre}</div>
            <div className="text-xs text-tinta-500">
              Entrega {parada.horarioEntregaFijo ?? "sin horario fijo"}
            </div>
          </div>
          {parada.telefonoWa && (
            <a
              href={`tel:${parada.telefonoWa}`}
              className="inline-flex h-9 items-center justify-center gap-1 rounded-campo border border-[var(--border-default)] bg-blanco px-3 text-xs font-semibold"
            >
              <Phone size={15} /> Llamar
            </a>
          )}
        </div>
      </Card>
      <Card
        flush
        title="Lo entregado"
        subtitle="La factura se calcula sobre esto, no sobre lo pedido"
      >
        <EntregaForm
          key={parada.pedidoId}
          items={parada.items}
          disabled={entregado}
          onChange={onCantidades}
        />
      </Card>
      {parada.saldoAnteriorCentavos > 0 && (
        <Card
          tone="accent"
          title="Saldo anterior"
          subtitle={`${parada.facturasPendientes} facturas pendientes`}
        >
          <div className="flex items-center justify-between">
            <Money
              centavos={parada.saldoAnteriorCentavos}
              tone="pendiente"
              className="text-lg"
            />
            <Button size="sm" onClick={onCobrar} disabled={!entregado}>
              Registrar cobro
            </Button>
          </div>
        </Card>
      )}
      {error && <p className="text-sm text-peligro">{error}</p>}
      <Button
        variant="accent"
        size="lg"
        className="w-full"
        disabled={entregado || !puedeEntregar || !online}
        title={hint}
        loading={loading}
        onClick={onEntregar}
      >
        {entregado ? "Entrega registrada" : "Marcar como entregado"}
      </Button>
      {!online && (
        <p className="text-center text-xs text-aviso">{MENSAJE_SIN_SENAL}</p>
      )}
      {!puedeEntregar && (
        <p className="text-center text-xs text-tinta-500">
          Producción ve la misma ruta. No marca entregas.
        </p>
      )}
    </div>
  );
}

function DetalleCobro({
  parada,
  online,
  puedeCobrar,
  error,
  onBack,
  onCobrar,
}: {
  parada: RutaParada;
  online: boolean;
  puedeCobrar: boolean;
  error?: string;
  onBack: () => void;
  onCobrar: () => void;
}) {
  const saldo =
    parada.saldoAnteriorCentavos + (parada.factura?.saldoCentavos ?? 0);
  const hint = !puedeCobrar
    ? "No tiene permiso para cobrar"
    : !online
      ? MENSAJE_SIN_SENAL
      : undefined;

  return (
    <div className="grid max-w-[375px] gap-3">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-marca"
      >
        <ChevronLeft size={16} /> Volver
      </button>
      <Card
        title={parada.clienteNombre}
        subtitle={`${parada.facturasPendientes} facturas pendientes`}
      >
        <Money centavos={saldo} tone="pendiente" className="text-3xl" />
      </Card>
      {error && <p className="text-sm text-peligro">{error}</p>}
      <Button
        variant="accent"
        size="lg"
        className="w-full"
        disabled={!puedeCobrar || !online || saldo <= 0}
        title={hint}
        onClick={onCobrar}
      >
        Registrar cobro
      </Button>
      {!online && (
        <p className="text-center text-xs text-aviso">{MENSAJE_SIN_SENAL}</p>
      )}
    </div>
  );
}
