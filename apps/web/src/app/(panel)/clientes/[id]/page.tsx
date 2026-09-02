"use client";

import {
  Alert,
  Button,
  Card,
  Checkbox,
  Chip,
  Description,
  Input,
  Label,
  Modal,
  Separator,
  Table,
  TextArea,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
} from "@heroui/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ClipboardList, Receipt } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState, type ReactNode } from "react";
import {
  FAMILIA_ETIQUETA,
  crearClienteRequestSchema,
  formatearCentavos,
  precioEfectivoCentavos,
  quetzalesTextoACentavos,
  tienePermiso,
  type ActorPublico,
  type ClienteProductoFila,
  type ClientePublico,
  type PedidoBandeja,
  type PortalCuenta,
} from "@misupertostada/shared";
import { api, ApiError } from "@/lib/api";
import { buildPedidosHref } from "@/lib/pedido-vista";
import { toastFromError, toastSuccess } from "@/lib/toast";
import { subirFotoCliente } from "@/lib/upload-asset";
import { PanelShell } from "@/components/layout/panel-shell";
import { Money } from "@/components/domain/money";
import { EstadoBadge } from "@/components/domain/estado-badge";
import { Skeleton, RowSkeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { KpiCard, KpiGrid, KpiGridSkeleton } from "@/components/ui/kpi-grid";
import { ClienteAvatar } from "@/components/catalog/cliente-avatar";
import { FotoPicker } from "@/components/catalog/foto-picker";
import { cn } from "@/lib/utils";

type Seccion = "operacion" | "precios" | "datos";

const SECCIONES: { id: Seccion; label: string }[] = [
  { id: "operacion", label: "Operación" },
  { id: "precios", label: "Precios" },
  { id: "datos", label: "Datos" },
];

export default function ClienteFichaPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const qc = useQueryClient();
  const [seccion, setSeccion] = useState<Seccion>("operacion");
  const [tokenVisible, setTokenVisible] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [clearFoto, setClearFoto] = useState(false);
  const [fotoBusy, setFotoBusy] = useState(false);

  const me = useQuery({
    queryKey: ["auth", "me"],
    queryFn: () => api<{ usuario: ActorPublico }>("/auth/me"),
  });
  const canWrite = tienePermiso(me.data?.usuario.permisos ?? [], "catalogo.escribir");
  const canPrecio = tienePermiso(me.data?.usuario.permisos ?? [], "precios.cambiar");

  const cliente = useQuery({
    queryKey: ["clientes", id],
    queryFn: () => api<ClientePublico>(`/clientes/${id}`),
  });
  const filas = useQuery({
    queryKey: ["clientes", id, "productos"],
    queryFn: () => api<ClienteProductoFila[]>(`/clientes/${id}/productos`),
    enabled: seccion === "precios",
  });
  const cuenta = useQuery({
    queryKey: ["clientes", id, "cuenta"],
    queryFn: () => api<PortalCuenta>(`/clientes/${id}/cuenta`),
    enabled: Boolean(cliente.data),
  });
  const historial = useQuery({
    queryKey: ["pedidos", { clienteId: id, historial: true }],
    queryFn: () => api<PedidoBandeja[]>(`/pedidos?clienteId=${id}&historial=1`),
    enabled: Boolean(cliente.data),
  });

  const rotar = useMutation({
    mutationFn: () =>
      api<{ token: string }>(`/clientes/${id}/token-portal`, { method: "POST" }),
    onSuccess: (data) => {
      setTokenVisible(data.token);
      qc.invalidateQueries({ queryKey: ["clientes", id] });
    },
    onError: (err) =>
      setError(err instanceof ApiError ? err.message : "No se pudo generar el token"),
  });

  const desactivar = useMutation({
    mutationFn: () => api(`/clientes/${id}/desactivar`, { method: "PATCH" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["clientes", id] }),
  });
  const activar = useMutation({
    mutationFn: () => api(`/clientes/${id}/activar`, { method: "PATCH" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["clientes", id] }),
  });

  if (cliente.isLoading || !cliente.data) {
    return (
      <PanelShell title="Cliente" volver={{ href: "/clientes", label: "Clientes" }}>
        <div className="grid gap-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-32 w-full rounded-tarjeta" />
          <Skeleton className="h-48 w-full rounded-tarjeta" />
        </div>
      </PanelShell>
    );
  }

  const c = cliente.data;
  const fotoMostrada = clearFoto ? null : c.fotoAssetId;
  const enProgreso = (cuenta.data?.facturas ?? []).filter((f) => !f.numeroDte).length;
  const excedido =
    cuenta.data != null &&
    cuenta.data.limiteFacturasPendientes != null &&
    cuenta.data.facturasPendientes >= cuenta.data.limiteFacturasPendientes;

  async function guardarFoto() {
    if (!canWrite) return;
    if (!fotoFile && !clearFoto) return;
    setFotoBusy(true);
    setError(null);
    try {
      if (fotoFile) {
        const assetId = await subirFotoCliente(fotoFile, id);
        await api(`/clientes/${id}`, {
          method: "PATCH",
          body: JSON.stringify({ fotoAssetId: assetId }),
        });
      } else if (clearFoto) {
        await api(`/clientes/${id}`, {
          method: "PATCH",
          body: JSON.stringify({ fotoAssetId: null }),
        });
      }
      setFotoFile(null);
      setClearFoto(false);
      toastSuccess("Foto actualizada");
      await qc.invalidateQueries({ queryKey: ["clientes", id] });
      await qc.invalidateQueries({ queryKey: ["clientes"] });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo actualizar la foto");
      toastFromError(err, "No se pudo actualizar la foto");
    } finally {
      setFotoBusy(false);
    }
  }

  return (
    <PanelShell
      title={c.nombre}
      volver={{ href: "/clientes", label: "Clientes" }}
      barraFija={
        <ToggleButtonGroup
          aria-label="Secciones del cliente"
          className="mst-segmento-activo w-full [&_.toggle-button]:min-w-0 [&_.toggle-button]:flex-1 [&_.toggle-button]:px-2 [&_.toggle-button]:text-xs sm:[&_.toggle-button]:text-sm"
          disallowEmptySelection
          selectedKeys={new Set([seccion])}
          selectionMode="single"
          size="sm"
          onSelectionChange={(keys) => {
            const next = [...keys][0];
            if (typeof next === "string") setSeccion(next as Seccion);
          }}
        >
          {SECCIONES.map((s, i) => (
            <ToggleButton key={s.id} id={s.id}>
              {i > 0 && <ToggleButtonGroup.Separator />}
              {s.label}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      }
    >
      <div className="grid min-w-0 gap-4 sm:gap-5">
        <Link
          href="/clientes"
          className="hidden min-h-11 w-fit items-center gap-1 text-sm font-semibold text-marca no-underline hover:text-marca-hover hover:no-underline lg:inline-flex"
        >
          <ChevronLeft size={16} aria-hidden />
          Clientes
        </Link>

        {/* Cabecera: identidad, estado de la ficha y la acción de portal.
            Lo destructivo vive en Datos, no aquí. */}
        <Card
          className="gap-3 border-l-[3px] border-l-[var(--border-accent)] p-4 sm:gap-4 sm:p-5"
          render={(props) => <header {...props} />}
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
            <ClienteAvatar
              nombre={c.nombre}
              fotoAssetId={fotoMostrada}
              size="md"
              className="sm:size-20 sm:text-base"
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-pretty text-lg font-semibold text-tinta-900 sm:text-2xl">
                  {c.nombre}
                </h1>
                {!c.activo && (
                  <Chip color="warning" size="sm" variant="soft">
                    Inactivo
                  </Chip>
                )}
                {c.tieneTokenPortal && (
                  <Chip color="success" size="sm" variant="soft">
                    Portal activo
                  </Chip>
                )}
                {excedido && (
                  <Chip color="danger" size="sm" variant="soft">
                    Límite excedido
                  </Chip>
                )}
              </div>
              <p className="mst-label mt-1 truncate">
                {c.horarioEntregaFijo
                  ? `Entrega ${c.horarioEntregaFijo}`
                  : "Sin horario fijo"}
                {c.contacto ? ` · ${c.contacto}` : ""}
                {c.telefonoWa ? ` · ${c.telefonoWa}` : ""}
              </p>
            </div>
            {canWrite && (
              <Button
                className="w-full shrink-0 sm:w-auto sm:self-center"
                isDisabled={rotar.isPending}
                size="sm"
                variant="secondary"
                onPress={() => rotar.mutate()}
              >
                {rotar.isPending
                  ? "Un momento…"
                  : c.tieneTokenPortal
                    ? "Rotar token"
                    : "Generar token"}
              </Button>
            )}
          </div>

          {c.notasPermanentes && (
            <>
              <Separator />
              <div>
                <p className="mst-label text-[11px]">Notas permanentes</p>
                <p className="mt-0.5 text-sm text-pretty text-tinta-800">
                  {c.notasPermanentes}
                </p>
              </div>
            </>
          )}
        </Card>

        {error && (
          <Alert status="danger">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>Algo no se aplicó</Alert.Title>
              <Alert.Description>{error}</Alert.Description>
            </Alert.Content>
          </Alert>
        )}

        {seccion === "operacion" && (
          <div className="grid min-w-0 gap-4">
            {cuenta.isLoading ? (
              <KpiGridSkeleton count={4} />
            ) : cuenta.data ? (
              <>
                <KpiGrid>
                  <KpiCard
                    etiqueta="Facturas pendientes"
                    valor={
                      <>
                        {cuenta.data.facturasPendientes}
                        {cuenta.data.limiteFacturasPendientes != null && (
                          <span className="text-sm font-medium text-tinta-500">
                            /{cuenta.data.limiteFacturasPendientes}
                          </span>
                        )}
                      </>
                    }
                    tono={excedido ? "peligro" : "neutro"}
                  />
                  <KpiCard
                    etiqueta="Saldo"
                    valor={
                      <Money
                        centavos={cuenta.data.saldoCentavos}
                        tone={excedido ? "vencido" : "pendiente"}
                        truncate
                      />
                    }
                  />
                  <KpiCard
                    etiqueta="Por facturar"
                    nota="Sin DTE"
                    valor={enProgreso}
                    tono={enProgreso > 0 ? "aviso" : "neutro"}
                  />
                  <KpiCard etiqueta="Facturas abiertas" valor={cuenta.data.facturas.length} />
                </KpiGrid>

                {excedido && (
                  <Alert status="danger">
                    <Alert.Indicator />
                    <Alert.Content>
                      <Alert.Title>Límite de crédito excedido</Alert.Title>
                      <Alert.Description>
                        Alerta informativa: no bloquea la entrega ni el cobro.
                        Conviene hablar con el restaurante antes del próximo
                        reparto.
                      </Alert.Description>
                    </Alert.Content>
                  </Alert>
                )}
              </>
            ) : null}

            <Card className="gap-0 p-0">
              <Card.Header className="flex-row flex-wrap items-center justify-between gap-2 p-5 pb-3">
                <div className="min-w-0">
                  <Card.Title className="text-base text-tinta-900">
                    Facturas abiertas
                  </Card.Title>
                  <Card.Description>
                    Pendientes, abonos y vencidas · las sin DTE están por facturar
                  </Card.Description>
                </div>
                <Link href={`/cartera?clienteId=${id}`} className="text-sm">
                  Ver en cartera
                </Link>
              </Card.Header>
              <Card.Content className="p-0">
                {cuenta.isLoading ? (
                  <RowSkeleton rows={3} />
                ) : (cuenta.data?.facturas.length ?? 0) === 0 ? (
                  <EmptyState
                    icon={<Receipt size={20} aria-hidden />}
                    title="Sin facturas pendientes"
                    description="Este restaurante está al día en el cuaderno de cobros."
                  />
                ) : (
                  <ul>
                    {cuenta.data!.facturas.map((f) => (
                      <li
                        key={f.id}
                        className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1 border-t border-[var(--border-subtle)] px-5 py-3"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-mono text-xs text-tinta-500">
                            {f.numeroDte ?? "Sin DTE"}
                          </p>
                          <p className="text-sm text-tinta-500">
                            {f.emitidaAt
                              ? `Emitida · ${f.antiguedadDias} días`
                              : "Sin fecha de emisión"}
                          </p>
                        </div>
                        <div className="min-w-0 shrink text-right">
                          <Money
                            centavos={f.saldoCentavos}
                            truncate
                            tone={
                              f.estado === "VENCIDO"
                                ? "vencido"
                                : f.estado === "ABONO_PARCIAL"
                                  ? "pendiente"
                                  : "default"
                            }
                          />
                        </div>
                        <div className="col-span-2 flex flex-wrap gap-1.5">
                          <EstadoBadge estado={f.estado} size="sm" />
                          {!f.numeroDte && (
                            <Chip color="warning" size="sm" variant="soft">
                              Por facturar
                            </Chip>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </Card.Content>
            </Card>

            <Card className="gap-0 p-0">
              <Card.Header className="flex-row flex-wrap items-center justify-between gap-2 p-5 pb-3">
                <div className="min-w-0">
                  <Card.Title className="text-base text-tinta-900">
                    Historial de pedidos
                  </Card.Title>
                  <Card.Description>
                    Últimos correlativos de este restaurante
                  </Card.Description>
                </div>
                <Link
                  href={buildPedidosHref({ clienteId: id, historial: true })}
                  className="text-sm"
                >
                  Ver en pedidos
                </Link>
              </Card.Header>
              <Card.Content className="p-0">
                {historial.isLoading ? (
                  <RowSkeleton rows={4} />
                ) : (historial.data?.length ?? 0) === 0 ? (
                  <EmptyState
                    icon={<ClipboardList size={20} aria-hidden />}
                    title="Sin pedidos aún"
                    description="Cuando capturen o confirmen pedidos, aparecen aquí."
                  />
                ) : (
                  <ul>
                    {historial.data!.map((p) => (
                      <li
                        key={p.id}
                        className="border-t border-[var(--border-subtle)]"
                      >
                        <Link
                          href={buildPedidosHref({
                            clienteId: id,
                            historial: true,
                            pedidoId: p.id,
                          })}
                          className="flex min-h-fila min-w-0 items-center gap-2 px-5 py-2.5 text-inherit no-underline hover:bg-tinta-50 hover:text-inherit hover:no-underline focus-visible:outline-none focus-visible:shadow-foco sm:gap-3"
                        >
                          <span className="w-12 shrink-0 font-mono text-xs tabular-nums text-tinta-500 sm:w-14">
                            #{p.correlativo}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold tabular-nums text-tinta-900">
                              Entrega {p.fechaEntrega}
                            </span>
                            <span className="block truncate text-xs text-tinta-500">
                              {p.origen === "PORTAL" ? "Portal" : "Manual"} ·
                              operación {p.fechaOperacion}
                            </span>
                          </span>
                          <EstadoBadge estado={p.estado} size="sm" />
                          <Money
                            centavos={p.totalCentavos}
                            truncate
                            className="shrink-0 text-sm sm:text-base"
                          />
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </Card.Content>
            </Card>
          </div>
        )}

        {seccion === "precios" && (
          <div className="grid min-w-0 gap-3">
            <p className="text-sm text-pretty text-tinta-500">
              El alias es como el restaurante nombra el producto; la nota de
              producción viaja a la hoja del día. Cada cambio se guarda al salir
              del campo.
            </p>
            {filas.isLoading ? (
              <RowSkeleton rows={5} />
            ) : (
              <div className="min-w-0 overflow-x-auto">
                <Table>
                  <Table.ScrollContainer>
                    <Table.Content
                      aria-label={`Productos de ${c.nombre}`}
                      className="min-w-[720px]"
                    >
                    <Table.Header>
                      <Table.Column isRowHeader id="producto">
                        Producto
                      </Table.Column>
                      <Table.Column id="familia">Familia</Table.Column>
                      <Table.Column id="alias">Alias</Table.Column>
                      <Table.Column id="precio_base">Base</Table.Column>
                      <Table.Column id="precio">Precio cliente</Table.Column>
                      <Table.Column id="nota">Nota producción</Table.Column>
                      <Table.Column id="favorito">Favorito</Table.Column>
                    </Table.Header>
                    <Table.Body
                      items={filas.data ?? []}
                      renderEmptyState={() => (
                        <EmptyState
                          title="Sin productos"
                          description="Este cliente aún no tiene productos asignados en el catálogo."
                        />
                      )}
                    >
                      {(fila: ClienteProductoFila) => (
                        <Table.Row id={fila.productoId}>
                          <Table.Cell>
                            <div className="font-semibold text-tinta-900">
                              {fila.nombreCanonico}
                            </div>
                            <div className="font-mono text-xs text-tinta-500">
                              {fila.sku}
                            </div>
                          </Table.Cell>
                          <Table.Cell className="text-tinta-500">
                            {FAMILIA_ETIQUETA[fila.familia]}
                          </Table.Cell>
                          <Table.Cell>
                            <InlineText
                              key={fila.alias ?? ""}
                              etiqueta={`Alias de ${fila.nombreCanonico}`}
                              value={fila.alias ?? ""}
                              disabled={!canWrite}
                              onSave={(alias) =>
                                api(`/clientes/${id}/productos/${fila.productoId}`, {
                                  method: "PUT",
                                  body: JSON.stringify({ alias: alias || null }),
                                }).then(() =>
                                  qc.invalidateQueries({
                                    queryKey: ["clientes", id, "productos"],
                                  }),
                                )
                              }
                            />
                          </Table.Cell>
                          <Table.Cell className="text-right text-tinta-500">
                            <Money centavos={fila.precioBaseCentavos} />
                          </Table.Cell>
                          <Table.Cell className="text-right">
                            {canPrecio ? (
                              <InlinePrecio
                                key={String(fila.precioCentavos)}
                                etiqueta={`Precio de ${fila.nombreCanonico}`}
                                centavos={fila.precioCentavos}
                                onSave={(precioCentavos) =>
                                  api(
                                    `/clientes/${id}/productos/${fila.productoId}`,
                                    {
                                      method: "PUT",
                                      body: JSON.stringify({ precioCentavos }),
                                    },
                                  ).then(() =>
                                    qc.invalidateQueries({
                                      queryKey: ["clientes", id, "productos"],
                                    }),
                                  )
                                }
                              />
                            ) : (
                              <Money
                                centavos={precioEfectivoCentavos({
                                  precioClienteCentavos: fila.precioCentavos,
                                  precioBaseCentavos: fila.precioBaseCentavos,
                                })}
                              />
                            )}
                          </Table.Cell>
                          <Table.Cell>
                            <InlineText
                              key={fila.notaProduccion ?? ""}
                              etiqueta={`Nota de producción de ${fila.nombreCanonico}`}
                              value={fila.notaProduccion ?? ""}
                              disabled={!canWrite}
                              onSave={(notaProduccion) =>
                                api(`/clientes/${id}/productos/${fila.productoId}`, {
                                  method: "PUT",
                                  body: JSON.stringify({
                                    notaProduccion: notaProduccion || null,
                                  }),
                                }).then(() =>
                                  qc.invalidateQueries({
                                    queryKey: ["clientes", id, "productos"],
                                  }),
                                )
                              }
                            />
                          </Table.Cell>
                          <Table.Cell>
                            <div className="flex justify-center">
                              <Checkbox
                                aria-label={`Favorito: ${fila.nombreCanonico}`}
                                isDisabled={!canWrite}
                                isSelected={fila.favorito}
                                onChange={(favorito) => {
                                  void api(
                                    `/clientes/${id}/productos/${fila.productoId}`,
                                    {
                                      method: "PUT",
                                      body: JSON.stringify({ favorito }),
                                    },
                                  ).then(() =>
                                    qc.invalidateQueries({
                                      queryKey: ["clientes", id, "productos"],
                                    }),
                                  );
                                }}
                              >
                                <Checkbox.Content>
                                  <Checkbox.Control>
                                    <Checkbox.Indicator />
                                  </Checkbox.Control>
                                </Checkbox.Content>
                              </Checkbox>
                            </div>
                          </Table.Cell>
                        </Table.Row>
                      )}
                    </Table.Body>
                  </Table.Content>
                </Table.ScrollContainer>
              </Table>
              </div>
            )}
          </div>
        )}

        {seccion === "datos" && (
          <div className="grid min-w-0 gap-4">
            {canWrite && (
              <Card className="p-5">
                <Card.Header>
                  <Card.Title className="text-base text-tinta-900">Foto</Card.Title>
                  <Card.Description>
                    Se usa en reparto y en el listado para reconocer el local.
                  </Card.Description>
                </Card.Header>
                <Card.Content>
                  <FotoPicker
                    value={fotoFile}
                    existingAssetId={fotoMostrada}
                    onChange={(file) => {
                      setFotoFile(file);
                      if (file) setClearFoto(false);
                    }}
                    onClearExisting={() => {
                      setClearFoto(true);
                      setFotoFile(null);
                    }}
                    disabled={fotoBusy}
                  />
                </Card.Content>
                {(fotoFile || clearFoto) && (
                  <Card.Footer>
                    <Button
                      isDisabled={fotoBusy}
                      size="sm"
                      variant="primary"
                      onPress={() => void guardarFoto()}
                    >
                      {fotoBusy ? "Un momento…" : "Guardar foto"}
                    </Button>
                  </Card.Footer>
                )}
              </Card>
            )}

            <Card className="p-5">
              <Card.Header>
                <Card.Title className="text-base text-tinta-900">Ficha</Card.Title>
                <Card.Description>
                  Datos que no cambian día a día.
                </Card.Description>
              </Card.Header>
              <Card.Content>
                <FichaForm cliente={c} canWrite={canWrite} />
              </Card.Content>
            </Card>

            {canWrite && (
              <Card className="gap-3 border-[var(--red-100)] p-5">
                <Card.Header>
                  <Card.Title className="text-base text-tinta-900">
                    {c.activo ? "Desactivar cliente" : "Reactivar cliente"}
                  </Card.Title>
                  <Card.Description>
                    {c.activo
                      ? "Deja de aparecer en la ronda nocturna y en el listado de activos. El historial y la cartera se conservan."
                      : "Vuelve a aparecer en la ronda nocturna y en el listado de activos."}
                  </Card.Description>
                </Card.Header>
                <Card.Footer>
                  {c.activo ? (
                    <Button
                      isDisabled={desactivar.isPending}
                      size="sm"
                      variant="danger"
                      onPress={() => desactivar.mutate()}
                    >
                      Desactivar cliente
                    </Button>
                  ) : (
                    <Button
                      isDisabled={activar.isPending}
                      size="sm"
                      variant="secondary"
                      onPress={() => activar.mutate()}
                    >
                      Reactivar cliente
                    </Button>
                  )}
                </Card.Footer>
              </Card>
            )}
          </div>
        )}
      </div>

      <Modal.Backdrop
        isOpen={tokenVisible != null}
        onOpenChange={(open) => {
          if (!open) setTokenVisible(null);
        }}
      >
        <Modal.Container size="md">
          <Modal.Dialog>
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading>Token del portal</Modal.Heading>
              <p className="text-sm text-tinta-500">
                Cópielo ahora. No se vuelve a mostrar; si lo pierde, ruede uno
                nuevo.
              </p>
            </Modal.Header>
            <Modal.Body>
              <p className="break-all rounded-campo bg-tinta-50 p-3 font-mono text-sm">
                {tokenVisible}
              </p>
            </Modal.Body>
            <Modal.Footer>
              <Button
                variant="primary"
                onPress={() => {
                  if (tokenVisible) {
                    void navigator.clipboard.writeText(tokenVisible);
                    toastSuccess("Token copiado");
                  }
                }}
              >
                Copiar token
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </PanelShell>
  );
}

function FichaForm({
  cliente,
  canWrite,
}: {
  cliente: ClientePublico;
  canWrite: boolean;
}) {
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [nombre, setNombre] = useState(cliente.nombre);
  const [contacto, setContacto] = useState(cliente.contacto ?? "");
  const [telefonoWa, setTelefonoWa] = useState(cliente.telefonoWa ?? "");
  const [horario, setHorario] = useState(cliente.horarioEntregaFijo ?? "");
  const [notas, setNotas] = useState(cliente.notasPermanentes ?? "");
  const [limite, setLimite] = useState(
    cliente.limiteFacturasPendientes != null
      ? String(cliente.limiteFacturasPendientes)
      : "",
  );

  const guardar = useMutation({
    mutationFn: async () => {
      const parsed = crearClienteRequestSchema.safeParse({
        nombre,
        contacto: contacto.trim() || null,
        telefonoWa: telefonoWa.trim() || null,
        horarioEntregaFijo: horario.trim() || null,
        notasPermanentes: notas.trim() || null,
        limiteFacturasPendientes: limite.trim() ? Number(limite) : null,
      });
      if (!parsed.success) throw new Error("Revise los datos del cliente");
      await api(`/clientes/${cliente.id}`, {
        method: "PATCH",
        body: JSON.stringify(parsed.data),
      });
    },
    onSuccess: async () => {
      setError(null);
      toastSuccess("Ficha guardada");
      await qc.invalidateQueries({ queryKey: ["clientes", cliente.id] });
      await qc.invalidateQueries({ queryKey: ["clientes"] });
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : "No se pudo guardar");
      if (err instanceof ApiError) toastFromError(err, "No se pudo guardar");
    },
  });

  return (
    <form
      className="grid gap-3 md:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        guardar.mutate();
      }}
    >
      <TextField
        isRequired
        isDisabled={!canWrite}
        value={nombre}
        onChange={setNombre}
      >
        <Label>Nombre</Label>
        <Input />
      </TextField>
      <TextField isDisabled={!canWrite} value={contacto} onChange={setContacto}>
        <Label>Contacto</Label>
        <Input />
      </TextField>
      <TextField
        isDisabled={!canWrite}
        type="tel"
        value={telefonoWa}
        onChange={setTelefonoWa}
      >
        <Label>Teléfono WhatsApp</Label>
        <Input />
      </TextField>
      <TextField isDisabled={!canWrite} value={horario} onChange={setHorario}>
        <Label>Horario de entrega fijo</Label>
        <Input placeholder="09:00" />
        <Description>Formato 24 h, HH:MM</Description>
      </TextField>
      <TextField isDisabled={!canWrite} value={limite} onChange={setLimite}>
        <Label>Límite de facturas pendientes</Label>
        <Input inputMode="numeric" />
        <Description>Como en el cuaderno de cobros</Description>
      </TextField>
      <div className="md:col-span-2">
        <TextField isDisabled={!canWrite} value={notas} onChange={setNotas}>
          <Label>Notas permanentes</Label>
          <TextArea rows={3} />
        </TextField>
      </div>

      {error && (
        <div className="md:col-span-2">
          <Alert status="danger">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Description>{error}</Alert.Description>
            </Alert.Content>
          </Alert>
        </div>
      )}

      {canWrite && (
        <div className="md:col-span-2">
          <Button isDisabled={guardar.isPending} type="submit" variant="primary">
            {guardar.isPending ? "Un momento…" : "Guardar ficha"}
          </Button>
        </div>
      )}
      {cliente.tieneTokenPortal && (
        <p className="text-xs text-tinta-500 md:col-span-2">
          Ya hay un token de portal activo. Rotarlo invalida el anterior.
        </p>
      )}
    </form>
  );
}

function InlineText({
  value,
  etiqueta,
  disabled,
  onSave,
}: {
  value: string;
  etiqueta: string;
  disabled: boolean;
  onSave: (value: string) => Promise<unknown>;
}) {
  const [text, setText] = useState(value);
  return (
    <TextField
      aria-label={etiqueta}
      isDisabled={disabled}
      value={text}
      onChange={setText}
      onBlur={() => {
        if (text !== value) void onSave(text);
      }}
    >
      <Input className="min-w-[8rem]" />
    </TextField>
  );
}

function InlinePrecio({
  centavos,
  etiqueta,
  onSave,
}: {
  centavos: number | null;
  etiqueta: string;
  onSave: (value: number | null) => Promise<unknown>;
}) {
  const [text, setText] = useState(
    centavos == null
      ? ""
      : formatearCentavos(centavos, { simbolo: false, miles: false }),
  );
  const [error, setError] = useState<string | null>(null);

  return (
    <TextField
      aria-label={etiqueta}
      className="ml-auto w-28"
      isInvalid={error != null}
      value={text}
      onChange={setText}
      onBlur={() => {
        if (text.trim() === "") {
          setError(null);
          if (centavos != null) void onSave(null);
          return;
        }
        try {
          const next = quetzalesTextoACentavos(text);
          setError(null);
          if (next !== centavos) void onSave(next);
          setText(formatearCentavos(next, { simbolo: false, miles: false }));
        } catch (err) {
          setError(err instanceof Error ? err.message : "Precio inválido");
        }
      }}
    >
      <Input
        className="text-right tabular-nums"
        inputMode="decimal"
      placeholder="Q"
    />
    <Description className="text-tinta-500">
      Vacío hereda el precio base del catálogo.
    </Description>
      {error && <Description className="text-peligro">{error}</Description>}
    </TextField>
  );
}
