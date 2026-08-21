"use client";

import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  Banknote,
  ChevronDown,
  Filter,
  MessageCircle,
  X,
} from "lucide-react";
import {
  CARTERA_PAGE_SIZE_DEFAULT,
  formatearCentavos,
  PAGO_METODOS,
  tienePermiso,
  type ActorPublico,
  type CarteraLista,
  type CarteraResumen,
  type ClientePublico,
  type CuadreDia,
  type FacturaCartera,
  type PagoRegistroResultado,
} from "@misupertostada/shared";
import { api, ApiError } from "@/lib/api";
import { toastFromError, toastInfo, toastSuccess } from "@/lib/toast";
import { PanelShell } from "@/components/layout/panel-shell";
import { PageToolbar } from "@/components/layout/page-header";
import { useOnline } from "@/hooks/use-online";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { DateField } from "@/components/ui/date-field";
import { Droplist } from "@/components/ui/droplist";
import { SearchField } from "@/components/ui/search-field";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Skeleton } from "@/components/ui/skeleton";
import { ContadorFacturas } from "@/components/domain/contador-facturas";
import { Money } from "@/components/domain/money";
import { ClienteAvatar } from "@/components/catalog/cliente-avatar";
import {
  TablaCartera,
  type VistaCartera,
} from "@/components/receivables/tabla-cartera";
import { DialogoPago } from "@/components/receivables/dialogo-pago";
import { VistaCuadre } from "@/components/receivables/cuadre-dia";
import { cn } from "@/lib/utils";

type TabCartera = "todas" | "pendientes" | "vencidas";
type PanelCartera = "lista" | "cuadre";

export default function CarteraPage() {
  const qc = useQueryClient();
  const online = useOnline();
  const searchParams = useSearchParams();
  const clienteIdUrl = searchParams.get("clienteId") ?? "";

  const [tab, setTab] = useState<TabCartera>("pendientes");
  const [panel, setPanel] = useState<PanelCartera>("lista");
  const [vista, setVista] = useState<VistaCartera>("factura");
  const [q, setQ] = useState("");
  const qBusqueda = useDeferredValue(q.trim());
  const [clienteId, setClienteId] = useState(clienteIdUrl);
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [metodoPago, setMetodoPago] = useState("");
  const [sinDte, setSinDte] = useState(false);
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(Boolean(clienteIdUrl));
  const [alertaAbierta, setAlertaAbierta] = useState(true);
  const [cobrando, setCobrando] = useState<FacturaCartera | null>(null);
  const [pagoError, setPagoError] = useState<string>();

  const me = useQuery({
    queryKey: ["auth", "me"],
    queryFn: () => api<{ usuario: ActorPublico }>("/auth/me"),
  });

  const puedeDte = tienePermiso(
    me.data?.usuario.permisos ?? [],
    "cobranza.capturar_dte",
  );
  const puedeCobrar = tienePermiso(
    me.data?.usuario.permisos ?? [],
    "cobranza.registrar_pago",
  );
  const puedeRecordar = tienePermiso(
    me.data?.usuario.permisos ?? [],
    "mensajeria.enviar",
  );

  const filtros = {
    estado: tab,
    clienteId,
    desde,
    hasta,
    metodoPago,
    q: qBusqueda,
    sinDte,
  };

  const clientes = useQuery({
    queryKey: ["clientes"],
    queryFn: () => api<ClientePublico[]>("/clientes"),
    enabled: Boolean(me.data) && (filtrosAbiertos || Boolean(clienteId)),
  });
  const resumen = useQuery({
    queryKey: ["cartera", "resumen"],
    queryFn: () => api<CarteraResumen>("/cartera/resumen"),
    enabled: Boolean(me.data),
  });
  const facturas = useInfiniteQuery({
    queryKey: ["cartera", "lista", filtros],
    queryFn: ({ pageParam }) =>
      api<CarteraLista>(
        `/cartera${queryString({
          estado: tab,
          clienteId: clienteId || undefined,
          desde: desde || undefined,
          hasta: hasta || undefined,
          metodoPago: metodoPago || undefined,
          q: qBusqueda || undefined,
          sinDte: sinDte ? "1" : undefined,
          limit: String(CARTERA_PAGE_SIZE_DEFAULT),
          offset: String(pageParam),
        })}`,
      ),
    initialPageParam: 0,
    getNextPageParam: (last) =>
      last.hasMore ? last.offset + last.limit : undefined,
    enabled: Boolean(me.data),
  });
  const cuadre = useQuery({
    queryKey: ["cuadre"],
    queryFn: () => api<CuadreDia>("/cobranza/cuadre"),
    enabled: Boolean(me.data),
  });

  const lista = useMemo(
    () => facturas.data?.pages.flatMap((p) => p.items) ?? [],
    [facturas.data],
  );
  const counts = facturas.data?.pages[0]?.counts ?? {
    todas: 0,
    pendientes: 0,
    vencidas: 0,
  };
  const totalFiltrado = facturas.data?.pages[0]?.total ?? lista.length;

  const clienteNombre = useMemo(() => {
    if (!clienteId) return null;
    return (
      lista.find((f) => f.clienteId === clienteId)?.clienteNombre ??
      (clientes.data ?? []).find((c) => c.id === clienteId)?.nombre ??
      null
    );
  }, [clienteId, clientes.data, lista]);

  const chips = useMemo(() => {
    const out: { key: string; label: string; clear: () => void }[] = [];
    if (clienteId) {
      out.push({
        key: "cliente",
        label: clienteNombre ?? "Cliente",
        clear: () => setClienteId(""),
      });
    }
    if (desde) {
      out.push({
        key: "desde",
        label: `Desde ${desde}`,
        clear: () => setDesde(""),
      });
    }
    if (hasta) {
      out.push({
        key: "hasta",
        label: `Hasta ${hasta}`,
        clear: () => setHasta(""),
      });
    }
    if (metodoPago) {
      out.push({
        key: "metodo",
        label: metodoPago === "EFECTIVO" ? "Efectivo" : "Transferencia",
        clear: () => setMetodoPago(""),
      });
    }
    if (sinDte) {
      out.push({
        key: "sinDte",
        label: "Sin DTE",
        clear: () => setSinDte(false),
      });
    }
    return out;
  }, [clienteId, clienteNombre, desde, hasta, metodoPago, sinDte]);

  const hayFiltros = chips.length > 0 || Boolean(q.trim());
  const sobreLimite = resumen.data?.clientesSobreLimite ?? [];
  const alertaAutoColapsada = useRef(false);
  useEffect(() => {
    if (alertaAutoColapsada.current || !resumen.data) return;
    alertaAutoColapsada.current = true;
    if (sobreLimite.length > 3) setAlertaAbierta(false);
  }, [resumen.data, sobreLimite.length]);

  const dte = useMutation({
    mutationFn: ({ id, numeroDte }: { id: string; numeroDte: string }) =>
      api(`/facturas/${id}/dte`, {
        method: "PATCH",
        body: JSON.stringify({ numeroDte }),
      }),
    onSuccess: () => {
      toastSuccess("DTE guardado");
      void qc.invalidateQueries({ queryKey: ["cartera"] });
    },
    onError: (err) => toastFromError(err, "No se pudo guardar el DTE"),
  });

  const pagar = useMutation({
    mutationFn: (body: unknown) =>
      api<PagoRegistroResultado>("/pagos", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      setCobrando(null);
      setPagoError(undefined);
      toastSuccess("Pago registrado");
      void qc.invalidateQueries({ queryKey: ["cartera"] });
      void qc.invalidateQueries({ queryKey: ["cuadre"] });
      void qc.invalidateQueries({ queryKey: ["ruta"] });
    },
    onError: (err) => {
      const msg =
        err instanceof ApiError ? err.message : "No se pudo registrar el pago";
      setPagoError(msg);
      toastFromError(err, "No se pudo registrar el pago");
    },
  });

  const recordar = useMutation({
    mutationFn: (id: string) =>
      api<{ encolado: boolean }>(`/cartera/clientes/${id}/recordatorio`, {
        method: "POST",
      }),
    onSuccess: (data) => {
      if (data.encolado) toastSuccess("Recordatorio encolado");
      else toastInfo("Ya se envió un recordatorio hoy");
    },
    onError: (err) =>
      toastFromError(err, "No se pudo encolar el recordatorio"),
  });

  const hintDte = puedeDte
    ? undefined
    : "Solo tienda o administración captura el DTE";
  const hintCobro = puedeCobrar
    ? undefined
    : "No tiene permiso para registrar pagos";

  function limpiarFiltros() {
    setClienteId("");
    setDesde("");
    setHasta("");
    setMetodoPago("");
    setSinDte(false);
    setQ("");
  }

  return (
    <PanelShell title="Cartera">
      <div className="grid gap-4">
        <PageToolbar
          description="Facturas abiertas, captura de DTE y cobros. El límite de crédito es alerta, no candado."
          meta={
            resumen.data
              ? `${resumen.data.pendientesCount} pendiente${
                  resumen.data.pendientesCount === 1 ? "" : "s"
                } · ${formatearCentavos(resumen.data.pendientesSaldoCentavos)}`
              : undefined
          }
        />

        <div className="grid gap-3 sm:grid-cols-2">
          <ContadorFacturas
            pendientes={resumen.data?.pendientesCount ?? 0}
            montoCentavos={resumen.data?.pendientesSaldoCentavos}
            etiqueta="Facturas pendientes"
          />
          <button
            type="button"
            onClick={() => setPanel("cuadre")}
            className="flex flex-col justify-center rounded-tarjeta border border-[var(--border-subtle)] bg-blanco px-4 py-3 text-left shadow-tarjeta transition-[border-color] duration-150 hover:border-[var(--border-accent)] focus-visible:outline-none focus-visible:shadow-foco"
          >
            <span className="mst-label">Cobrado hoy</span>
            <Money
              centavos={resumen.data?.cobradoHoyCentavos ?? 0}
              tone="pagado"
              className="mt-1 text-2xl"
            />
            <span className="mt-1 text-xs text-tinta-500">Ver cuadre del día →</span>
          </button>
        </div>

        {sobreLimite.length > 0 ? (
          <Card flush>
            <button
              type="button"
              onClick={() => setAlertaAbierta((v) => !v)}
              className="flex w-full items-center gap-2 px-4 py-3 text-left"
              aria-expanded={alertaAbierta}
            >
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-tinta-900">
                  Al límite de crédito
                </p>
                <p className="mst-label mt-0.5">
                  {sobreLimite.length} restaurante
                  {sobreLimite.length === 1 ? "" : "s"} · alerta, no candado
                </p>
              </div>
              <ChevronDown
                size={18}
                className={cn(
                  "shrink-0 text-tinta-500 transition-transform",
                  alertaAbierta && "rotate-180",
                )}
                aria-hidden
              />
            </button>
            {alertaAbierta ? (
              <ul className="grid max-h-56 gap-2 overflow-y-auto border-t border-[var(--border-subtle)] px-4 py-3">
                {sobreLimite.map((c) => (
                  <li
                    key={c.clienteId}
                    className="flex min-h-12 flex-wrap items-center gap-3 rounded-[calc(var(--radius-card)-0.5rem)] border border-peligro/35 bg-tinta-50 px-3 py-2.5"
                  >
                    <ClienteAvatar
                      nombre={c.nombre}
                      fotoAssetId={c.fotoAssetId}
                      size="sm"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-tinta-900">
                        {c.nombre}
                      </p>
                      <p className="mst-label mt-0.5 tabular-nums text-peligro">
                        {c.pendientes}/{c.limite} facturas pendientes
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="shrink-0"
                      disabled={!puedeRecordar || recordar.isPending}
                      title={
                        puedeRecordar
                          ? "Envía el estado de cuenta por WhatsApp"
                          : "No tiene permiso para enviar WhatsApp"
                      }
                      loading={
                        recordar.isPending && recordar.variables === c.clienteId
                      }
                      onClick={() => recordar.mutate(c.clienteId)}
                    >
                      <MessageCircle size={15} aria-hidden />
                      Recordar
                    </Button>
                  </li>
                ))}
              </ul>
            ) : null}
          </Card>
        ) : null}

        <SegmentedControl
          label="Panel cartera"
          value={panel}
          onChange={setPanel}
          fullWidth
          options={
            [
              { id: "lista", label: "Facturas" },
              { id: "cuadre", label: "Cuadre del día" },
            ] as const
          }
        />

        {panel === "cuadre" ? (
          cuadre.data ? (
            <VistaCuadre cuadre={cuadre.data} />
          ) : (
            <Skeleton className="h-48 w-full rounded-tarjeta" />
          )
        ) : (
          <Card flush>
            <div className="sticky top-0 z-[2] grid gap-3 border-b border-[var(--border-subtle)] bg-blanco px-3 py-3 sm:px-4">
              <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
                <SearchField
                  value={q}
                  onChange={setQ}
                  label="Buscar factura"
                  placeholder="Restaurante, DTE o #pedido"
                  className="min-w-0 flex-1"
                />
                <div className="flex shrink-0 items-center gap-2 overflow-x-auto">
                  <SegmentedControl
                    label="Estado de facturas"
                    value={tab}
                    onChange={setTab}
                    className="shrink-0"
                    options={
                      [
                        {
                          id: "pendientes",
                          label: "Pendientes",
                          count: counts.pendientes,
                        },
                        {
                          id: "vencidas",
                          label: "Vencidas",
                          count: counts.vencidas,
                        },
                        { id: "todas", label: "Todas", count: counts.todas },
                      ] as const
                    }
                  />
                  <Button
                    size="sm"
                    variant={filtrosAbiertos || hayFiltros ? "secondary" : "ghost"}
                    className="shrink-0"
                    aria-expanded={filtrosAbiertos}
                    onClick={() => setFiltrosAbiertos((v) => !v)}
                  >
                    <Filter size={15} aria-hidden />
                    Filtros
                    {chips.length > 0 ? (
                      <span className="tabular-nums">{chips.length}</span>
                    ) : null}
                  </Button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <SegmentedControl
                  label="Agrupar lista"
                  value={vista}
                  onChange={setVista}
                  className="shrink-0"
                  options={
                    [
                      { id: "factura", label: "Por factura" },
                      { id: "cliente", label: "Por cliente" },
                    ] as const
                  }
                />
                <button
                  type="button"
                  onClick={() => setSinDte((v) => !v)}
                  className={cn(
                    "inline-flex min-h-8 items-center rounded-pill border px-2.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:shadow-foco",
                    sinDte
                      ? "border-aviso bg-aviso/10 text-aviso"
                      : "border-[var(--border-subtle)] bg-tinta-50 text-tinta-800 hover:border-[var(--border-accent)]",
                  )}
                >
                  Sin DTE
                </button>
                {chips.map((chip) => (
                  <button
                    key={chip.key}
                    type="button"
                    onClick={chip.clear}
                    className="inline-flex min-h-8 items-center gap-1.5 rounded-pill border border-[var(--border-subtle)] bg-tinta-50 px-2.5 text-xs font-semibold text-tinta-800 transition-colors hover:border-[var(--border-accent)] focus-visible:outline-none focus-visible:shadow-foco"
                  >
                    {chip.label}
                    <X size={12} aria-hidden />
                    <span className="sr-only">Quitar filtro</span>
                  </button>
                ))}
                {hayFiltros ? (
                  <Button size="sm" variant="secondary" onClick={limpiarFiltros}>
                    Limpiar
                  </Button>
                ) : null}
                {facturas.data ? (
                  <p className="mst-label ml-auto tabular-nums">
                    {lista.length}
                    {totalFiltrado > lista.length
                      ? ` de ${totalFiltrado}`
                      : ""}{" "}
                    factura{totalFiltrado === 1 ? "" : "s"}
                  </p>
                ) : null}
              </div>

              {filtrosAbiertos ? (
                <div className="grid gap-3 border-t border-[var(--border-subtle)] pt-3 sm:grid-cols-2 lg:grid-cols-4">
                  <Droplist
                    id="filtro-cliente"
                    label="Cliente"
                    value={clienteId}
                    onChange={setClienteId}
                    searchable
                    searchPlaceholder="Buscar restaurante"
                    options={[
                      { value: "", label: "Todos" },
                      ...(clientes.data ?? []).map((c) => ({
                        value: c.id,
                        label: c.nombre,
                      })),
                    ]}
                  />
                  <DateField
                    id="filtro-desde"
                    label="Desde"
                    value={desde}
                    onChange={setDesde}
                  />
                  <DateField
                    id="filtro-hasta"
                    label="Hasta"
                    value={hasta}
                    onChange={setHasta}
                  />
                  <Droplist
                    id="filtro-metodo"
                    label="Método de pago"
                    value={metodoPago}
                    onChange={setMetodoPago}
                    options={[
                      { value: "", label: "Todos" },
                      ...PAGO_METODOS.map((m) => ({
                        value: m,
                        label: m === "EFECTIVO" ? "Efectivo" : "Transferencia",
                      })),
                    ]}
                  />
                </div>
              ) : null}
            </div>

            {facturas.isLoading && !facturas.data ? (
              <div className="grid gap-3 p-4">
                {Array.from({ length: 4 }, (_, i) => (
                  <Skeleton key={i} className="h-24 w-full rounded-tarjeta" />
                ))}
              </div>
            ) : null}

            <div
              className={cn(
                "transition-opacity duration-surface ease-out",
                facturas.isFetching && facturas.data
                  ? "opacity-55"
                  : "opacity-100",
              )}
              aria-busy={facturas.isFetching || undefined}
            >
              {facturas.data && lista.length === 0 ? (
                <EmptyState
                  title={
                    hayFiltros || tab !== "todas"
                      ? "Ninguna factura coincide"
                      : "No hay facturas"
                  }
                  description={
                    hayFiltros
                      ? "Quite un filtro o amplíe el rango de fechas."
                      : tab === "vencidas"
                        ? "No hay facturas vencidas en este momento."
                        : tab === "pendientes"
                          ? "Nadie tiene saldo abierto. Al entregar un pedido se crea la factura."
                          : "Al entregar un pedido se crea la factura sobre lo entregado."
                  }
                  icon={<Banknote size={22} />}
                  action={
                    hayFiltros ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          limpiarFiltros();
                          setTab("pendientes");
                        }}
                      >
                        Limpiar filtros
                      </Button>
                    ) : null
                  }
                />
              ) : null}

              {lista.length > 0 ? (
                <TablaCartera
                  facturas={lista}
                  vista={vista}
                  puedeDte={puedeDte}
                  puedeCobrar={puedeCobrar}
                  puedeRecordar={puedeRecordar}
                  hintDte={hintDte}
                  hintCobro={hintCobro}
                  dteLoadingId={dte.isPending ? dte.variables?.id : undefined}
                  recordarLoadingId={
                    recordar.isPending ? recordar.variables : undefined
                  }
                  onCobrar={setCobrando}
                  onDte={(fac, numeroDte) =>
                    dte.mutate({ id: fac.id, numeroDte })
                  }
                  onRecordar={(id) => recordar.mutate(id)}
                />
              ) : null}

              {facturas.hasNextPage ? (
                <div className="border-t border-[var(--border-subtle)] p-4">
                  <Button
                    variant="secondary"
                    className="w-full"
                    loading={facturas.isFetchingNextPage}
                    onClick={() => void facturas.fetchNextPage()}
                  >
                    Cargar más
                  </Button>
                </div>
              ) : null}
            </div>
          </Card>
        )}
      </div>

      {cobrando ? (
        <DialogoPago
          key={cobrando.id}
          open
          titulo="Registrar pago"
          descripcion={`${cobrando.clienteNombre} · ${cobrando.numeroDte ?? "Sin DTE"}`}
          saldoCentavos={cobrando.saldoCentavos}
          online={online}
          loading={pagar.isPending}
          error={pagoError}
          onClose={() => {
            setCobrando(null);
            setPagoError(undefined);
          }}
          onConfirm={(input) =>
            pagar.mutate({
              id: input.id,
              idempotencyKey: `cartera-${input.id}`,
              facturaId: cobrando.id,
              montoCentavos: input.montoCentavos,
              metodo: input.metodo,
              comprobanteAssetId: input.comprobanteAssetId,
            })
          }
        />
      ) : null}
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
