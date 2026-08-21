"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  FAMILIA_ETIQUETA,
  UNIDAD_CORTA,
  totalPedidoCentavos,
  type ClienteProductoFila,
  type ClientePublico,
  type PedidoDetalle,
} from "@misupertostada/shared";
import { api, ApiError } from "@/lib/api";
import { Money } from "@/components/domain/money";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Droplist } from "@/components/ui/droplist";
import { Textarea } from "@/components/ui/field";
import { QuantityStepper } from "@/components/ui/quantity-stepper";
import { SearchField } from "@/components/ui/search-field";

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

  const activos = useMemo(
    () => (clientes.data ?? []).filter((c) => c.activo),
    [clientes.data],
  );
  const filas = useMemo(() => {
    const list = (productos.data ?? []).filter((p) => p.productoActivo);
    const needle = q.trim().toLowerCase();
    if (!needle) return list;
    return list.filter(
      (p) =>
        p.nombreCanonico.toLowerCase().includes(needle) ||
        (p.alias ?? "").toLowerCase().includes(needle),
    );
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
      setClienteId("");
      setCantidades({});
      setNotasAdmin("");
      setQ("");
      setError(null);
      onCaptured(pedido);
    },
    onError: (err) =>
      setError(err instanceof ApiError ? err.message : "No se pudo capturar"),
  });

  return (
    <Dialog
      open={open}
      size="lg"
      onClose={onClose}
      title="Capturar pedido"
      description="Pedido por llamada. Salta la ventana. Queda en CONFIRMADO con su correlativo."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cerrar
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
            setError(null);
          }}
          options={activos.map((c) => ({
            value: c.id,
            label: c.nombre,
          }))}
        />

        {clienteId && (
          <>
            <SearchField
              value={q}
              onChange={setQ}
              label="Buscar producto"
              placeholder="Alias o nombre"
            />
            <div className="max-h-[40vh] overflow-auto rounded-campo border border-[var(--border-subtle)]">
              {filas.map((fila) => (
                <CapturaFila
                  key={fila.productoId}
                  fila={fila}
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
              {filas.length === 0 && (
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
              <span className="mst-label">
                Total
              </span>
              <Money centavos={total} className="text-lg" />
            </p>
          </>
        )}
        {error && <p className="text-sm text-peligro">{error}</p>}
      </div>
    </Dialog>
  );
}

function CapturaFila({
  fila,
  cantidad,
  onChange,
}: {
  fila: ClienteProductoFila;
  cantidad: number;
  onChange: (cantidad: number) => void;
}) {
  const alias = fila.alias?.trim() || fila.nombreCanonico;
  const unidad = UNIDAD_CORTA[fila.unidadMedida];
  const pedible = fila.precioCentavos != null;
  return (
    <div className="flex items-center gap-3 border-b border-[var(--border-subtle)] px-3 py-2.5 last:border-b-0">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-tinta-900">{alias}</p>
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
