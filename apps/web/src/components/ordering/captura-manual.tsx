"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import {
  FAMILIA_ETIQUETA,
  UNIDAD_CORTA,
  totalPedidoCentavos,
  type ClienteProductoFila,
  type ClientePublico,
  type PedidoDetalle,
  type PortalCuenta,
  type ProductoPublico,
} from "@misupertostada/shared";
import { api, ApiError } from "@/lib/api";
import { agruparProductosCaptura } from "@/lib/pedido-vista";
import { toastFromError, toastSuccess } from "@/lib/toast";
import { ContadorFacturas } from "@/components/domain/contador-facturas";
import { Money } from "@/components/domain/money";
import { ProductoThumb } from "@/components/catalog/producto-thumb";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Droplist } from "@/components/ui/droplist";
import { Textarea } from "@/components/ui/field";
import { QuantityStepper } from "@/components/ui/quantity-stepper";
import { SearchField } from "@/components/ui/search-field";

function estadoInicial() {
  return {
    clienteId: "",
    cantidades: {} as Record<string, number>,
    notasAdmin: "",
    q: "",
    error: null as string | null,
  };
}

export function CapturaManual({
  open,
  onClose,
  onCaptured,
}: {
  open: boolean;
  onClose: () => void;
  onCaptured: (pedido: PedidoDetalle) => void;
}) {
  const [clienteId, setClienteId] = useState("");
  const [cantidades, setCantidades] = useState<Record<string, number>>({});
  const [notasAdmin, setNotasAdmin] = useState("");
  const [q, setQ] = useState("");
  const [error, setError] = useState<string | null>(null);

  function reset() {
    const init = estadoInicial();
    setClienteId(init.clienteId);
    setCantidades(init.cantidades);
    setNotasAdmin(init.notasAdmin);
    setQ(init.q);
    setError(init.error);
  }

  function handleClose() {
    onClose();
  }

  // Al cerrar (explícito o externo) limpiar el formulario.
  useEffect(() => {
    if (!open) reset();
  }, [open]);

  const clientes = useQuery({
    queryKey: ["clientes"],
    queryFn: () => api<ClientePublico[]>("/clientes"),
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

  const clienteSeleccionado = activos.find((c) => c.id === clienteId);
  const limiteExcedido =
    cuenta.data != null &&
    cuenta.data.limiteFacturasPendientes != null &&
    cuenta.data.facturasPendientes >= cuenta.data.limiteFacturasPendientes;

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
    <Dialog
      open={open}
      size="lg"
      onClose={handleClose}
      title="Capturar pedido"
      description="Pedido por llamada. Salta la ventana. Queda en CONFIRMADO con su correlativo."
      footer={
        <>
          <Button variant="secondary" onClick={handleClose}>
            Cancelar
          </Button>
          <Button
            variant="accent"
            disabled={!clienteId || items.length === 0}
            loading={capturar.isPending}
            onClick={() => capturar.mutate()}
          >
            Capturar pedido
          </Button>
        </>
      }
    >
      <div className="grid gap-4">
        <Droplist
          id="captura-cliente"
          label="Cliente"
          required
          value={clienteId}
          searchable
          searchPlaceholder="Buscar restaurante"
          placeholder="Elegir restaurante"
          onChange={(next) => {
            setClienteId(next);
            setCantidades({});
            setNotasAdmin("");
            setQ("");
            setError(null);
          }}
          options={activos.map((c) => ({
            value: c.id,
            label: c.nombre,
          }))}
        />

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
          <p className="text-sm font-semibold text-peligro" role="alert">
            Límite de crédito excedido. Puede capturar igual; avise a cartera.
          </p>
        ) : null}

        {clienteId && (
          <>
            <SearchField
              value={q}
              onChange={setQ}
              label="Buscar producto"
              placeholder="Alias o nombre"
            />
            <div className="max-h-[40vh] overflow-auto rounded-campo border border-[var(--border-subtle)]">
              {grupos.map((grupo) => (
                <section key={grupo.key}>
                  <h3 className="sticky top-0 z-[1] border-b border-[var(--border-subtle)] bg-tinta-50 px-3 py-2 mst-label">
                    {grupo.label}
                    <span className="ml-2 tabular-nums text-tinta-500">
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
                          if (cantidad <= 0) {
                            const { [fila.productoId]: _omit, ...rest } = prev;
                            return rest;
                          }
                          return { ...prev, [fila.productoId]: cantidad };
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
            <Textarea
              id="captura-notas"
              label="Nota extraordinaria"
              rows={2}
              value={notasAdmin}
              onChange={(e) => setNotasAdmin(e.target.value)}
              hint="Horario, grosor y punto de carga salen del catálogo. Aquí solo lo de hoy."
            />
            <p className="flex items-baseline justify-between text-sm">
              <span className="mst-label">Total</span>
              <Money centavos={total} className="text-lg tabular-nums" />
            </p>
          </>
        )}
        {error && (
          <p className="text-sm text-peligro" role="alert">
            {error}
          </p>
        )}
      </div>
    </Dialog>
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
    <div className="flex min-h-fila items-center gap-3 border-b border-[var(--border-subtle)] px-3 py-2.5 last:border-b-0">
      <ProductoThumb
        nombre={alias}
        fotoAssetId={fotoAssetId}
        size="sm"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-pretty text-tinta-900">
          {alias}
        </p>
        <p className="text-[12px] text-tinta-500">
          {alias !== fila.nombreCanonico ? `${fila.nombreCanonico} · ` : null}
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
