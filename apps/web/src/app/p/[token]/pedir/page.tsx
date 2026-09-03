"use client";

import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Alert,
  Button,
  Card,
  Modal,
  SearchField,
  Spinner,
} from "@heroui/react";
import { CheckCircle2, PackageSearch } from "lucide-react";
import {
  formatearFechaLarga,
  totalPedidoCentavos,
  type PortalPedido,
  type PortalSesion,
} from "@misupertostada/shared";
import { api, ApiError } from "@/lib/api";
import {
  cierreAnticipadoVentana,
  copyEdicionHasta,
  copyProximaApertura,
  entregaCopy,
  gruposCatalogo,
} from "@/lib/portal-vista";
import {
  itemsElegidosDe,
  usePortalSession,
} from "@/components/portal/portal-session";
import { PortalFooter } from "@/components/portal/portal-shell";
import { PortalPedidoChip } from "@/components/portal/portal-pedido-chip";
import {
  PortalProductoFila,
  PortalSeccion,
} from "@/components/portal/portal-producto-fila";
import { PedidoItemRow } from "@/components/domain/pedido-item-row";
import { Money } from "@/components/domain/money";
import { EmptyState } from "@/components/ui/empty-state";

export default function PortalPedirPage() {
  const qc = useQueryClient();
  const {
    token,
    sesion,
    cantidades,
    setCantidad,
    resetDesdePedido,
    vaciarCantidades,
    assetPath,
  } = usePortalSession();
  const [confirmado, setConfirmado] = useState(
    () => sesion.pedidoAbierto != null,
  );
  const [revisando, setRevisando] = useState(false);
  const [cancelando, setCancelando] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [errorAccion, setErrorAccion] = useState<string | null>(null);

  const abierta = sesion.ventana.abierta;
  const cierreAnticipado = cierreAnticipadoVentana(sesion.ventana);
  const pedido = sesion.pedidoAbierto;
  const base = `/p/${encodeURIComponent(token)}`;

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

  const visibles =
    favoritos.length + grupos.reduce((n, g) => n + g.productos.length, 0);

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
    onSuccess: (recibido) => {
      setErrorAccion(null);
      qc.setQueryData<PortalSesion>(["portal", token], (actual) =>
        actual
          ? { ...actual, pedidoAbierto: recibido, ultimoPedido: {
              id: recibido.id,
              correlativo: recibido.correlativo,
              fechaOperacion: recibido.fechaOperacion,
              fechaEntrega: recibido.fechaEntrega,
              estado: recibido.estado,
              totalCentavos: recibido.totalCentavos,
              origen: recibido.origen,
            } }
          : actual,
      );
      setRevisando(false);
      setConfirmado(true);
    },
    onError: (err) => {
      setErrorAccion(
        err instanceof ApiError
          ? err.message
          : "No se pudo confirmar el pedido",
      );
    },
  });

  const cancelar = useMutation({
    mutationFn: () =>
      api<null>(`/p/${encodeURIComponent(token)}/pedido`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      setErrorAccion(null);
      setCancelando(false);
      setConfirmado(false);
      vaciarCantidades();
      qc.setQueryData<PortalSesion>(["portal", token], (actual) =>
        actual ? { ...actual, pedidoAbierto: null } : actual,
      );
    },
    onError: (err) => {
      setErrorAccion(
        err instanceof ApiError
          ? err.message
          : "No se pudo cancelar el pedido",
      );
    },
  });

  const fotoPorProducto = useMemo(
    () =>
      Object.fromEntries(
        sesion.catalogo.map((p) => [p.productoId, p.fotoAssetId]),
      ),
    [sesion.catalogo],
  );

  if (confirmado && pedido) {
    return (
      <>
        <div className="grid min-w-0 gap-4 py-4" role="status">
          <Card className="gap-3 border-[var(--green-900)] bg-[var(--surface-brand)] p-5 text-[var(--text-on-brand)] shadow-[var(--shadow-md)]">
            <CheckCircle2 size={32} className="text-acento" aria-hidden />
            <h1 className="min-w-0 text-balance font-display text-2xl leading-none text-acento">
              Pedido
              <br />
              confirmado
            </h1>
            <p className="min-w-0 text-pretty text-sm text-[var(--green-100)]">
              Pedido <span className="font-mono">#{pedido.correlativo}</span>
              {" · "}
              {formatearFechaLarga(pedido.fechaEntrega)}
              {sesion.ventana.horarioEntregaFijo
                ? ` · entrega ${sesion.ventana.horarioEntregaFijo}`
                : null}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <PortalPedidoChip pedido={pedido} tono="oscuro" />
            </div>
          </Card>

          <section className="grid gap-2">
            <h2 className="px-1 mst-label">Lo que pidió</h2>
            <Card className="gap-0 overflow-hidden p-0">
              {pedido.items.map((item) => {
                const fotoAssetId = fotoPorProducto[item.productoId] ?? null;
                return (
                  <PedidoItemRow
                    key={item.productoId}
                    nombreMostrado={item.nombreMostrado}
                    unidadMedida={item.unidadMedida}
                    cantidad={item.cantidad}
                    precioUnitarioCentavos={item.precioUnitarioCentavos}
                    fotoAssetId={fotoAssetId}
                    fotoSrcPath={
                      fotoAssetId ? assetPath(fotoAssetId) : undefined
                    }
                  />
                );
              })}
              <div className="flex min-w-0 items-baseline justify-between gap-2 bg-[var(--ink-50)] px-4 py-3">
                <span className="mst-label shrink-0">Total</span>
                <Money centavos={pedido.totalCentavos} className="text-[17px]" truncate />
              </div>
            </Card>
          </section>

          {abierta ? (
            <div className="grid gap-2">
              <Button
                fullWidth
                size="lg"
                variant="secondary"
                onPress={() => {
                  resetDesdePedido();
                  setConfirmado(false);
                }}
              >
                Editar mi pedido
              </Button>
              <Button
                fullWidth
                size="lg"
                variant="tertiary"
                className="text-peligro"
                onPress={() => {
                  setErrorAccion(null);
                  setCancelando(true);
                }}
              >
                Cancelar mi pedido
              </Button>
            </div>
          ) : null}

          <p className="text-center text-xs text-tinta-500">
            {cierreAnticipado
              ? `El día ya cerró. ${copyProximaApertura(sesion.ventana.proximaAperturaAt)}`
              : abierta
                ? copyEdicionHasta(sesion.ventana.cierraAt)
                : "La ventana ya cerró. Para anular, llame a la fábrica."}
          </p>

          {errorAccion ? (
            <Alert status="danger">
              <Alert.Indicator />
              <Alert.Content>
                <Alert.Title>No se completó la acción</Alert.Title>
                <Alert.Description>{errorAccion}</Alert.Description>
              </Alert.Content>
            </Alert>
          ) : null}
        </div>

        <Modal.Backdrop
          isOpen={cancelando}
          onOpenChange={(open) => {
            if (!open) setCancelando(false);
          }}
        >
          <Modal.Container size="md" placement="bottom">
            <Modal.Dialog className="pb-[max(1rem,env(safe-area-inset-bottom))]">
              <Modal.CloseTrigger />
              <Modal.Header>
                <Modal.Heading>¿Cancelar su pedido?</Modal.Heading>
              </Modal.Header>
              <Modal.Body className="grid gap-4">
                <Alert status="warning">
                  <Alert.Indicator />
                  <Alert.Content>
                    <Alert.Title>Esta acción no se puede deshacer</Alert.Title>
                    <Alert.Description>
                      Se anulará el pedido #{pedido.correlativo} de hoy. Ya no
                      entrará a producción ni a reparto.
                    </Alert.Description>
                  </Alert.Content>
                </Alert>
                <p className="text-sm leading-relaxed text-tinta-600">
                  Solo puede cancelarlo usted mientras la ventana esté abierta.
                  Cuando cierre, la fábrica tendrá que anularlo por teléfono.
                </p>
              </Modal.Body>
              <Modal.Footer className="flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button variant="tertiary" onPress={() => setCancelando(false)}>
                  Volver
                </Button>
                <Button
                  isPending={cancelar.isPending}
                  variant="danger"
                  className="w-full sm:w-auto"
                  onPress={() => cancelar.mutate()}
                >
                  {({ isPending }) => (
                    <>
                      {isPending && <Spinner color="current" size="sm" />}
                      Sí, cancelar mi pedido
                    </>
                  )}
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </>
    );
  }

  const resumenElegido = (
    <div className="grid gap-2">
      <div className="flex min-w-0 items-baseline justify-between gap-2">
        <span className="shrink-0 text-sm text-tinta-600 tabular-nums">
          {itemsElegidos.length}{" "}
          {itemsElegidos.length === 1 ? "producto" : "productos"}
        </span>
        <Money centavos={totalCentavos} className="text-[17px]" truncate />
      </div>
      <Button
        fullWidth
        size="lg"
        variant="primary"
        className="button--accent"
        isDisabled={!abierta || itemsElegidos.length === 0}
        onPress={() => {
          setErrorAccion(null);
          setRevisando(true);
        }}
      >
        Revisar pedido
      </Button>
    </div>
  );

  const secciones = [
    ...(favoritos.length > 0
      ? [{ key: "favoritos", titulo: "Lo que pide siempre", productos: favoritos }]
      : []),
    ...grupos,
  ];

  return (
    <>
      {itemsElegidos.length > 0 ? (
        <PortalFooter>
          <div className="min-w-0 lg:hidden">{resumenElegido}</div>
        </PortalFooter>
      ) : null}
      <div className="grid min-w-0 flex-1 gap-4 py-4 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
        <div className="grid min-w-0 gap-4">
          <div>
            <h1 className="sr-only text-xl font-semibold text-tinta-900 lg:not-sr-only">
              Pedir
            </h1>
            <p className="mt-1 text-pretty text-sm text-tinta-500">
              {cierreAnticipado ? (
                <>
                  {entregaCopy(sesion)} El día ya cerró.{" "}
                  {copyProximaApertura(sesion.ventana.proximaAperturaAt)}
                </>
              ) : abierta ? (
                <>
                  {entregaCopy(sesion)}
                  {pedido ? (
                    <>
                      {" "}
                      Pedido #{pedido.correlativo}.{" "}
                      {copyEdicionHasta(sesion.ventana.cierraAt)}
                    </>
                  ) : (
                    <> {copyEdicionHasta(sesion.ventana.cierraAt)}</>
                  )}
                </>
              ) : (
                <>
                  La ventana de pedido está cerrada.{" "}
                  {copyProximaApertura(sesion.ventana.proximaAperturaAt)}
                </>
              )}
            </p>
          </div>

          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <SearchField
              aria-label="Buscar producto"
              className="min-w-0 w-full flex-1 basis-[12rem]"
              value={busqueda}
              onChange={setBusqueda}
            >
              <SearchField.Group>
                <SearchField.SearchIcon />
                <SearchField.Input placeholder="Alias o nombre" />
                <SearchField.ClearButton />
              </SearchField.Group>
            </SearchField>
            {busqueda ? (
              <p className="mst-label w-full shrink-0 tabular-nums sm:w-auto" aria-live="polite">
                {visibles} de {sesion.catalogo.length}
              </p>
            ) : null}
          </div>

          {secciones.map((s) => (
            <PortalSeccion
              key={s.key}
              titulo={s.titulo}
              cuenta={s.productos.length}
            >
              <div className="divide-y divide-[var(--border-subtle)] lg:hidden">
                {s.productos.map((p) => (
                  <PortalProductoFila
                    key={p.productoId}
                    producto={p}
                    cantidad={cantidades[p.productoId] ?? 0}
                    onChange={(n) => setCantidad(p.productoId, n)}
                    bloqueado={!abierta}
                    assetPath={assetPath}
                    href={`${base}/pedir/${p.productoId}`}
                  />
                ))}
              </div>
              <div className="hidden grid-cols-2 gap-3 lg:grid xl:grid-cols-3">
                {s.productos.map((p) => (
                  <PortalProductoFila
                    key={p.productoId}
                    producto={p}
                    cantidad={cantidades[p.productoId] ?? 0}
                    onChange={(n) => setCantidad(p.productoId, n)}
                    bloqueado={!abierta}
                    assetPath={assetPath}
                    layout="card"
                    href={`${base}/pedir/${p.productoId}`}
                  />
                ))}
              </div>
            </PortalSeccion>
          ))}

          {secciones.length === 0 ? (
            <Card className="p-0">
              <EmptyState
                icon={<PackageSearch size={22} aria-hidden />}
                title="Nada con ese nombre"
                description="Pruebe con el nombre que usa usted, o borre la búsqueda para ver todo el catálogo."
                action={
                  <Button size="sm" variant="secondary" onPress={() => setBusqueda("")}>
                    Ver todo
                  </Button>
                }
              />
            </Card>
          ) : null}

          <p className="text-xs text-tinta-500">
            Los nombres son los suyos. Internamente los traducimos a la
            nomenclatura de producción.
          </p>
        </div>

        <aside className="hidden lg:sticky lg:top-20 lg:block">
          <Card className="gap-3 p-4">
            <Card.Header className="gap-1">
              <Card.Title>Su pedido</Card.Title>
            </Card.Header>
            <Card.Content>
              {itemsElegidos.length === 0 ? (
                <p className="text-sm text-tinta-500">
                  Toque un producto para armar el pedido.
                </p>
              ) : (
                resumenElegido
              )}
            </Card.Content>
          </Card>
        </aside>
      </div>

      <Modal.Backdrop
        isOpen={revisando}
        onOpenChange={(open) => {
          if (!open) setRevisando(false);
        }}
      >
        <Modal.Container size="md" placement="bottom">
          <Modal.Dialog className="flex max-h-[min(92dvh,40rem)] flex-col pb-[max(1rem,env(safe-area-inset-bottom))]">
            <Modal.CloseTrigger />
            <Modal.Header
              className="sticky top-0 z-10 shrink-0 border-b border-[var(--border-subtle)] bg-blanco pb-3"
            >
              <Modal.Heading>Revise su pedido</Modal.Heading>
              <p className="text-sm text-tinta-500">
                {formatearFechaLarga(sesion.ventana.fechaEntrega)}
                {sesion.ventana.horarioEntregaFijo
                  ? ` · entrega ${sesion.ventana.horarioEntregaFijo}`
                  : ""}
              </p>
              <div className="flex min-w-0 items-baseline justify-between gap-2 pt-3">
                <span className="shrink-0 text-sm tabular-nums text-tinta-600">
                  {itemsElegidos.length}{" "}
                  {itemsElegidos.length === 1 ? "producto" : "productos"}
                </span>
                <Money centavos={totalCentavos} className="text-[17px]" truncate />
              </div>
            </Modal.Header>

            <Modal.Body className="grid min-h-0 flex-1 gap-4 overflow-y-auto">
              <Card className="min-w-0 gap-0 overflow-hidden p-0">
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
              </Card>

              {errorAccion ? (
                <Alert status="danger">
                  <Alert.Indicator />
                  <Alert.Content>
                    <Alert.Title>No se confirmó</Alert.Title>
                    <Alert.Description>{errorAccion}</Alert.Description>
                  </Alert.Content>
                </Alert>
              ) : null}

              {abierta ? (
                <p className="text-xs text-tinta-500">
                  {copyEdicionHasta(sesion.ventana.cierraAt)}
                </p>
              ) : null}
            </Modal.Body>

            <Modal.Footer className="flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                variant="tertiary"
                className="w-full sm:w-auto"
                onPress={() => setRevisando(false)}
              >
                Cambiar
              </Button>
              <Button
                isDisabled={!abierta || itemsElegidos.length === 0}
                isPending={confirmar.isPending}
                size="lg"
                variant="primary"
                className="button--accent w-full sm:w-auto"
                onPress={() => confirmar.mutate()}
              >
                {({ isPending }) => (
                  <>
                    {isPending && <Spinner color="current" size="sm" />}
                    Confirmar pedido
                  </>
                )}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </>
  );
}
