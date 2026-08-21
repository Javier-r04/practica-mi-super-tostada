"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Clock, Phone, Pin, Plus } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  horaEnZona,
  totalPedidoCentavos,
  type ClienteProductoFila,
  type PedidoDetalle as PedidoDetalleDto,
  type ProductoPublico,
} from "@misupertostada/shared";
import { api, ApiError } from "@/lib/api";
import {
  debeAplicarSnapshotServidor,
  productosAgregables,
} from "@/lib/pedido-vista";
import { toastFromError, toastSuccess } from "@/lib/toast";
import { ClienteAvatar } from "@/components/catalog/cliente-avatar";
import { EstadoBadge } from "@/components/domain/estado-badge";
import { Money } from "@/components/domain/money";
import { PedidoItemRow } from "@/components/domain/pedido-item-row";
import { Badge, Tag } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Droplist } from "@/components/ui/droplist";
import { Textarea } from "@/components/ui/field";

const ACCION_TEXTO: Record<string, string> = {
  "portal.confirmar": "capturó el pedido desde el portal",
  "portal.editar": "editó el pedido desde el portal",
  "pedidos.capturar": "capturó el pedido",
  "pedidos.editar_items": "ajustó los ítems",
  "pedidos.notas": "actualizó las notas del administrador",
  "pedidos.anular": "anuló el pedido",
};

type ItemLocal = {
  productoId: string;
  cantidad: number;
  nombreMostrado: string;
  unidadMedida: PedidoDetalleDto["items"][number]["unidadMedida"];
  precioUnitarioCentavos: number;
  puntoCarga?: PedidoDetalleDto["items"][number]["puntoCarga"];
  notaProduccion?: string | null;
};

export function PedidoDetalle({
  pedido,
  puedeEscribir,
  fotoAssetId,
}: {
  pedido: PedidoDetalleDto;
  puedeEscribir: boolean;
  fotoAssetId?: string | null;
}) {
  const qc = useQueryClient();
  const editable = puedeEscribir && pedido.estado === "CONFIRMADO";
  const [items, setItems] = useState<ItemLocal[]>(() => mapItems(pedido));
  const [notas, setNotas] = useState(pedido.notasAdmin ?? "");
  const [anular, setAnular] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [agregarId, setAgregarId] = useState("");
  const pedidoIdRef = useRef(pedido.id);
  const userEditedRef = useRef(false);
  const baselineRef = useRef({
    items: mapItems(pedido),
    notas: pedido.notasAdmin ?? "",
  });

  const itemsDirty = !mismoItemsLocal(items, baselineRef.current.items);
  const notasDirty = notas !== baselineRef.current.notas;
  const dirty = itemsDirty || notasDirty;

  useEffect(() => {
    const aplicar = debeAplicarSnapshotServidor({
      pedidoIdLocal: pedidoIdRef.current,
      pedidoIdServidor: pedido.id,
      dirty: userEditedRef.current,
    });
    pedidoIdRef.current = pedido.id;
    if (!aplicar) return;
    const nextItems = mapItems(pedido);
    const nextNotas = pedido.notasAdmin ?? "";
    baselineRef.current = { items: nextItems, notas: nextNotas };
    userEditedRef.current = false;
    setItems(nextItems);
    setNotas(nextNotas);
    setError(null);
    setAgregarId("");
  }, [pedido]);

  const productos = useQuery({
    queryKey: ["productos"],
    queryFn: () => api<ProductoPublico[]>("/productos"),
  });
  const catalogoCliente = useQuery({
    queryKey: ["clientes", pedido.clienteId, "productos"],
    queryFn: () =>
      api<ClienteProductoFila[]>(`/clientes/${pedido.clienteId}/productos`),
    enabled: editable,
  });

  const fotoPorProducto = useMemo(() => {
    const map = new Map<string, string | null>();
    for (const p of productos.data ?? []) map.set(p.id, p.fotoAssetId);
    return map;
  }, [productos.data]);

  const agregables = useMemo(
    () =>
      productosAgregables(
        catalogoCliente.data ?? [],
        new Set(items.map((i) => i.productoId)),
      ),
    [catalogoCliente.data, items],
  );

  const total = totalPedidoCentavos(
    items.map((item) => ({
      cantidad: item.cantidad,
      precioUnitarioCentavos: item.precioUnitarioCentavos,
    })),
  );

  const guardar = useMutation({
    mutationFn: async () => {
      if (itemsDirty) {
        await api<PedidoDetalleDto>(`/pedidos/${pedido.id}/items`, {
          method: "PATCH",
          body: JSON.stringify({
            items: items.map((item) => ({
              productoId: item.productoId,
              cantidad: item.cantidad,
            })),
          }),
        });
      }
      if (notasDirty) {
        await api<PedidoDetalleDto>(`/pedidos/${pedido.id}/notas`, {
          method: "PATCH",
          body: JSON.stringify({ notasAdmin: notas }),
        });
      }
    },
    onSuccess: () => {
      baselineRef.current = { items: [...items], notas };
      userEditedRef.current = false;
      void qc.invalidateQueries({ queryKey: ["pedidos"] });
      setError(null);
      toastSuccess("Cambios guardados");
    },
    onError: (err) => {
      // Si falló el segundo PATCH, el primero pudo haber quedado en servidor.
      void qc.invalidateQueries({ queryKey: ["pedidos"] });
      const msg =
        err instanceof ApiError ? err.message : "No se pudieron guardar los cambios";
      setError(msg);
      toastFromError(err, "No se pudieron guardar los cambios");
    },
  });

  const anularPedido = useMutation({
    mutationFn: () =>
      api<PedidoDetalleDto>(`/pedidos/${pedido.id}/anular`, {
        method: "POST",
        body: JSON.stringify({ motivo }),
      }),
    onSuccess: () => {
      setAnular(false);
      setMotivo("");
      void qc.invalidateQueries({ queryKey: ["pedidos"] });
      toastSuccess("Pedido anulado");
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : "No se pudo anular");
      toastFromError(err, "No se pudo anular");
    },
  });

  const hora = horaEnZona(new Date(pedido.capturadoAt));
  const origenLabel = pedido.origen === "PORTAL" ? "Portal" : "Manual";
  const tel = pedido.clienteTelefonoWa?.replace(/\D/g, "") ?? "";

  function agregarProducto(productoId: string) {
    const fila = agregables.find((f) => f.productoId === productoId);
    if (!fila || fila.precioCentavos == null) return;
    const precio = fila.precioCentavos;
    userEditedRef.current = true;
    setItems((prev) => [
      ...prev,
      {
        productoId: fila.productoId,
        cantidad: 1,
        nombreMostrado: fila.alias?.trim() || fila.nombreCanonico,
        unidadMedida: fila.unidadMedida,
        precioUnitarioCentavos: precio,
        puntoCarga: fila.puntoCarga,
        notaProduccion: fila.notaProduccion,
      },
    ]);
    setAgregarId("");
  }

  return (
    <div className="grid gap-4">
      <Card>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <ClienteAvatar
            nombre={pedido.clienteNombre}
            fotoAssetId={fotoAssetId}
            size="md"
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-semibold text-pretty text-tinta-900">
                <Link
                  href={`/clientes/${pedido.clienteId}`}
                  className="text-inherit no-underline hover:text-marca hover:no-underline"
                >
                  {pedido.clienteNombre}
                </Link>
              </h2>
              <EstadoBadge estado={pedido.estado} />
              <Badge tone={pedido.origen === "PORTAL" ? "green" : "neutral"}>
                {origenLabel}
              </Badge>
            </div>
            <p className="mt-1 text-xs text-tinta-500">
              Pedido{" "}
              <span className="font-mono tabular-nums">#{pedido.correlativo}</span>
              {" · "}
              capturado {hora}
              {pedido.capturadoPorNombre
                ? ` por ${pedido.capturadoPorNombre}`
                : ""}
            </p>
            <div className="mt-2 flex flex-wrap gap-2 text-xs text-tinta-500">
              {pedido.horarioEntregaFijo && (
                <Tag>
                  <Clock size={13} aria-hidden />
                  Entrega fija {pedido.horarioEntregaFijo}
                </Tag>
              )}
              {pedido.clienteContacto && <span>{pedido.clienteContacto}</span>}
              {pedido.clienteTelefonoWa && (
                <a
                  href={tel ? `tel:+${tel}` : undefined}
                  className="inline-flex min-h-11 items-center gap-1 font-semibold text-marca no-underline hover:text-marca-hover"
                  aria-label={`Llamar a ${pedido.clienteNombre}`}
                >
                  <Phone size={13} aria-hidden />
                  {pedido.clienteTelefonoWa}
                </a>
              )}
            </div>
            {pedido.notasPermanentes && (
              <div className="mt-2">
                <Tag>
                  <Pin size={13} aria-hidden />
                  {pedido.notasPermanentes}
                </Tag>
              </div>
            )}
            {pedido.estado === "ANULADO" && pedido.motivoAnulacion && (
              <p className="mt-2 text-sm text-peligro" role="alert">
                Motivo: {pedido.motivoAnulacion}
              </p>
            )}
          </div>
          {editable && (
            <Button size="sm" variant="secondary" onClick={() => setAnular(true)}>
              Anular
            </Button>
          )}
        </div>
      </Card>

      <Card
        flush
        title="Ítems"
        subtitle="Precio y nombre quedan en snapshot al capturar"
      >
        <div className="border-t border-[var(--border-subtle)]">
          {items.map((item) => (
            <PedidoItemRow
              key={item.productoId}
              nombreMostrado={item.nombreMostrado}
              unidadMedida={item.unidadMedida}
              cantidad={item.cantidad}
              precioUnitarioCentavos={item.precioUnitarioCentavos}
              puntoCarga={item.puntoCarga}
              notaProduccion={item.notaProduccion}
              fotoAssetId={fotoPorProducto.get(item.productoId)}
              editable={editable}
              onChangeCantidad={(v) => {
                userEditedRef.current = true;
                setItems((prev) =>
                  prev.map((row) =>
                    row.productoId === item.productoId
                      ? { ...row, cantidad: v }
                      : row,
                  ),
                );
              }}
            />
          ))}
          {editable && agregables.length > 0 ? (
            <div className="flex flex-wrap items-end gap-2 border-b border-[var(--border-subtle)] px-4 py-3">
              <div className="min-w-[12rem] flex-1">
                <Droplist
                  id={`agregar-${pedido.id}`}
                  label="Agregar producto"
                  value={agregarId}
                  onChange={setAgregarId}
                  searchable
                  searchPlaceholder="Alias o nombre"
                  placeholder="Elegir del catálogo"
                  options={agregables.map((f) => ({
                    value: f.productoId,
                    label: f.alias?.trim() || f.nombreCanonico,
                  }))}
                />
              </div>
              <Button
                size="sm"
                variant="secondary"
                disabled={!agregarId}
                onClick={() => agregarProducto(agregarId)}
              >
                <Plus size={14} aria-hidden />
                Agregar
              </Button>
            </div>
          ) : null}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-tinta-50 px-4 py-3">
            {editable && dirty ? (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => guardar.mutate()}
                loading={guardar.isPending}
              >
                Guardar cambios
              </Button>
            ) : (
              <span />
            )}
            <span className="ml-auto flex items-baseline gap-3">
              <span className="mst-label">Total del pedido</span>
              <Money centavos={total} className="text-lg tabular-nums" />
            </span>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card
          title="Notas del administrador"
          subtitle="Libres, del día. El grosor y el horario salen del catálogo."
        >
          <Textarea
            id={`notas-${pedido.id}`}
            rows={3}
            value={notas}
            disabled={!editable}
            onChange={(e) => {
              userEditedRef.current = true;
              setNotas(e.target.value);
            }}
            placeholder="Ej. llevar junto con las tortillas de la mañana"
          />
        </Card>
        <Card title="Historial" subtitle="Quién hizo qué">
          <ol className="grid gap-2 text-xs text-tinta-800">
            {pedido.historial.length === 0 ? (
              <li className="text-tinta-500">Sin movimientos todavía.</li>
            ) : (
              pedido.historial.map((h, i) => (
                <li key={`${h.accion}-${h.createdAt}-${i}`} className="flex gap-3">
                  <span className="font-mono tabular-nums text-tinta-500">
                    {horaEnZona(new Date(h.createdAt))}
                  </span>
                  <span>
                    {h.actorNombre ?? h.actorTipo}{" "}
                    {ACCION_TEXTO[h.accion] ?? h.accion}
                  </span>
                </li>
              ))
            )}
          </ol>
        </Card>
      </div>

      {error && (
        <p className="text-sm text-peligro" role="alert">
          {error}
        </p>
      )}

      <Dialog
        open={anular}
        tone="danger"
        title={`Anular el pedido #${pedido.correlativo}`}
        description="El pedido no se borra: queda anulado con motivo y sigue visible en el historial."
        onClose={() => setAnular(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setAnular(false)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              onClick={() => anularPedido.mutate()}
              loading={anularPedido.isPending}
              disabled={!motivo.trim()}
            >
              Anular pedido
            </Button>
          </>
        }
      >
        <Textarea
          id="motivo-anulacion"
          label="Motivo"
          required
          rows={2}
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          hint="Obligatorio. Queda registrado con tu usuario."
        />
      </Dialog>
    </div>
  );
}

function mapItems(pedido: PedidoDetalleDto): ItemLocal[] {
  return pedido.items.map((item) => ({
    productoId: item.productoId,
    cantidad: item.cantidad,
    nombreMostrado: item.nombreMostrado,
    unidadMedida: item.unidadMedida,
    precioUnitarioCentavos: item.precioUnitarioCentavos,
    puntoCarga: item.puntoCarga,
    notaProduccion: item.notaProduccion,
  }));
}

function mismoItemsLocal(a: ItemLocal[], b: ItemLocal[]): boolean {
  if (a.length !== b.length) return false;
  const porId = new Map(b.map((i) => [i.productoId, i]));
  return a.every((row) => {
    const other = porId.get(row.productoId);
    return other != null && other.cantidad === row.cantidad;
  });
}
