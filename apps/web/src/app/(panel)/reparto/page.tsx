"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, Phone, Truck } from "lucide-react";
import {
  MENSAJE_GUARDAR_TELEFONO,
  MENSAJE_RUTA_SIN_SNAPSHOT,
  MENSAJE_SIN_SENAL,
  tienePermiso,
  type ActorPublico,
  type FilaCola,
  type RutaParada,
  type RutaReparto,
} from "@misupertostada/shared";
import { api, ApiError } from "@/lib/api";
import { PanelShell } from "@/components/layout/panel-shell";
import { usePedidosSse } from "@/hooks/use-pedidos-sse";
import { useColaOffline } from "@/hooks/use-cola-offline";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { EstadoBadge } from "@/components/domain/estado-badge";
import { Money } from "@/components/domain/money";
import { Badge } from "@/components/ui/badge";
import { EntregaForm } from "@/components/fulfillment/entrega-form";
import { DialogoPago } from "@/components/receivables/dialogo-pago";
import { ChipInstalar } from "@/components/feedback/chip-instalar";

export default function RepartoPage() {
  const cola = useColaOffline();
  const [sel, setSel] = useState<string | null>(null);
  const [vista, setVista] = useState<"entrega" | "cobro">("entrega");
  const [cantidades, setCantidades] = useState<Map<string, number>>(new Map());
  const [cobrando, setCobrando] = useState(false);
  const [error, setError] = useState<string>();
  const [guardando, setGuardando] = useState(false);

  const me = useQuery({
    queryKey: ["auth", "me"],
    queryFn: () => api<{ usuario: ActorPublico }>("/auth/me"),
  });
  const ruta = useQuery({
    queryKey: ["ruta"],
    queryFn: async () => {
      try {
        const data = await api<RutaReparto>("/reparto");
        await cola.guardarSnapshot(data);
        return data;
      } catch (err) {
        const snap = await cola.leerSnapshot();
        if (snap) return snap;
        throw err;
      }
    },
    enabled: Boolean(me.data) && cola.listo,
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

  const entregados =
    ruta.data?.paradas.filter((p) => p.estado === "ENTREGADO").length ?? 0;
  const total = ruta.data?.paradas.length ?? 0;

  function abrir(p: RutaParada) {
    setSel(p.pedidoId);
    setError(undefined);
    setCantidades(new Map());
    const saldo = p.saldoAnteriorCentavos + (p.factura?.saldoCentavos ?? 0);
    const entregaLocal = cola.pedidoPendiente(p.pedidoId);
    setVista(
      (p.estado === "ENTREGADO" || entregaLocal) && saldo > 0 ? "cobro" : "entrega",
    );
  }

  async function guardarEntrega(paradaActual: RutaParada) {
    setError(undefined);
    setGuardando(true);
    try {
      await cola.encolarEntrega({
        tipo: "ENTREGA",
        idempotencyKey: crypto.randomUUID(),
        pedidoId: paradaActual.pedidoId,
        items: paradaActual.items.map((i) => ({
          productoId: i.productoId,
          cantidadEntregada: cantidades.get(i.productoId) ?? i.cantidadPedida,
        })),
      });
      setVista("cobro");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar en este teléfono");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <PanelShell title="Reparto">
      {!sel && (
        <div className="grid gap-3">
          <div className="flex items-center justify-between gap-2">
            <ChipInstalar />
          </div>
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
          {ruta.isError && !ruta.data && (
            <EmptyState
              title={MENSAJE_RUTA_SIN_SNAPSHOT}
              description="Tony arranca en planta. Sin esa carga no hay paradas que inventar."
              icon={<Truck size={22} />}
            />
          )}
          {ruta.data && ruta.data.paradas.length === 0 && (
            <EmptyState
              title="No hay ruta hasta que se cierre la ventana"
              description="Al cerrar se pasan los pedidos a producción y aparecen aquí, ordenados por horario de entrega."
              icon={<Truck size={22} />}
            />
          )}
          {ruta.data?.paradas.map((p) => (
            <ParadaCard
              key={p.pedidoId}
              parada={p}
              sinSincronizar={cola.pedidoPendiente(p.pedidoId)}
              onAbrir={() => abrir(p)}
            />
          ))}
          <ListaCola filas={cola.cola} />
        </div>
      )}

      {sel && parada && vista === "entrega" && (
        <DetalleEntrega
          parada={parada}
          online={cola.online}
          puedeEntregar={puedeEntregar}
          error={error}
          loading={guardando}
          sinSincronizar={cola.pedidoPendiente(parada.pedidoId)}
          onBack={() => setSel(null)}
          onCantidades={setCantidades}
          onEntregar={() => void guardarEntrega(parada)}
          onCobrar={() => setVista("cobro")}
        />
      )}

      {sel && parada && vista === "cobro" && (
        <DetalleCobro
          parada={parada}
          online={cola.online}
          puedeCobrar={puedeCobrar}
          error={error}
          sinSincronizar={cola.pedidoPendiente(parada.pedidoId)}
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
          online={cola.online}
          permitirOffline
          error={error}
          onClose={() => setCobrando(false)}
          onConfirm={(input) => {
            setError(undefined);
            const blobId =
              input.metodo === "TRANSFERENCIA" ? crypto.randomUUID() : undefined;
            void cola
              .encolarPago(
                {
                  tipo: "PAGO",
                  idempotencyKey: input.id,
                  pagoId: input.id,
                  clienteId: parada.clienteId,
                  pedidoId: parada.pedidoId,
                  montoCentavos: input.montoCentavos,
                  metodo: input.metodo,
                  blobId,
                },
                input.archivo,
              )
              .then(() => setCobrando(false))
              .catch((err: unknown) => {
                setError(
                  err instanceof ApiError || err instanceof Error
                    ? err.message
                    : "No se pudo guardar en este teléfono",
                );
              });
          }}
        />
      )}
    </PanelShell>
  );
}

function ListaCola({ filas }: { filas: FilaCola[] }) {
  if (filas.length === 0) return null;
  return (
    <Card title="Cola de este teléfono" subtitle="Se envía al recuperar señal. El cuadre solo con señal.">
      <ul className="grid gap-2 text-sm">
        {filas.map((f) => (
          <li key={f.idempotencyKey} className="flex items-center gap-2">
            <EstadoBadge estado="SIN_SINCRONIZAR" size="sm" />
            <span className="min-w-0 flex-1 truncate">
              {f.tipo === "ENTREGA" ? "Entrega" : "Cobro"}
              {f.estado === "error" && f.errorMensaje ? ` · ${f.errorMensaje}` : ""}
              {f.estado === "sesion" ? " · inicia sesión" : ""}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function ParadaCard({
  parada,
  sinSincronizar,
  onAbrir,
}: {
  parada: RutaParada;
  sinSincronizar: boolean;
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
        {sinSincronizar ? (
          <EstadoBadge estado="SIN_SINCRONIZAR" size="sm" />
        ) : (
          <EstadoBadge estado={parada.estado} size="sm" />
        )}
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
  sinSincronizar,
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
  sinSincronizar: boolean;
  onBack: () => void;
  onCantidades: (c: Map<string, number>) => void;
  onEntregar: () => void;
  onCobrar: () => void;
}) {
  const entregado = parada.estado === "ENTREGADO";
  const hint = !puedeEntregar
    ? "Producción ve la ruta; no marca entregas."
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
            <div className="flex items-center gap-2">
              <div className="font-semibold">{parada.clienteNombre}</div>
              {sinSincronizar && <EstadoBadge estado="SIN_SINCRONIZAR" size="sm" />}
            </div>
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
            <Button size="sm" onClick={onCobrar} disabled={!entregado && !sinSincronizar}>
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
        disabled={entregado || !puedeEntregar}
        title={hint}
        loading={loading}
        onClick={onEntregar}
      >
        {entregado
          ? "Entrega registrada"
          : online
            ? "Marcar como entregado"
            : MENSAJE_GUARDAR_TELEFONO}
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
  sinSincronizar,
  onBack,
  onCobrar,
}: {
  parada: RutaParada;
  online: boolean;
  puedeCobrar: boolean;
  error?: string;
  sinSincronizar: boolean;
  onBack: () => void;
  onCobrar: () => void;
}) {
  const saldo =
    parada.saldoAnteriorCentavos + (parada.factura?.saldoCentavos ?? 0);
  const hint = !puedeCobrar ? "No tiene permiso para cobrar" : undefined;

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
        <div className="flex items-center gap-2">
          <Money centavos={saldo} tone="pendiente" className="text-3xl" />
          {sinSincronizar && <EstadoBadge estado="SIN_SINCRONIZAR" size="sm" />}
        </div>
      </Card>
      {error && <p className="text-sm text-peligro">{error}</p>}
      <Button
        variant="accent"
        size="lg"
        className="w-full"
        disabled={!puedeCobrar || saldo <= 0}
        title={hint}
        onClick={onCobrar}
      >
        {online ? "Registrar cobro" : MENSAJE_GUARDAR_TELEFONO}
      </Button>
      {!online && (
        <p className="text-center text-xs text-aviso">{MENSAJE_SIN_SENAL}</p>
      )}
    </div>
  );
}
