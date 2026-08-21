"use client";

import { useMemo, useState } from "react";
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
import { useColaOffline } from "@/hooks/use-cola-offline";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { EstadoBadge } from "@/components/domain/estado-badge";
import { Money } from "@/components/domain/money";
import { EntregaForm } from "@/components/fulfillment/entrega-form";
import {
  ParadaCard,
  ParadaCardSkeleton,
} from "@/components/fulfillment/parada-card";
import { DialogoPago } from "@/components/receivables/dialogo-pago";
import { ChipInstalar } from "@/components/feedback/chip-instalar";
import { ClienteAvatar } from "@/components/catalog/cliente-avatar";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { toastFromError, toastSuccess } from "@/lib/toast";
import {
  saldoParadaCentavos,
  siguienteTrasCobro,
  siguienteTrasEntrega,
  siguienteTrasVolver,
  vistaInicialParada,
  type DestinoReparto,
  type VistaParada,
} from "@/lib/reparto-vista";

type FiltroRuta = "todas" | "pendientes" | "entregados";

export default function RepartoPage() {
  const cola = useColaOffline();
  const [sel, setSel] = useState<string | null>(null);
  const [vista, setVista] = useState<VistaParada>("entrega");
  const [filtro, setFiltro] = useState<FiltroRuta>("todas");
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
  const pendientes = total - entregados;

  const paradasFiltradas = useMemo(() => {
    const list = ruta.data?.paradas ?? [];
    if (filtro === "pendientes") {
      return list.filter((p) => p.estado !== "ENTREGADO");
    }
    if (filtro === "entregados") {
      return list.filter((p) => p.estado === "ENTREGADO");
    }
    return list;
  }, [ruta.data?.paradas, filtro]);

  function aplicarDestino(destino: DestinoReparto) {
    if (destino === "ruta") {
      setSel(null);
      return;
    }
    setVista(destino);
  }

  function abrir(p: RutaParada) {
    setSel(p.pedidoId);
    setError(undefined);
    setCantidades(new Map());
    const saldo = saldoParadaCentavos({
      saldoAnteriorCentavos: p.saldoAnteriorCentavos,
      facturaSaldoCentavos: p.factura?.saldoCentavos,
    });
    setVista(
      vistaInicialParada({
        estado: p.estado,
        saldoCentavos: saldo,
        entregaLocal: cola.pedidoPendiente(p.pedidoId),
      }),
    );
  }

  function volverDesde(vistaActual: VistaParada, p: RutaParada) {
    const yaEntregado =
      p.estado === "ENTREGADO" || cola.pedidoPendiente(p.pedidoId);
    aplicarDestino(
      siguienteTrasVolver({ vista: vistaActual, yaEntregado }),
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
      const saldo = saldoParadaCentavos({
        saldoAnteriorCentavos: paradaActual.saldoAnteriorCentavos,
        facturaSaldoCentavos: paradaActual.factura?.saldoCentavos,
      });
      aplicarDestino(siguienteTrasEntrega(saldo));
      toastSuccess(
        cola.online ? "Entrega guardada" : MENSAJE_GUARDAR_TELEFONO,
      );
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "No se pudo guardar en este teléfono";
      setError(msg);
      toastFromError(err, msg);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <PanelShell title="Reparto">
      {!sel && (
        <div className="grid gap-3">
          <ChipInstalar />
          <div className="grid grid-cols-2 gap-3">
            <Card>
              <div className="mst-label">Entregas</div>
              <div className="font-display text-3xl tabular-nums text-marca">
                {entregados}/{total}
              </div>
            </Card>
            <Card>
              <div className="mst-label">Cobrado hoy</div>
              <div className="font-display text-2xl tabular-nums text-marca">
                <Money centavos={ruta.data?.cobradoHoyCentavos ?? 0} />
              </div>
            </Card>
          </div>

          {total > 4 && (
            <SegmentedControl
              label="Filtrar paradas"
              value={filtro}
              onChange={setFiltro}
              fullWidth
              options={[
                { id: "todas", label: "Todas", count: total },
                { id: "pendientes", label: "Pendientes", count: pendientes },
                { id: "entregados", label: "Entregados", count: entregados },
              ]}
            />
          )}

          {ruta.isLoading && (
            <div className="grid gap-3">
              <ParadaCardSkeleton />
              <ParadaCardSkeleton />
              <ParadaCardSkeleton />
            </div>
          )}
          {ruta.isError && !ruta.data && (
            <EmptyState
              title={MENSAJE_RUTA_SIN_SNAPSHOT}
              description="Tony arranca en planta. Sin esa carga no hay paradas que inventar."
              icon={<Truck size={22} aria-hidden />}
            />
          )}
          {ruta.data && ruta.data.paradas.length === 0 && (
            <EmptyState
              title="No hay ruta hasta que se cierre la ventana"
              description="Al cerrar se pasan los pedidos a producción y aparecen aquí, ordenados por horario de entrega."
              icon={<Truck size={22} aria-hidden />}
            />
          )}
          {ruta.data &&
            ruta.data.paradas.length > 0 &&
            paradasFiltradas.length === 0 && (
              <EmptyState
                title={
                  filtro === "pendientes"
                    ? "No quedan pendientes"
                    : "Sin entregados aún"
                }
                description="Cambia el filtro para ver el resto de la ruta."
                icon={<Truck size={22} aria-hidden />}
              />
            )}
          {paradasFiltradas.map((p) => (
            <ParadaCard
              key={p.pedidoId}
              parada={p}
              sinSincronizar={cola.pedidoPendiente(p.pedidoId)}
              onAbrir={() => abrir(p)}
            />
          ))}
          <ListaColaErrores filas={cola.cola} />
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
          onBack={() => volverDesde("entrega", parada)}
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
          onBack={() => volverDesde("cobro", parada)}
          onCobrar={() => setCobrando(true)}
        />
      )}

      {parada && (
        <DialogoPago
          key={parada.pedidoId}
          open={cobrando}
          titulo="Registrar cobro"
          descripcion={`${parada.clienteNombre} · se aplica a la factura más antigua`}
          saldoCentavos={saldoParadaCentavos({
            saldoAnteriorCentavos: parada.saldoAnteriorCentavos,
            facturaSaldoCentavos: parada.factura?.saldoCentavos,
          })}
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
              .then(() => {
                setCobrando(false);
                aplicarDestino(siguienteTrasCobro());
                toastSuccess(
                  cola.online ? "Cobro guardado" : MENSAJE_GUARDAR_TELEFONO,
                );
              })
              .catch((err: unknown) => {
                const msg =
                  err instanceof ApiError || err instanceof Error
                    ? err.message
                    : "No se pudo guardar en este teléfono";
                setError(msg);
                toastFromError(err, msg);
              });
          }}
        />
      )}
    </PanelShell>
  );
}

/** Solo reintentos fallidos / sesión; OfflineBanner cubre la cola pendiente. */
function ListaColaErrores({ filas }: { filas: FilaCola[] }) {
  const problemas = filas.filter(
    (f) => f.estado === "error" || f.estado === "sesion",
  );
  if (problemas.length === 0) return null;
  return (
    <Card
      title="Reintentos en este teléfono"
      subtitle="Falló el envío. El cuadre solo con señal."
    >
      <ul className="grid gap-2 text-sm">
        {problemas.map((f) => (
          <li key={f.idempotencyKey} className="flex items-center gap-2">
            <EstadoBadge estado="SIN_SINCRONIZAR" size="sm" />
            <span className="min-w-0 flex-1 truncate">
              {f.tipo === "ENTREGA" ? "Entrega" : "Cobro"}
              {f.estado === "error" && f.errorMensaje
                ? ` · ${f.errorMensaje}`
                : ""}
              {f.estado === "sesion" ? " · inicia sesión" : ""}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function CabeceraParada({
  parada,
  sinSincronizar,
  onBack,
}: {
  parada: RutaParada;
  sinSincronizar: boolean;
  onBack: () => void;
}) {
  return (
    <div className="grid gap-3">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-marca focus-visible:outline-none focus-visible:shadow-foco"
      >
        <ChevronLeft size={16} aria-hidden />
        Ruta
      </button>
      <Card>
        <div className="flex items-start gap-3">
          <ClienteAvatar
            nombre={parada.clienteNombre}
            fotoAssetId={parada.fotoAssetId}
            size="md"
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-semibold text-pretty text-tinta-900">
                {parada.clienteNombre}
              </p>
              {sinSincronizar && (
                <EstadoBadge estado="SIN_SINCRONIZAR" size="sm" />
              )}
            </div>
            <p className="mt-0.5 text-xs tabular-nums text-tinta-500">
              Entrega {parada.horarioEntregaFijo ?? "sin horario fijo"}
              <span className="font-mono"> · #{parada.correlativo}</span>
            </p>
            {parada.notasPermanentes ? (
              <p className="mt-2 text-sm text-pretty text-tinta-800">
                {parada.notasPermanentes}
              </p>
            ) : null}
          </div>
          {parada.telefonoWa && (
            <a
              href={`tel:${parada.telefonoWa}`}
              aria-label={`Llamar a ${parada.clienteNombre}`}
              className="inline-flex h-[52px] shrink-0 items-center justify-center gap-2 rounded-pill border border-[var(--border-default)] bg-blanco px-4 text-base font-semibold text-tinta-900 shadow-[var(--shadow-xs)] no-underline transition-[border-color,box-shadow] duration-control ease-out hover:border-[var(--border-strong)] hover:bg-tinta-50 hover:no-underline focus-visible:outline-none focus-visible:shadow-foco"
            >
              <Phone size={18} aria-hidden />
              Llamar
            </a>
          )}
        </div>
      </Card>
    </div>
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
  const entregadoServidor = parada.estado === "ENTREGADO";
  const puedeAbrirCobro = entregadoServidor || sinSincronizar;
  const hint = !puedeEntregar
    ? "Producción ve la ruta; no marca entregas."
    : undefined;

  return (
    <div className="grid gap-3 pb-[calc(var(--bottombar-height)+4.5rem)]">
      <CabeceraParada
        parada={parada}
        sinSincronizar={sinSincronizar}
        onBack={onBack}
      />
      <Card
        flush
        title="Lo entregado"
        subtitle="La factura se calcula sobre esto, no sobre lo pedido"
      >
        <EntregaForm
          key={parada.pedidoId}
          items={parada.items}
          disabled={entregadoServidor}
          onChange={onCantidades}
        />
      </Card>
      {parada.saldoAnteriorCentavos > 0 && (
        <Card
          tone="accent"
          title="Saldo anterior"
          subtitle={`${parada.facturasPendientes} facturas pendientes`}
        >
          <div className="flex items-center justify-between gap-3">
            <Money
              centavos={parada.saldoAnteriorCentavos}
              tone="pendiente"
              className="text-lg"
            />
            <Button
              variant="secondary"
              size="md"
              onClick={onCobrar}
              disabled={!puedeAbrirCobro}
            >
              Registrar cobro
            </Button>
          </div>
        </Card>
      )}
      {error && (
        <p role="alert" className="text-sm text-peligro">
          {error}
        </p>
      )}
      {!online && (
        <p className="text-center text-xs text-aviso">{MENSAJE_SIN_SENAL}</p>
      )}
      {!puedeEntregar && (
        <p className="text-center text-xs text-tinta-500">
          Producción ve la misma ruta. No marca entregas.
        </p>
      )}
      <div className="fixed inset-x-0 bottom-[var(--bottombar-height)] z-20 border-t border-[var(--border-subtle)] bg-blanco/95 px-4 py-3 backdrop-blur-sm lg:static lg:inset-auto lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
        <div className="mx-auto w-full max-w-[var(--page-max)]">
          <Button
            variant="accent"
            size="lg"
            className="w-full"
            disabled={entregadoServidor || !puedeEntregar}
            title={hint}
            loading={loading}
            onClick={onEntregar}
          >
            {entregadoServidor
              ? "Entrega registrada"
              : online
                ? "Marcar como entregado"
                : MENSAJE_GUARDAR_TELEFONO}
          </Button>
        </div>
      </div>
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
  const saldo = saldoParadaCentavos({
    saldoAnteriorCentavos: parada.saldoAnteriorCentavos,
    facturaSaldoCentavos: parada.factura?.saldoCentavos,
  });
  const hint = !puedeCobrar ? "No tiene permiso para cobrar" : undefined;

  return (
    <div className="grid gap-3 pb-[calc(var(--bottombar-height)+4.5rem)]">
      <CabeceraParada
        parada={parada}
        sinSincronizar={sinSincronizar}
        onBack={onBack}
      />
      <Card
        title="Por cobrar"
        subtitle={`${parada.facturasPendientes} facturas pendientes`}
      >
        <div className="flex items-center gap-2">
          <Money centavos={saldo} tone="pendiente" className="text-3xl" />
          {sinSincronizar && <EstadoBadge estado="SIN_SINCRONIZAR" size="sm" />}
        </div>
      </Card>
      {error && (
        <p role="alert" className="text-sm text-peligro">
          {error}
        </p>
      )}
      {!online && (
        <p className="text-center text-xs text-aviso">{MENSAJE_SIN_SENAL}</p>
      )}
      <div className="fixed inset-x-0 bottom-[var(--bottombar-height)] z-20 border-t border-[var(--border-subtle)] bg-blanco/95 px-4 py-3 backdrop-blur-sm lg:static lg:inset-auto lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
        <div className="mx-auto w-full max-w-[var(--page-max)]">
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
        </div>
      </div>
    </div>
  );
}
