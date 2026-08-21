"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Clock, Phone, Pin } from "lucide-react";
import { useEffect, useState } from "react";
import {
  horaEnZona,
  totalPedidoCentavos,
  type PedidoDetalle as PedidoDetalleDto,
} from "@misupertostada/shared";
import { api, ApiError } from "@/lib/api";
import { EstadoBadge } from "@/components/domain/estado-badge";
import { Money } from "@/components/domain/money";
import { PedidoItemRow } from "@/components/domain/pedido-item-row";
import { Badge, Tag } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/field";

const ACCION_TEXTO: Record<string, string> = {
  "portal.confirmar": "capturó el pedido desde el portal",
  "portal.editar": "editó el pedido desde el portal",
  "pedidos.capturar": "capturó el pedido",
  "pedidos.editar_items": "ajustó los ítems",
  "pedidos.notas": "actualizó las notas del administrador",
  "pedidos.anular": "anuló el pedido",
};

export function PedidoDetalle({
  pedido,
  puedeEscribir,
}: {
  pedido: PedidoDetalleDto;
  puedeEscribir: boolean;
}) {
  const qc = useQueryClient();
  const editable = puedeEscribir && pedido.estado === "CONFIRMADO";
  const [cantidades, setCantidades] = useState(() => mapCantidades(pedido));
  const [notas, setNotas] = useState(pedido.notasAdmin ?? "");
  const [anular, setAnular] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setCantidades(mapCantidades(pedido));
    setNotas(pedido.notasAdmin ?? "");
    setError(null);
  }, [pedido]);

  const itemsDirty = pedido.items.some(
    (item) => cantidades[item.productoId] !== item.cantidad,
  );
  const notasDirty = notas !== (pedido.notasAdmin ?? "");
  const total = totalPedidoCentavos(
    pedido.items.map((item) => ({
      cantidad: cantidades[item.productoId] ?? item.cantidad,
      precioUnitarioCentavos: item.precioUnitarioCentavos,
    })),
  );

  const guardarItems = useMutation({
    mutationFn: () =>
      api<PedidoDetalleDto>(`/pedidos/${pedido.id}/items`, {
        method: "PATCH",
        body: JSON.stringify({
          items: pedido.items.map((item) => ({
            productoId: item.productoId,
            cantidad: cantidades[item.productoId] ?? item.cantidad,
          })),
        }),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["pedidos"] });
      setError(null);
    },
    onError: (err) =>
      setError(
        err instanceof ApiError ? err.message : "No se pudieron guardar los ítems",
      ),
  });

  const guardarNotas = useMutation({
    mutationFn: () =>
      api<PedidoDetalleDto>(`/pedidos/${pedido.id}/notas`, {
        method: "PATCH",
        body: JSON.stringify({ notasAdmin: notas }),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["pedidos"] });
      setError(null);
    },
    onError: (err) =>
      setError(
        err instanceof ApiError ? err.message : "No se pudieron guardar las notas",
      ),
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
    },
    onError: (err) =>
      setError(err instanceof ApiError ? err.message : "No se pudo anular"),
  });

  const hora = horaEnZona(new Date(pedido.capturadoAt));
  const origenLabel = pedido.origen === "PORTAL" ? "Portal" : "Manual";

  return (
    <div className="grid gap-4">
      <Card>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-semibold text-tinta-900">
                {pedido.clienteNombre}
              </h2>
              <EstadoBadge estado={pedido.estado} />
              <Badge tone={pedido.origen === "PORTAL" ? "green" : "neutral"}>
                {origenLabel}
              </Badge>
            </div>
            <p className="mt-1 text-xs text-tinta-500">
              Pedido <span className="font-mono">#{pedido.correlativo}</span>
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
                <span className="inline-flex items-center gap-1">
                  <Phone size={13} aria-hidden />
                  {pedido.clienteTelefonoWa}
                </span>
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
              <p className="mt-2 text-sm text-peligro">
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
          {pedido.items.map((item) => (
            <PedidoItemRow
              key={item.productoId}
              nombreMostrado={item.nombreMostrado}
              unidadMedida={item.unidadMedida}
              cantidad={cantidades[item.productoId] ?? item.cantidad}
              precioUnitarioCentavos={item.precioUnitarioCentavos}
              puntoCarga={item.puntoCarga}
              notaProduccion={item.notaProduccion}
              editable={editable}
              onChangeCantidad={(v) =>
                setCantidades((prev) => ({ ...prev, [item.productoId]: v }))
              }
            />
          ))}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-tinta-50 px-4 py-3">
            {editable && itemsDirty ? (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => guardarItems.mutate()}
                loading={guardarItems.isPending}
              >
                Guardar ítems
              </Button>
            ) : (
              <span />
            )}
            <span className="ml-auto flex items-baseline gap-3">
              <span className="mst-label">
                Total del pedido
              </span>
              <Money centavos={total} className="text-lg" />
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
            onChange={(e) => setNotas(e.target.value)}
            placeholder="Ej. llevar junto con las tortillas de la mañana"
          />
          {editable && notasDirty && (
            <div className="mt-3">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => guardarNotas.mutate()}
                loading={guardarNotas.isPending}
              >
                Guardar notas
              </Button>
            </div>
          )}
        </Card>
        <Card title="Historial" subtitle="audit_log · quién hizo qué">
          <ol className="grid gap-2 text-xs text-tinta-800">
            {pedido.historial.length === 0 ? (
              <li className="text-tinta-500">Sin movimientos todavía.</li>
            ) : (
              pedido.historial.map((h, i) => (
                <li key={`${h.accion}-${h.createdAt}-${i}`} className="flex gap-3">
                  <span className="font-mono text-tinta-500">
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

      {error && <p className="text-sm text-peligro">{error}</p>}

      <Dialog
        open={anular}
        tone="danger"
        title={`Anular el pedido #${pedido.correlativo}`}
        description="El pedido no se borra: queda anulado con motivo y sigue visible en el historial."
        onClose={() => setAnular(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setAnular(false)}>
              Cerrar
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
          hint="Obligatorio. Queda en audit_log con tu usuario."
        />
      </Dialog>
    </div>
  );
}

function mapCantidades(pedido: PedidoDetalleDto): Record<string, number> {
  return Object.fromEntries(
    pedido.items.map((item) => [item.productoId, item.cantidad]),
  );
}
