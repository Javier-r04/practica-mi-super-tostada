"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2 } from "lucide-react";
import {
  formatearFechaLarga,
  totalPedidoCentavos,
  type PortalPedido,
  type PortalSesion,
} from "@misupertostada/shared";
import { api, ApiError } from "@/lib/api";
import {
  avisoLimiteCredito,
  copyProximaApertura,
  entregaCopy,
  gruposCatalogo,
} from "@/lib/portal-vista";
import {
  itemsElegidosDe,
  usePortalSession,
} from "@/components/portal/portal-session";
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
import { SearchField } from "@/components/ui/search-field";

type Vista = "catalogo" | "resumen" | "confirmado";

export default function PortalPedirPage() {
  const qc = useQueryClient();
  const {
    token,
    sesion,
    cantidades,
    setCantidad,
    resetDesdePedido,
    assetPath,
  } = usePortalSession();
  const [vista, setVista] = useState<Vista>(
    sesion.pedidoAbierto ? "confirmado" : "catalogo",
  );
  const [busqueda, setBusqueda] = useState("");
  const [errorAccion, setErrorAccion] = useState<string | null>(null);

  const abierta = sesion.ventana.abierta;
  const pedido = sesion.pedidoAbierto;
  const aviso = avisoLimiteCredito(sesion.cuenta);

  const itemsElegidos = useMemo(
    () => itemsElegidosDe(sesion.catalogo, cantidades),
    [sesion.catalogo, cantidades],
  );

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

  const { favoritos, grupos } = useMemo(
    () => gruposCatalogo({ catalogo: sesion.catalogo, query: busqueda }),
    [sesion.catalogo, busqueda],
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
    onSuccess: (confirmado) => {
      setErrorAccion(null);
      qc.setQueryData<PortalSesion>(["portal", token], (actual) =>
        actual
          ? { ...actual, pedidoAbierto: confirmado, ultimoPedido: {
              id: confirmado.id,
              correlativo: confirmado.correlativo,
              fechaOperacion: confirmado.fechaOperacion,
              estado: confirmado.estado,
              totalCentavos: confirmado.totalCentavos,
              origen: confirmado.origen,
            } }
          : actual,
      );
      setVista("confirmado");
    },
    onError: (err) => {
      setErrorAccion(
        err instanceof ApiError
          ? err.message
          : "No se pudo confirmar el pedido",
      );
    },
  });

  const pieResumen = (accion: ReactNode) => (
    <>
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
    </>
  );

  if (vista === "confirmado" && pedido) {
    return (
      <PortalShell clienteNombre={sesion.cliente.nombre}>
        <div className="grid gap-4 py-4" role="status">
          <Card tone="brand">
            <div className="grid justify-items-start gap-2">
              <CheckCircle2 size={30} className="text-acento" aria-hidden />
              <h1 className="font-display text-2xl leading-none text-acento">
                Pedido
                <br />
                confirmado
              </h1>
              <p className="text-sm text-[var(--green-100)]">
                Pedido{" "}
                <span className="font-mono">#{pedido.correlativo}</span>
                {" · "}
                {formatearFechaLarga(pedido.fechaOperacion)}
                {sesion.ventana.horarioEntregaFijo
                  ? ` · entrega ${sesion.ventana.horarioEntregaFijo}`
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
                resetDesdePedido();
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
        clienteNombre={sesion.cliente.nombre}
        footer={pieResumen(
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
        <div className="grid gap-4 py-4">
          <Card
            flush
            title="Su pedido"
            subtitle={`${formatearFechaLarga(sesion.ventana.fechaOperacion)}${
              sesion.ventana.horarioEntregaFijo
                ? ` · entrega ${sesion.ventana.horarioEntregaFijo}`
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
                fotoAssetId={producto.fotoAssetId}
                fotoSrcPath={
                  producto.fotoAssetId
                    ? assetPath(producto.fotoAssetId)
                    : undefined
                }
              />
            ))}
            <div className="flex items-baseline justify-between bg-[var(--ink-50)] px-4 py-3">
              <span className="mst-label">Total</span>
              <Money centavos={totalCentavos} />
            </div>
          </Card>
          <Card tone="paper" title="Estado de cuenta">
            {sesion.cuenta.facturasPendientes === 0 ? (
              <p className="text-sm leading-relaxed text-tinta-500">
                Cuando haya facturas pendientes, las verá aquí.
              </p>
            ) : (
              <>
                <ContadorFacturas
                  pendientes={sesion.cuenta.facturasPendientes}
                  limite={sesion.cuenta.limiteFacturasPendientes}
                  montoCentavos={sesion.cuenta.saldoCentavos}
                />
                <ul className="mt-3 grid gap-2">
                  {sesion.cuenta.facturas.map((fac) => (
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
          {aviso ? (
            <p className="text-sm text-peligro">{aviso}</p>
          ) : null}
          <p className="text-center text-xs text-tinta-500">
            Para anular, llame a la fábrica.
          </p>
        </div>
      </PortalShell>
    );
  }

  const resumenSticky = (
    <div className="grid gap-3">
      <div className="flex items-baseline justify-between">
        <span className="text-xs text-tinta-500">
          {itemsElegidos.length}{" "}
          {itemsElegidos.length === 1 ? "producto" : "productos"}
        </span>
        <Money centavos={totalCentavos} />
      </div>
      {sesion.cuenta.facturasPendientes > 0 ? (
        <ContadorFacturas
          pendientes={sesion.cuenta.facturasPendientes}
          limite={sesion.cuenta.limiteFacturasPendientes}
          montoCentavos={sesion.cuenta.saldoCentavos}
        />
      ) : null}
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
      </Button>
    </div>
  );

  return (
    <PortalShell
      clienteNombre={sesion.cliente.nombre}
      footer={
        <div className="lg:hidden">
          {errorAccion ? (
            <p className="mb-2 text-xs text-peligro">{errorAccion}</p>
          ) : null}
          {resumenSticky}
        </div>
      }
      mainClassName="pb-4"
    >
      <div className="grid flex-1 gap-4 py-4 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
        <div className="grid gap-4">
          <div className="rounded-tarjeta bg-[var(--surface-brand)] px-4 py-4 text-blanco">
            <div className="flex flex-wrap items-center gap-2">
              <VentanaBadge abierta={abierta} />
              {abierta ? (
                <VentanaCountdown cierraAt={sesion.ventana.cierraAt} />
              ) : null}
            </div>
            <p className="mt-2 text-sm leading-relaxed text-[var(--green-100)]">
              {abierta ? (
                <>
                  {entregaCopy(sesion)} Puede cambiarlo hasta la medianoche.
                </>
              ) : (
                <>
                  La ventana de pedido está cerrada.{" "}
                  {copyProximaApertura(sesion.ventana.proximaAperturaAt)}
                </>
              )}
            </p>
          </div>

          {aviso ? (
            <p className="rounded-campo bg-[var(--red-100)] px-4 py-3 text-sm text-peligro">
              {aviso}
            </p>
          ) : null}

          <SearchField
            label="Buscar producto"
            value={busqueda}
            onChange={setBusqueda}
            placeholder="Alias o nombre"
          />

          {favoritos.length > 0 ? (
            <PortalSeccion titulo="Lo que pide siempre">
              <div className="lg:hidden">
                {favoritos.map((p) => (
                  <PortalProductoFila
                    key={p.productoId}
                    producto={p}
                    cantidad={cantidades[p.productoId] ?? 0}
                    onChange={(n) => setCantidad(p.productoId, n)}
                    bloqueado={!abierta}
                    assetPath={assetPath}
                  />
                ))}
              </div>
              <div className="hidden grid-cols-2 gap-3 p-3 lg:grid xl:grid-cols-3">
                {favoritos.map((p) => (
                  <PortalProductoFila
                    key={p.productoId}
                    producto={p}
                    cantidad={cantidades[p.productoId] ?? 0}
                    onChange={(n) => setCantidad(p.productoId, n)}
                    bloqueado={!abierta}
                    assetPath={assetPath}
                    layout="card"
                  />
                ))}
              </div>
            </PortalSeccion>
          ) : null}

          {grupos.map((g) => (
            <PortalSeccion key={g.key} titulo={g.titulo}>
              <div className="lg:hidden">
                {g.productos.map((p) => (
                  <PortalProductoFila
                    key={p.productoId}
                    producto={p}
                    cantidad={cantidades[p.productoId] ?? 0}
                    onChange={(n) => setCantidad(p.productoId, n)}
                    bloqueado={!abierta}
                    assetPath={assetPath}
                  />
                ))}
              </div>
              <div className="hidden grid-cols-2 gap-3 p-3 lg:grid xl:grid-cols-3">
                {g.productos.map((p) => (
                  <PortalProductoFila
                    key={p.productoId}
                    producto={p}
                    cantidad={cantidades[p.productoId] ?? 0}
                    onChange={(n) => setCantidad(p.productoId, n)}
                    bloqueado={!abierta}
                    assetPath={assetPath}
                    layout="card"
                  />
                ))}
              </div>
            </PortalSeccion>
          ))}

          {favoritos.length === 0 && grupos.length === 0 ? (
            <p className="px-1 text-sm text-tinta-500">
              No hay productos que coincidan con la búsqueda.
            </p>
          ) : null}

          <p className="text-xs text-tinta-500">
            Los nombres son los suyos. Internamente los traducimos a la
            nomenclatura de producción.
          </p>
        </div>

        <aside className="hidden lg:sticky lg:top-4 lg:block">
          <Card title="Su pedido" className="shadow-[var(--shadow-sm)]">
            {resumenSticky}
          </Card>
        </aside>
      </div>
    </PortalShell>
  );
}
