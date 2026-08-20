"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2 } from "lucide-react";
import {
  formatearFechaLarga,
  totalPedidoCentavos,
  type PortalPedido,
  type PortalProducto,
  type PortalSesion,
} from "@misupertostada/shared";
import { api, ApiError } from "@/lib/api";
import { Providers } from "@/components/providers";
import { PortalShell } from "@/components/portal/portal-shell";
import { VentanaCountdown } from "@/components/portal/ventana-countdown";
import {
  PortalProductoFila,
  PortalSeccion,
} from "@/components/portal/portal-producto-fila";
import { PedidoItemRow } from "@/components/domain/pedido-item-row";
import { ContadorFacturas } from "@/components/domain/contador-facturas";
import { VentanaBadge } from "@/components/domain/ventana-badge";
import { EstadoBadge } from "@/components/domain/estado-badge";
import { Money } from "@/components/domain/money";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";

type Vista = "catalogo" | "resumen" | "confirmado";

function entregaCopy(sesion: PortalSesion): string {
  const fecha = formatearFechaLarga(sesion.ventana.fechaOperacion);
  const hora = sesion.ventana.horarioEntregaFijo;
  return hora
    ? `Su pedido llega el ${fecha} a las ${hora}.`
    : `Su pedido llega el ${fecha}.`;
}

function copyProximaApertura(iso: string): string {
  const fecha = formatearFechaLarga(iso.slice(0, 10));
  const hora = iso.slice(11, 16);
  return `Abre de nuevo el ${fecha} a las ${hora}.`;
}

function cantidadesDesdePedido(
  pedido: PortalPedido | null,
): Record<string, number> {
  if (!pedido) return {};
  return Object.fromEntries(
    pedido.items.map((item) => [item.productoId, item.cantidad]),
  );
}

function PortalPageInner({ token }: { token: string }) {
  const qc = useQueryClient();
  const [vista, setVista] = useState<Vista>("catalogo");
  const [cantidades, setCantidades] = useState<Record<string, number>>({});
  const [errorAccion, setErrorAccion] = useState<string | null>(null);

  const sesion = useQuery({
    queryKey: ["portal", token],
    queryFn: () => api<PortalSesion>(`/p/${encodeURIComponent(token)}`),
  });

  useEffect(() => {
    if (!sesion.data) return;
    setCantidades((prev) => {
      if (Object.keys(prev).length > 0) return prev;
      return cantidadesDesdePedido(sesion.data.pedidoAbierto);
    });
  }, [sesion.data]);

  const itemsElegidos = useMemo(() => {
    const catalogo = sesion.data?.catalogo ?? [];
    return catalogo
      .filter((p) => (cantidades[p.productoId] ?? 0) > 0 && p.pedible)
      .map((p) => ({
        producto: p,
        cantidad: cantidades[p.productoId] ?? 0,
      }));
  }, [sesion.data, cantidades]);

  const totalCentavos = useMemo(
    () =>
      totalPedidoCentavos(
        itemsElegidos.map((i) => ({
          cantidad: i.cantidad,
          precioUnitarioCentavos: i.producto.precioCentavos ?? 0,
        })),
      ),
    [itemsElegidos],
  );

  const confirmar = useMutation({
    mutationFn: () =>
      api<PortalPedido>(`/p/${encodeURIComponent(token)}/pedido`, {
        method: "PUT",
        body: JSON.stringify({
          items: itemsElegidos.map((i) => ({
            productoId: i.producto.productoId,
            cantidad: i.cantidad,
          })),
        }),
      }),
    onSuccess: (pedido) => {
      setErrorAccion(null);
      qc.setQueryData<PortalSesion>(["portal", token], (actual) =>
        actual ? { ...actual, pedidoAbierto: pedido } : actual,
      );
      setVista("confirmado");
    },
    onError: (err) => {
      setErrorAccion(
        err instanceof ApiError ? err.message : "No se pudo confirmar el pedido",
      );
    },
  });

  if (sesion.isPending) {
    return (
      <div className="mx-auto grid min-h-[100dvh] w-full max-w-[430px] gap-3 bg-[var(--surface-page)] p-4">
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (sesion.error instanceof ApiError) {
    return (
      <div className="grid min-h-[100dvh] place-items-center bg-[var(--surface-page)] p-6">
        <EmptyState
          title="No encontramos esa página"
          description="El enlace no es válido o ya no está activo. Pida uno nuevo a la fábrica."
        />
      </div>
    );
  }

  if (!sesion.data) return null;
  const data = sesion.data;
  const abierta = data.ventana.abierta;
  const favoritos = data.catalogo.filter((p) => p.favorito);
  const resto = data.catalogo.filter((p) => !p.favorito);
  const pedido = data.pedidoAbierto;

  const setCantidad = (producto: PortalProducto, cantidad: number) => {
    setCantidades((prev) => ({ ...prev, [producto.productoId]: cantidad }));
  };

  const pie = (accion: ReactNode) => (
    <div className="border-t border-[var(--border-subtle)] bg-blanco px-4 py-3 shadow-[0_-2px_8px_rgba(23,25,15,.06)]">
      {errorAccion ? (
        <p className="mb-2 text-xs text-peligro">{errorAccion}</p>
      ) : null}
      <div className="mb-2 flex items-baseline justify-between">
        <span className="text-xs text-tinta-500">
          {itemsElegidos.length}{" "}
          {itemsElegidos.length === 1 ? "producto" : "productos"}
        </span>
        <Money centavos={totalCentavos} />
      </div>
      {accion}
    </div>
  );

  if (vista === "confirmado" && pedido) {
    return (
      <PortalShell clienteNombre={data.cliente.nombre}>
        <div className="grid gap-4 overflow-auto p-4">
          <Card tone="brand">
            <div className="grid justify-items-start gap-2">
              <CheckCircle2 size={30} className="text-acento" aria-hidden />
              <h1 className="font-display text-2xl uppercase leading-none text-acento">
                Pedido
                <br />
                confirmado
              </h1>
              <p className="text-sm text-[var(--green-100)]">
                Pedido{" "}
                <span className="font-mono">#{pedido.correlativo}</span>
                {" · "}
                {formatearFechaLarga(pedido.fechaOperacion)}
                {data.ventana.horarioEntregaFijo
                  ? ` · entrega ${data.ventana.horarioEntregaFijo}`
                  : null}
              </p>
              <EstadoBadge estado="CONFIRMADO" />
            </div>
          </Card>
          <Card
            title="Le confirmamos por WhatsApp"
            subtitle="Así llega el mensaje"
          >
            <p className="rounded-campo bg-[var(--cream-100)] p-3 text-sm leading-relaxed text-pretty text-tinta-800">
              {pedido.textoConfirmacion}
            </p>
          </Card>
          {abierta ? (
            <Button
              variant="secondary"
              size="lg"
              className="w-full"
              onClick={() => {
                setCantidades(cantidadesDesdePedido(pedido));
                setVista("catalogo");
              }}
            >
              Editar mi pedido
            </Button>
          ) : null}
          <p className="text-center text-xs text-tinta-500">
            {abierta
              ? "Puede editarlo hasta la medianoche. Después entra a producción."
              : "La ventana ya cerró. Para anular, llame a la fábrica."}
          </p>
        </div>
      </PortalShell>
    );
  }

  if (vista === "resumen") {
    return (
      <PortalShell
        clienteNombre={data.cliente.nombre}
        footer={pie(
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="lg"
              onClick={() => setVista("catalogo")}
            >
              Cambiar
            </Button>
            <Button
              variant="accent"
              size="lg"
              className="flex-1"
              disabled={!abierta || itemsElegidos.length === 0}
              loading={confirmar.isPending}
              onClick={() => confirmar.mutate()}
            >
              Confirmar pedido
            </Button>
          </div>,
        )}
      >
        <div className="grid gap-4 overflow-auto p-4">
          <Card
            flush
            title="Su pedido"
            subtitle={`${formatearFechaLarga(data.ventana.fechaOperacion)}${
              data.ventana.horarioEntregaFijo
                ? ` · entrega ${data.ventana.horarioEntregaFijo}`
                : ""
            }`}
          >
            {itemsElegidos.map(({ producto, cantidad }) => (
              <PedidoItemRow
                key={producto.productoId}
                nombreMostrado={producto.alias}
                unidadMedida={producto.unidadMedida}
                cantidad={cantidad}
                precioUnitarioCentavos={producto.precioCentavos ?? 0}
              />
            ))}
            <div className="flex items-baseline justify-between bg-[var(--ink-50)] px-4 py-3">
              <span className="text-[12px] font-semibold uppercase tracking-[0.08em] text-tinta-500">
                Total
              </span>
              <Money centavos={totalCentavos} />
            </div>
          </Card>
          <Card tone="paper" title="Estado de cuenta">
            {data.cuenta.facturasPendientes === 0 ? (
              <p className="text-sm leading-relaxed text-tinta-500">
                Cuando haya facturas pendientes, las verá aquí.
              </p>
            ) : (
              <>
                <ContadorFacturas
                  pendientes={data.cuenta.facturasPendientes}
                  limite={data.cuenta.limiteFacturasPendientes}
                  montoCentavos={data.cuenta.saldoCentavos}
                />
                <ul className="mt-3 grid gap-2">
                  {data.cuenta.facturas.map((fac) => (
                    <li
                      key={fac.id}
                      className="flex items-baseline justify-between text-sm"
                    >
                      <span className="text-tinta-500">
                        {fac.numeroDte ?? "Sin DTE"} · {fac.antiguedadDias}{" "}
                        {fac.antiguedadDias === 1 ? "día" : "días"}
                      </span>
                      <Money centavos={fac.saldoCentavos} />
                    </li>
                  ))}
                </ul>
              </>
            )}
          </Card>
          <p className="text-center text-xs text-tinta-500">
            Para anular, llame a la fábrica.
          </p>
        </div>
      </PortalShell>
    );
  }

  return (
    <PortalShell
      clienteNombre={data.cliente.nombre}
      footer={pie(
        <Button
          variant="accent"
          size="lg"
          className="w-full"
          disabled={!abierta || itemsElegidos.length === 0}
          onClick={() => {
            setErrorAccion(null);
            setVista("resumen");
          }}
        >
          Revisar pedido
        </Button>,
      )}
    >
      <div className="grid flex-1 gap-4 overflow-auto pb-4">
        <div className="bg-[var(--surface-brand)] px-4 py-4 text-blanco">
          <div className="flex flex-wrap items-center gap-2">
            <VentanaBadge abierta={abierta} />
            {abierta ? (
              <VentanaCountdown cierraAt={data.ventana.cierraAt} />
            ) : null}
          </div>
          <p className="mt-2 text-sm leading-relaxed text-[var(--green-100)]">
            {abierta ? (
              <>
                {entregaCopy(data)} Puede cambiarlo hasta la medianoche.
              </>
            ) : (
              <>
                La ventana de pedido está cerrada.{" "}
                {copyProximaApertura(data.ventana.proximaAperturaAt)}
              </>
            )}
          </p>
        </div>
        {favoritos.length > 0 ? (
          <PortalSeccion titulo="Lo que pide siempre">
            {favoritos.map((p) => (
              <PortalProductoFila
                key={p.productoId}
                producto={p}
                cantidad={cantidades[p.productoId] ?? 0}
                onChange={(n) => setCantidad(p, n)}
                bloqueado={!abierta}
              />
            ))}
          </PortalSeccion>
        ) : null}
        <PortalSeccion titulo="Todo el catálogo">
          {(resto.length ? resto : data.catalogo).map((p) => (
            <PortalProductoFila
              key={p.productoId}
              producto={p}
              cantidad={cantidades[p.productoId] ?? 0}
              onChange={(n) => setCantidad(p, n)}
              bloqueado={!abierta}
            />
          ))}
        </PortalSeccion>
        <p className="px-4 text-xs text-tinta-500">
          Los nombres son los suyos. Internamente los traducimos a la
          nomenclatura de producción.
        </p>
      </div>
    </PortalShell>
  );
}

export default function PortalTokenPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  if (!token) {
    return (
      <div className="grid min-h-[100dvh] place-items-center bg-[var(--surface-page)]">
        <Skeleton className="h-10 w-40" />
      </div>
    );
  }
  return (
    <Providers>
      <PortalPageInner token={token} />
    </Providers>
  );
}
