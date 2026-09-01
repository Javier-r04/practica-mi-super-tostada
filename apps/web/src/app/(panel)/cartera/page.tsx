"use client";

import {
  Suspense,
  useDeferredValue,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useSearchParams } from "next/navigation";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  Button,
  Card,
  ComboBox,
  Disclosure,
  Input,
  Label,
  ListBox,
  SearchField,
  Select,
  Spinner,
  ToggleButton,
  ToggleButtonGroup,
} from "@heroui/react";
import { Banknote, Filter, MessageCircle, X } from "lucide-react";
import {
  CARTERA_PAGE_SIZE_DEFAULT,
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
import { EmptyState } from "@/components/ui/empty-state";
import { DateField } from "@/components/ui/date-field";
import { Skeleton } from "@/components/ui/skeleton";
import { Money } from "@/components/domain/money";
import { ClienteAvatar } from "@/components/catalog/cliente-avatar";
import {
  TablaCartera,
  type VistaCartera,
} from "@/components/receivables/tabla-cartera";
import { DialogoPago } from "@/components/receivables/dialogo-pago";
import { VistaCuadre } from "@/components/receivables/cuadre-dia";
import { BandejaTransferencias } from "@/components/receivables/bandeja-transferencias";
import { cn } from "@/lib/utils";
import {
  etiquetaDiaSemanaCorto,
  hoyCivilIso,
  PRESETS_CALENDARIO,
} from "@/lib/fecha-ui";

type TabCartera = "todas" | "pendientes" | "vencidas";
type PanelCartera = "lista" | "cuadre" | "transferencias";

type CobroCliente = {
  clienteId: string;
  clienteNombre: string;
  saldoCentavos: number;
};

const PANELES = [
  { id: "lista", label: "Facturas" },
  { id: "transferencias", label: "Transferencias" },
  { id: "cuadre", label: "Cuadre del día" },
] as const;

const VISTAS = [
  { id: "factura", label: "Por factura" },
  { id: "cliente", label: "Por cliente" },
] as const;

/** `""` no sirve como `Key` de React Aria: "todos" es el centinela de «sin filtro». */
const TODOS = "todos";

function CarteraInner() {
  const qc = useQueryClient();
  const online = useOnline();
  const searchParams = useSearchParams();
  const clienteIdUrl = searchParams.get("clienteId") ?? "";
  const panelUrl = searchParams.get("panel");

  const [tab, setTab] = useState<TabCartera>("pendientes");
  const [panel, setPanel] = useState<PanelCartera>(() => {
    if (panelUrl === "transferencias" || panelUrl === "cuadre") return panelUrl;
    return "lista";
  });
  const [vista, setVista] = useState<VistaCartera>("factura");
  const [q, setQ] = useState("");
  const qBusqueda = useDeferredValue(q.trim());
  const [clienteId, setClienteId] = useState(clienteIdUrl);
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [metodoPago, setMetodoPago] = useState("");
  // Día del cuadre. "" = hoy, que es lo que responde la API sin `?fecha=`.
  // Carla necesita cuadrar días pasados; `/reparto` en cambio se queda fijo en
  // hoy a propósito, porque ahí las acciones se encolan y se sincronizan solas.
  const [fechaCuadre, setFechaCuadre] = useState("");
  const [sinDte, setSinDte] = useState(false);
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(Boolean(clienteIdUrl));
  // `null` = todavía no la tocaron: la apertura la decide el tamaño de la
  // lista. Se deriva en vez de auto-colapsar desde un efecto, que además
  // pintaba la alerta abierta un frame antes de cerrarla.
  const [alertaTocada, setAlertaTocada] = useState<boolean | null>(null);
  const [cobrando, setCobrando] = useState<CobroCliente | null>(null);
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
  const puedeConfirmar = tienePermiso(
    me.data?.usuario.permisos ?? [],
    "cobranza.confirmar_transferencia",
  );

  function abrirCobro(fac: FacturaCartera) {
    const saldo = lista
      .filter((f) => f.clienteId === fac.clienteId && f.estado !== "PAGADO")
      .reduce((acc, f) => acc + f.saldoCentavos, 0);
    setCobrando({
      clienteId: fac.clienteId,
      clienteNombre: fac.clienteNombre,
      saldoCentavos: saldo,
    });
  }

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
    queryKey: ["cuadre", fechaCuadre],
    queryFn: () =>
      api<CuadreDia>(
        `/cobranza/cuadre${queryString({ fecha: fechaCuadre || undefined })}`,
      ),
    enabled: Boolean(me.data),
  });

  const lista = facturas.data?.pages.flatMap((p) => p.items) ?? [];
  const counts = facturas.data?.pages[0]?.counts ?? {
    todas: 0,
    pendientes: 0,
    vencidas: 0,
  };
  const totalFiltrado = facturas.data?.pages[0]?.total ?? lista.length;

  const TABS = [
    { id: "pendientes", label: "Pendientes", count: counts.pendientes },
    { id: "vencidas", label: "Vencidas", count: counts.vencidas },
    { id: "todas", label: "Todas", count: counts.todas },
  ] as const;

  const clienteNombre = useMemo(() => {
    if (!clienteId) return null;
    const items = facturas.data?.pages.flatMap((p) => p.items) ?? [];
    return (
      items.find((f) => f.clienteId === clienteId)?.clienteNombre ??
      (clientes.data ?? []).find((c) => c.id === clienteId)?.nombre ??
      null
    );
  }, [clienteId, clientes.data, facturas.data]);

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
        label: `Emitida desde ${desde}`,
        clear: () => setDesde(""),
      });
    }
    if (hasta) {
      out.push({
        key: "hasta",
        label: `Emitida hasta ${hasta}`,
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
    return out;
  }, [clienteId, clienteNombre, desde, hasta, metodoPago]);

  const hayFiltros = chips.length > 0 || Boolean(q.trim()) || sinDte;
  const sobreLimite = resumen.data?.clientesSobreLimite ?? [];
  const alertaAbierta = alertaTocada ?? sobreLimite.length <= 3;

  const dte = useMutation({
    mutationFn: ({ id, numeroDte }: { id: string; numeroDte: string }) =>
      api(`/facturas/${id}/dte`, {
        method: "PATCH",
        body: JSON.stringify({ numeroDte }),
      }),
    onSuccess: () => {
      toastSuccess("DTE guardado");
      void qc.invalidateQueries({ queryKey: ["cartera"] });
      void qc.invalidateQueries({ queryKey: ["pedidos"] });
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
    onError: (err) => toastFromError(err, "No se pudo encolar el recordatorio"),
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
      <div className="grid gap-5">
        <PageToolbar description="Facturas abiertas, captura de DTE y cobros." />

        <ResumenCartera cargando={!resumen.data} resumen={resumen.data} />

        {sobreLimite.length > 0 ? (
          <Card className="gap-0 overflow-hidden p-0">
            <Disclosure
              isExpanded={alertaAbierta}
              onExpandedChange={setAlertaTocada}
            >
              <Disclosure.Heading className="transition-colors hover:bg-tinta-50">
                <Button
                  className="min-h-16 w-full justify-start rounded-none px-4 py-5 text-left hover:bg-transparent"
                  slot="trigger"
                  variant="ghost"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-base font-semibold text-tinta-900">
                      Al límite de crédito
                    </span>
                    <span className="mt-1 block text-sm font-normal text-tinta-600">
                      {sobreLimite.length} restaurante
                      {sobreLimite.length === 1 ? "" : "s"}
                    </span>
                  </span>
                  <Disclosure.Indicator />
                </Button>
              </Disclosure.Heading>
              <Disclosure.Content>
                <Disclosure.Body className="p-0">
                  <ul className="grid max-h-56 gap-2 overflow-y-auto border-t border-[var(--border-subtle)] px-4 py-3">
                    {sobreLimite.map((c) => (
                      <li
                        key={c.clienteId}
                        className="flex min-h-12 flex-wrap items-center gap-3 rounded-[calc(var(--radius-card)-0.5rem)] border border-peligro/35 bg-tinta-50 px-3 py-2.5"
                      >
                        <ClienteAvatar
                          fotoAssetId={c.fotoAssetId}
                          nombre={c.nombre}
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
                          aria-label={
                            puedeRecordar
                              ? `Recordar a ${c.nombre}: envía el estado de cuenta por WhatsApp`
                              : "No tiene permiso para enviar WhatsApp"
                          }
                          className="min-h-11 shrink-0"
                          isDisabled={!puedeRecordar}
                          isPending={
                            recordar.isPending &&
                            recordar.variables === c.clienteId
                          }
                          size="sm"
                          variant="secondary"
                          onPress={() => recordar.mutate(c.clienteId)}
                        >
                          {({ isPending }) => (
                            <>
                              {isPending ? (
                                <Spinner color="current" size="sm" />
                              ) : (
                                <MessageCircle size={15} aria-hidden />
                              )}
                              Recordar
                            </>
                          )}
                        </Button>
                      </li>
                    ))}
                  </ul>
                </Disclosure.Body>
              </Disclosure.Content>
            </Disclosure>
          </Card>
        ) : null}

        <ToggleButtonGroup
          aria-label="Panel de cartera"
          className="mst-segmento-activo"
          disallowEmptySelection
          fullWidth
          selectedKeys={new Set([panel])}
          selectionMode="single"
          onSelectionChange={(keys) => {
            const next = [...keys][0];
            if (typeof next === "string") setPanel(next as PanelCartera);
          }}
        >
          {PANELES.map((p, i) => (
            <ToggleButton key={p.id} id={p.id}>
              {i > 0 && <ToggleButtonGroup.Separator />}
              {p.label}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>

        {panel === "cuadre" ? (
          <div className="grid gap-3">
            <div className="max-w-[16rem]">
              <DateField
                clearable
                hint="Día de caja. Vacío = hoy."
                id="cuadre-fecha"
                label="Día del cuadre"
                max={hoyCivilIso()}
                value={fechaCuadre}
                onChange={setFechaCuadre}
              />
            </div>
            {cuadre.data ? (
              <VistaCuadre cuadre={cuadre.data} />
            ) : (
              <Skeleton className="h-48 w-full rounded-tarjeta" />
            )}
          </div>
        ) : panel === "transferencias" ? (
          <Card className="gap-0 overflow-hidden p-0">
            <BandejaTransferencias puedeConfirmar={puedeConfirmar} />
          </Card>
        ) : (
          <>
            <section className="grid gap-3" aria-label="Buscar y filtrar">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <SearchField
                  aria-label="Buscar factura"
                  className="min-w-0 flex-1"
                  value={q}
                  onChange={setQ}
                >
                  <SearchField.Group>
                    <SearchField.SearchIcon />
                    <SearchField.Input placeholder="Restaurante, DTE o #pedido" />
                    <SearchField.ClearButton />
                  </SearchField.Group>
                </SearchField>
                <Button
                  aria-expanded={filtrosAbiertos}
                  className="shrink-0"
                  variant={filtrosAbiertos || chips.length > 0 ? "secondary" : "ghost"}
                  onPress={() => setFiltrosAbiertos((v) => !v)}
                >
                  <Filter size={16} aria-hidden />
                  Filtros
                  {chips.length > 0 ? (
                    <span className="tabular-nums">{chips.length}</span>
                  ) : null}
                </Button>
              </div>

              <div className="mst-segmento-activo flex flex-wrap items-center gap-2">
                <ToggleButtonGroup
                  aria-label="Estado de facturas"
                  disallowEmptySelection
                  selectedKeys={new Set([tab])}
                  selectionMode="single"
                  size="sm"
                  onSelectionChange={(keys) => {
                    const next = [...keys][0];
                    if (typeof next === "string") setTab(next as TabCartera);
                  }}
                >
                  {TABS.map((t, i) => (
                    <ToggleButton key={t.id} id={t.id}>
                      {i > 0 && <ToggleButtonGroup.Separator />}
                      {t.label}
                      <span className="tabular-nums text-tinta-500">
                        {t.count}
                      </span>
                    </ToggleButton>
                  ))}
                </ToggleButtonGroup>

                <ToggleButtonGroup
                  aria-label="Agrupar lista"
                  disallowEmptySelection
                  selectedKeys={new Set([vista])}
                  selectionMode="single"
                  size="sm"
                  onSelectionChange={(keys) => {
                    const next = [...keys][0];
                    if (typeof next === "string") setVista(next as VistaCartera);
                  }}
                >
                  {VISTAS.map((v, i) => (
                    <ToggleButton key={v.id} id={v.id}>
                      {i > 0 && <ToggleButtonGroup.Separator />}
                      {v.label}
                    </ToggleButton>
                  ))}
                </ToggleButtonGroup>

                <ToggleButton
                  isSelected={sinDte}
                  size="sm"
                  variant="ghost"
                  onChange={setSinDte}
                >
                  Sin DTE
                  {sinDte ? <X size={12} aria-hidden /> : null}
                </ToggleButton>

                {chips.map((chip) => (
                  <Button
                    key={chip.key}
                    size="sm"
                    variant="tertiary"
                    onPress={chip.clear}
                  >
                    {chip.label}
                    <X size={12} aria-hidden />
                    <span className="sr-only">Quitar filtro</span>
                  </Button>
                ))}
                {facturas.data ? (
                  <p
                    className="mst-label ml-auto tabular-nums"
                    aria-live="polite"
                  >
                    {lista.length} de {totalFiltrado} factura
                    {totalFiltrado === 1 ? "" : "s"}
                  </p>
                ) : null}
              </div>

              {filtrosAbiertos ? (
                <div className="grid gap-3 rounded-tarjeta border border-[var(--border-subtle)] bg-[var(--ink-50)] p-3 sm:grid-cols-2 lg:grid-cols-4">
                  <ComboBox
                    selectedKey={clienteId || TODOS}
                    onSelectionChange={(key) =>
                      setClienteId(!key || key === TODOS ? "" : String(key))
                    }
                  >
                    <Label>Cliente</Label>
                    <ComboBox.InputGroup>
                      <Input placeholder="Buscar restaurante" />
                      <ComboBox.Trigger />
                    </ComboBox.InputGroup>
                    <ComboBox.Popover>
                      <ListBox>
                        <ListBox.Item id={TODOS} textValue="Todos">
                          Todos
                          <ListBox.ItemIndicator />
                        </ListBox.Item>
                        {(clientes.data ?? []).map((c) => (
                          <ListBox.Item
                            key={c.id}
                            id={c.id}
                            textValue={c.nombre}
                          >
                            {c.nombre}
                            <ListBox.ItemIndicator />
                          </ListBox.Item>
                        ))}
                      </ListBox>
                    </ComboBox.Popover>
                  </ComboBox>

                  {/* Recortan por día de calle: la fecha de calendario de `factura.emitida_at`. */}
                  <DateField
                    ancla={desde || hasta || undefined}
                    id="filtro-desde"
                    label="Emitida desde"
                    presets={PRESETS_CALENDARIO}
                    rangeEnd={hasta || undefined}
                    value={desde}
                    onChange={setDesde}
                    onRangeChange={({ desde: d, hasta: h }) => {
                      setDesde(d);
                      setHasta(h);
                    }}
                  />
                  <DateField
                    ancla={hasta || desde || undefined}
                    id="filtro-hasta"
                    label="Emitida hasta"
                    presets={PRESETS_CALENDARIO}
                    rangeEnd={desde || undefined}
                    value={hasta}
                    onChange={setHasta}
                    onRangeChange={({ desde: d, hasta: h }) => {
                      setDesde(d);
                      setHasta(h);
                    }}
                  />

                  <Select
                    placeholder="Todos"
                    value={metodoPago || TODOS}
                    onChange={(key) =>
                      setMetodoPago(!key || key === TODOS ? "" : String(key))
                    }
                  >
                    <Label>Método de pago</Label>
                    <Select.Trigger>
                      <Select.Value />
                      <Select.Indicator />
                    </Select.Trigger>
                    <Select.Popover>
                      <ListBox>
                        <ListBox.Item id={TODOS} textValue="Todos">
                          Todos
                          <ListBox.ItemIndicator />
                        </ListBox.Item>
                        {PAGO_METODOS.map((m) => (
                          <ListBox.Item
                            key={m}
                            id={m}
                            textValue={
                              m === "EFECTIVO" ? "Efectivo" : "Transferencia"
                            }
                          >
                            {m === "EFECTIVO" ? "Efectivo" : "Transferencia"}
                            <ListBox.ItemIndicator />
                          </ListBox.Item>
                        ))}
                      </ListBox>
                    </Select.Popover>
                  </Select>
                </div>
              ) : null}
            </section>

            <Card className="gap-0 overflow-hidden p-0">
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
                    icon={<Banknote size={22} aria-hidden />}
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
                    action={
                      hayFiltros ? (
                        <Button
                          size="sm"
                          variant="secondary"
                          onPress={() => {
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
                    dteLoadingId={dte.isPending ? dte.variables?.id : undefined}
                    facturas={lista}
                    hintCobro={hintCobro}
                    hintDte={hintDte}
                    puedeCobrar={puedeCobrar}
                    puedeDte={puedeDte}
                    puedeRecordar={puedeRecordar}
                    recordarLoadingId={
                      recordar.isPending ? recordar.variables : undefined
                    }
                    vista={vista}
                    onCobrar={abrirCobro}
                    onDte={(fac, numeroDte) =>
                      dte.mutate({ id: fac.id, numeroDte })
                    }
                    onRecordar={(id) => recordar.mutate(id)}
                  />
                ) : null}

                {facturas.hasNextPage ? (
                  <div className="border-t border-[var(--border-subtle)] p-4">
                    <Button
                      className="w-full"
                      isPending={facturas.isFetchingNextPage}
                      variant="secondary"
                      onPress={() => void facturas.fetchNextPage()}
                    >
                      {({ isPending }) => (
                        <>
                          {isPending ? (
                            <Spinner color="current" size="sm" />
                          ) : null}
                          Cargar más
                        </>
                      )}
                    </Button>
                  </div>
                ) : null}
              </div>
            </Card>
          </>
        )}
      </div>

      {cobrando ? (
        <DialogoPago
          key={cobrando.clienteId}
          open
          descripcion={`${cobrando.clienteNombre} · se aplica a las facturas más antiguas`}
          error={pagoError}
          loading={pagar.isPending}
          online={online}
          saldoCentavos={cobrando.saldoCentavos}
          titulo="Registrar pago"
          onClose={() => {
            setCobrando(null);
            setPagoError(undefined);
          }}
          onConfirm={(input) =>
            pagar.mutate({
              id: input.id,
              idempotencyKey: `cartera-${input.id}`,
              clienteId: cobrando.clienteId,
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

/**
 * Lo que Carla lee antes de decidir a quién visitar: cuánto falta por cobrar,
 * cuántas facturas lo componen, qué queda por facturar de la operación abierta
 * y cuánto entró hoy. Todo sale de `/cartera/resumen`, sin llamadas nuevas.
 */
function ResumenCartera({
  resumen,
  cargando,
}: {
  resumen: CarteraResumen | undefined;
  cargando: boolean;
}) {
  if (cargando || !resumen) {
    return (
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-[76px] w-full rounded-tarjeta" />
        ))}
      </div>
    );
  }

  return (
    <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Cifra
        etiqueta="Saldo por cobrar"
        valor={
          <Money centavos={resumen.pendientesSaldoCentavos} tone="pendiente" />
        }
      />
      <Cifra
        etiqueta="Facturas pendientes"
        tono={resumen.pendientesCount > 0 ? "aviso" : "ok"}
        valor={resumen.pendientesCount}
      />
      <Cifra
        etiqueta="Por facturar de la operación"
        nota="Entregado sin factura todavía"
        valor={
          <Money centavos={resumen.porCobrarFechaOperacionCentavos} tone="muted" />
        }
      />
      <Cifra
        etiqueta="Cobrado hoy"
        nota={
          resumen.fechaCobro
            ? `Día de calle · ${etiquetaDiaSemanaCorto(resumen.fechaCobro)}`
            : "Día de calle"
        }
        valor={<Money centavos={resumen.cobradoHoyCentavos} tone="pagado" />}
      />
    </dl>
  );
}

function Cifra({
  etiqueta,
  valor,
  nota,
  tono = "neutro",
}: {
  etiqueta: string;
  valor: ReactNode;
  nota?: string;
  tono?: "neutro" | "ok" | "aviso" | "peligro";
}) {
  return (
    <Card className="gap-1 p-4">
      <dt className="mst-label text-[11px]">{etiqueta}</dt>
      <dd
        className={cn(
          "text-[22px] font-semibold leading-none tabular-nums",
          tono === "peligro"
            ? "text-peligro"
            : tono === "aviso"
              ? "text-aviso-700"
              : tono === "ok"
                ? "text-marca"
                : "text-tinta-900",
        )}
      >
        {valor}
      </dd>
      {nota && <p className="text-[11px] text-tinta-500">{nota}</p>}
    </Card>
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

/**
 * `useSearchParams` obliga a un límite de Suspense: sin él el prerender
 * estático falla en build.
 */
export default function CarteraPage() {
  return (
    <Suspense
      fallback={
        <PanelShell title="Cartera">
          <Skeleton className="h-48" />
        </PanelShell>
      }
    >
      <CarteraInner />
    </Suspense>
  );
}
