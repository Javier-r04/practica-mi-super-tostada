"use client";

import {
  Alert,
  Button,
  ComboBox,
  Description,
  Input,
  Label,
  ListBox,
  Modal,
  SearchField,
  Spinner,
  TextArea,
  TextField,
} from "@heroui/react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  FAMILIA_ETIQUETA,
  UNIDAD_CORTA,
  totalPedidoCentavos,
  type CalendarioAhora,
  type ClienteProductoFila,
  type ClientePublico,
  type PedidoDetalle,
  type PortalCuenta,
  type ProductoPublico,
} from "@misupertostada/shared";
import { api, ApiError } from "@/lib/api";
import { agruparProductosCaptura } from "@/lib/pedido-vista";
import { copyEjePedidos } from "@/lib/ejes-vista";
import { toastFromError, toastSuccess } from "@/lib/toast";
import { ContadorFacturas } from "@/components/domain/contador-facturas";
import { Money } from "@/components/domain/money";
import { PildorasEjePedidos } from "@/components/ordering/pildoras-eje-pedidos";
import { ProductoThumb } from "@/components/catalog/producto-thumb";
import { QuantityStepper } from "@/components/ui/quantity-stepper";
import { cn } from "@/lib/utils";

type PropsCaptura = {
  open: boolean;
  onClose: () => void;
  onCaptured: (pedido: PedidoDetalle) => void;
};

/**
 * El formulario solo se monta con el diálogo abierto: al cerrar se desmonta y
 * el estado se va con él. Antes se limpiaba con un efecto sobre `open`, que
 * además dejaba el formulario viejo visible un frame al reabrir.
 */
export function CapturaManual(props: PropsCaptura) {
  if (!props.open) return null;
  return <FormularioCaptura {...props} />;
}

function FormularioCaptura({ open, onClose, onCaptured }: PropsCaptura) {
  const [clienteId, setClienteId] = useState("");
  const [cantidades, setCantidades] = useState<Record<string, number>>({});
  const [notasAdmin, setNotasAdmin] = useState("");
  const [q, setQ] = useState("");
  const [error, setError] = useState<string | null>(null);

  const clientes = useQuery({
    queryKey: ["clientes"],
    queryFn: () => api<ClientePublico[]>("/clientes"),
    enabled: open,
  });
  const calendario = useQuery({
    queryKey: ["calendario", "ahora"],
    queryFn: () => api<CalendarioAhora>("/calendario/ahora"),
    enabled: open,
  });
  const productos = useQuery({
    queryKey: ["clientes", clienteId, "productos"],
    queryFn: () => api<ClienteProductoFila[]>(`/clientes/${clienteId}/productos`),
    enabled: open && Boolean(clienteId),
  });
  const catalogo = useQuery({
    queryKey: ["productos"],
    queryFn: () => api<ProductoPublico[]>("/productos"),
    enabled: open,
  });
  const cuenta = useQuery({
    queryKey: ["clientes", clienteId, "cuenta"],
    queryFn: () => api<PortalCuenta>(`/clientes/${clienteId}/cuenta`),
    enabled: open && Boolean(clienteId),
  });

  const activos = useMemo(
    () => (clientes.data ?? []).filter((c) => c.activo),
    [clientes.data],
  );

  const fotoPorProducto = useMemo(() => {
    const map = new Map<string, string | null>();
    for (const p of catalogo.data ?? []) map.set(p.id, p.fotoAssetId);
    return map;
  }, [catalogo.data]);

  const grupos = useMemo(() => {
    const list = productos.data ?? [];
    const needle = q.trim().toLowerCase();
    const filtrados = !needle
      ? list
      : list.filter(
          (p) =>
            p.nombreCanonico.toLowerCase().includes(needle) ||
            (p.alias ?? "").toLowerCase().includes(needle),
        );
    return agruparProductosCaptura(filtrados);
  }, [productos.data, q]);

  const items = Object.entries(cantidades)
    .filter(([, cantidad]) => cantidad > 0)
    .map(([productoId, cantidad]) => ({ productoId, cantidad }));
  const total = totalPedidoCentavos(
    items.map((item) => {
      const fila = productos.data?.find((p) => p.productoId === item.productoId);
      return {
        cantidad: item.cantidad,
        precioUnitarioCentavos: fila?.precioCentavos ?? 0,
      };
    }),
  );
  const lineas = items.length;

  const clienteSeleccionado = activos.find((c) => c.id === clienteId);
  const limiteExcedido =
    cuenta.data != null &&
    cuenta.data.limiteFacturasPendientes != null &&
    cuenta.data.facturasPendientes >= cuenta.data.limiteFacturasPendientes;

  const copyCaptura = calendario.data
    ? copyEjePedidos(
        calendario.data.fechaOperacionCaptura,
        calendario.data.fechaOperacionCaptura,
        calendario.data,
      )
    : null;

  const capturar = useMutation({
    mutationFn: () =>
      api<PedidoDetalle>("/pedidos", {
        method: "POST",
        body: JSON.stringify({
          clienteId,
          items,
          notasAdmin: notasAdmin.trim() || undefined,
        }),
      }),
    onSuccess: (pedido) => {
      toastSuccess(`Pedido #${pedido.correlativo} capturado`);
      onCaptured(pedido);
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : "No se pudo capturar");
      toastFromError(err, "No se pudo capturar");
    },
  });

  return (
    <Modal.Backdrop isOpen={open} onOpenChange={(abierto) => !abierto && onClose()}>
      <Modal.Container size="lg">
        <Modal.Dialog>
          <Modal.CloseTrigger />
          <Modal.Header>
            <Modal.Heading>Capturar pedido</Modal.Heading>
            <p className="text-sm text-tinta-500">
              Pedido por llamada. Salta la ventana. Queda en CONFIRMADO con su
              correlativo.
            </p>
          </Modal.Header>

          <Modal.Body>
            <div className="grid gap-4">
              {copyCaptura && calendario.data ? (
                <div className="grid gap-2.5 rounded-campo border border-[var(--yellow-400)]/35 bg-[var(--yellow-100)]/90 px-3 py-3">
                  <p className="text-sm leading-relaxed text-pretty text-[var(--amber-700)]">
                    <span className="font-semibold">{copyCaptura.titulo}.</span>{" "}
                    {copyCaptura.detalle}
                  </p>
                  <PildorasEjePedidos
                    fecha={calendario.data.fechaOperacionCaptura}
                    cal={calendario.data}
                  />
                </div>
              ) : null}

              <ComboBox
                isRequired
                selectedKey={clienteId || null}
                onSelectionChange={(key) => {
                  setClienteId(typeof key === "string" ? key : "");
                  setCantidades({});
                  setNotasAdmin("");
                  setQ("");
                  setError(null);
                }}
              >
                <Label>Cliente</Label>
                <ComboBox.InputGroup>
                  <Input placeholder="Buscar restaurante" />
                  <ComboBox.Trigger />
                </ComboBox.InputGroup>
                <ComboBox.Popover>
                  <ListBox>
                    {activos.map((c) => (
                      <ListBox.Item key={c.id} id={c.id} textValue={c.nombre}>
                        {c.nombre}
                        <ListBox.ItemIndicator />
                      </ListBox.Item>
                    ))}
                  </ListBox>
                </ComboBox.Popover>
              </ComboBox>

              {clienteId && cuenta.data ? (
                <ContadorFacturas
                  pendientes={cuenta.data.facturasPendientes}
                  limite={cuenta.data.limiteFacturasPendientes}
                  montoCentavos={cuenta.data.saldoCentavos}
                  etiqueta={
                    clienteSeleccionado
                      ? `Facturas · ${clienteSeleccionado.nombre}`
                      : "Facturas pendientes"
                  }
                />
              ) : null}

              {limiteExcedido ? (
                <Alert status="warning">
                  <Alert.Indicator />
                  <Alert.Content>
                    <Alert.Title>Límite de crédito excedido</Alert.Title>
                    <Alert.Description>
                      Puede capturar igual; avise a cartera.
                    </Alert.Description>
                  </Alert.Content>
                </Alert>
              ) : null}

              {clienteId && (
                <>
                  <SearchField
                    aria-label="Buscar producto"
                    value={q}
                    onChange={setQ}
                  >
                    <SearchField.Group>
                      <SearchField.SearchIcon />
                      <SearchField.Input placeholder="Alias o nombre" />
                      <SearchField.ClearButton />
                    </SearchField.Group>
                  </SearchField>

                  <div className="max-h-[40vh] overflow-auto rounded-campo border border-[var(--border-subtle)]">
                    {grupos.map((grupo) => (
                      <section key={grupo.key}>
                        <h3 className="sticky top-0 z-[1] flex items-center justify-between gap-2 border-b border-[var(--border-subtle)] bg-[var(--ink-50)] px-3 py-2 mst-label">
                          <span>{grupo.label}</span>
                          <span className="tabular-nums text-tinta-400">
                            {grupo.filas.length}
                          </span>
                        </h3>
                        {grupo.filas.map((fila) => (
                          <CapturaFila
                            key={fila.productoId}
                            fila={fila}
                            fotoAssetId={fotoPorProducto.get(fila.productoId)}
                            cantidad={cantidades[fila.productoId] ?? 0}
                            onChange={(cantidad) =>
                              setCantidades((prev) => {
                                const next = { ...prev };
                                if (cantidad <= 0) delete next[fila.productoId];
                                else next[fila.productoId] = cantidad;
                                return next;
                              })
                            }
                          />
                        ))}
                      </section>
                    ))}
                    {grupos.length === 0 && (
                      <p className="px-4 py-6 text-sm text-tinta-500">
                        {productos.isLoading
                          ? "Cargando catálogo…"
                          : "Ningún producto coincide."}
                      </p>
                    )}
                  </div>

                  <TextField value={notasAdmin} onChange={setNotasAdmin}>
                    <Label>Nota extraordinaria</Label>
                    <TextArea rows={2} />
                    <Description>
                      Horario, grosor y punto de carga salen del catálogo. Aquí solo
                      lo de hoy.
                    </Description>
                  </TextField>

                  {/* El total va pegado al pie: es la cifra que se le dice al
                      cliente por teléfono antes de colgar. */}
                  <div className="flex items-baseline justify-between gap-3 rounded-campo bg-[var(--ink-50)] px-4 py-3">
                    <span className="mst-label">
                      Total
                      <span className="ml-2 font-normal tabular-nums text-tinta-500">
                        {lineas} línea{lineas === 1 ? "" : "s"}
                      </span>
                    </span>
                    <Money centavos={total} className="text-lg" />
                  </div>
                </>
              )}

              {error && (
                <Alert status="danger">
                  <Alert.Indicator />
                  <Alert.Content>
                    <Alert.Title>No se capturó</Alert.Title>
                    <Alert.Description>{error}</Alert.Description>
                  </Alert.Content>
                </Alert>
              )}
            </div>
          </Modal.Body>

          <Modal.Footer>
            <Button variant="tertiary" onPress={onClose}>
              Cancelar
            </Button>
            <Button
              className="button--accent"
              isDisabled={!clienteId || items.length === 0 || capturar.isPending}
              isPending={capturar.isPending}
              variant="primary"
              onPress={() => capturar.mutate()}
            >
              {({ isPending }) => (
                <>
                  {isPending && <Spinner color="current" size="sm" />}
                  Capturar pedido
                </>
              )}
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}

function CapturaFila({
  fila,
  fotoAssetId,
  cantidad,
  onChange,
}: {
  fila: ClienteProductoFila;
  fotoAssetId?: string | null;
  cantidad: number;
  onChange: (cantidad: number) => void;
}) {
  const alias = fila.alias?.trim() || fila.nombreCanonico;
  const unidad = UNIDAD_CORTA[fila.unidadMedida];
  const pedible = fila.precioCentavos != null;
  return (
    <div
      className={cn(
        "flex min-h-fila items-center gap-3 border-b border-[var(--border-subtle)] px-3 py-2.5 last:border-b-0",
        "transition-colors duration-control ease-out",
        cantidad > 0 && "bg-[var(--green-50)]",
      )}
    >
      <ProductoThumb
        nombre={fila.nombreCanonico}
        fotoAssetId={fotoAssetId}
        size="sm"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-pretty text-tinta-900">
          {fila.nombreCanonico}
        </p>
        <p className="text-[12px] text-tinta-500">
          {alias !== fila.nombreCanonico ? `«${alias}» · ` : null}
          {FAMILIA_ETIQUETA[fila.familia]}
          {" · "}
          {pedible ? (
            <>
              <Money centavos={fila.precioCentavos} tone="muted" /> / {unidad}
            </>
          ) : (
            "Sin precio — no pedible"
          )}
        </p>
      </div>
      <QuantityStepper
        value={cantidad}
        onChange={onChange}
        unidad={unidad}
        disabled={!pedible}
      />
    </div>
  );
}
