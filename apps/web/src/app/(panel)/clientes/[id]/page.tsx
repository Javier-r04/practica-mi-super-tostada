"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ClipboardList, Receipt } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState, type ReactNode } from "react";
import {
  FAMILIA_ETIQUETA,
  crearClienteRequestSchema,
  formatearCentavos,
  quetzalesTextoACentavos,
  tienePermiso,
  type ActorPublico,
  type ClienteProductoFila,
  type ClientePublico,
  type PedidoBandeja,
  type PortalCuenta,
} from "@misupertostada/shared";
import { api, ApiError } from "@/lib/api";
import { toastFromError, toastSuccess } from "@/lib/toast";
import { subirFotoCliente } from "@/lib/upload-asset";
import { PanelShell } from "@/components/layout/panel-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Input, Textarea } from "@/components/ui/field";
import { Checkbox } from "@/components/ui/checkbox";
import { Money } from "@/components/domain/money";
import { ContadorFacturas } from "@/components/domain/contador-facturas";
import { EstadoBadge } from "@/components/domain/estado-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { RowSkeleton } from "@/components/ui/skeleton";
import { ClienteAvatar } from "@/components/catalog/cliente-avatar";
import { FotoPicker } from "@/components/catalog/foto-picker";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { cn } from "@/lib/utils";

type Seccion = "operacion" | "precios" | "datos";

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
    queryFn: () =>
      api<PedidoBandeja[]>(`/pedidos?clienteId=${id}&historial=1`),
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
      <PanelShell title="Cliente">
        <div className="grid gap-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-28 w-full rounded-tarjeta" />
          <Skeleton className="h-48 w-full rounded-tarjeta" />
        </div>
      </PanelShell>
    );
  }

  const c = cliente.data;
  const fotoMostrada = clearFoto ? null : c.fotoAssetId;
  const enProgreso = (cuenta.data?.facturas ?? []).filter((f) => !f.numeroDte).length;

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
    <PanelShell title={c.nombre}>
      <div className="grid gap-5">
        <div>
          <Link
            href="/clientes"
            className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-marca no-underline hover:text-marca-hover hover:no-underline"
          >
            <ChevronLeft size={16} aria-hidden />
            Clientes
          </Link>

          <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-5">
            <ClienteAvatar nombre={c.nombre} fotoAssetId={fotoMostrada} size="lg" />
            <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-xl font-semibold text-tinta-900 text-wrap sm:text-2xl">
                    {c.nombre}
                  </p>
                  {!c.activo && <Badge tone="amber">Inactivo</Badge>}
                </div>
                <p className="mst-label mt-0.5">
                  {c.horarioEntregaFijo ? `Entrega ${c.horarioEntregaFijo}` : "Sin horario fijo"}
                  {c.contacto ? ` · ${c.contacto}` : ""}
                  {c.telefonoWa ? ` · ${c.telefonoWa}` : ""}
                </p>
              </div>
              {canWrite ? (
                <Button
                  size="sm"
                  className="shrink-0 self-start"
                  onClick={() => rotar.mutate()}
                  loading={rotar.isPending}
                >
                  {c.tieneTokenPortal ? "Rotar token" : "Generar token"}
                </Button>
              ) : null}
            </div>
          </div>
        </div>

        <SegmentedControl
          label="Secciones del cliente"
          value={seccion}
          onChange={setSeccion}
          fullWidth
          options={
            [
              { id: "operacion", label: "Operación" },
              { id: "precios", label: "Precios" },
              { id: "datos", label: "Datos" },
            ] as const
          }
        />

        {seccion === "operacion" && (
          <div className="grid gap-4">
            {cuenta.isLoading ? (
              <Skeleton className="h-24 w-full rounded-tarjeta" />
            ) : cuenta.data ? (
              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
                <ContadorFacturas
                  pendientes={cuenta.data.facturasPendientes}
                  limite={cuenta.data.limiteFacturasPendientes}
                  montoCentavos={cuenta.data.saldoCentavos}
                />
                <div className="grid grid-cols-2 gap-2 sm:min-w-[12rem] sm:grid-cols-1">
                  <MiniStat
                    label="Por facturar"
                    value={enProgreso}
                    hint="Sin DTE"
                  />
                  <MiniStat
                    label="Saldo"
                    value={<Money centavos={cuenta.data.saldoCentavos} />}
                  />
                </div>
              </div>
            ) : null}

            <Card
              flush
              title="Facturas abiertas"
              subtitle="Pendientes, abonos y vencidas · las sin DTE son por facturar"
              actions={
                <Link
                  href={`/cartera?clienteId=${id}`}
                  className="text-sm font-semibold text-marca no-underline hover:underline"
                >
                  Ver en cartera
                </Link>
              }
            >
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
                      className="flex flex-wrap items-center gap-2 border-b border-[var(--border-subtle)] px-4 py-3 last:border-b-0 sm:px-5"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-mono text-xs text-tinta-500">
                          {f.numeroDte ?? "Sin DTE"}
                        </p>
                        <p className="text-sm text-tinta-500">
                          {f.emitidaAt
                            ? `Emitida · ${f.antiguedadDias} días`
                            : "Sin fecha de emisión"}
                        </p>
                      </div>
                      <EstadoBadge estado={f.estado} size="sm" />
                      {!f.numeroDte && <Badge tone="amber">Por facturar</Badge>}
                      <div className="w-full text-right sm:w-auto">
                        <Money
                          centavos={f.saldoCentavos}
                          tone={
                            f.estado === "VENCIDO"
                              ? "vencido"
                              : f.estado === "ABONO_PARCIAL"
                                ? "pendiente"
                                : "default"
                          }
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card
              flush
              title="Historial de pedidos"
              subtitle="Últimos correlativos de este restaurante"
              actions={
                <Link
                  href={`/pedidos?clienteId=${id}&historial=1`}
                  className="text-sm font-semibold text-marca no-underline hover:text-marca-hover hover:no-underline"
                >
                  Ver en pedidos
                </Link>
              }
            >
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
                    <li key={p.id} className="border-b border-[var(--border-subtle)] last:border-b-0">
                      <Link
                        href={`/pedidos?clienteId=${id}&historial=1`}
                        className="flex min-h-fila items-center gap-3 px-4 py-2.5 text-inherit no-underline hover:bg-tinta-50 hover:text-inherit hover:no-underline sm:px-5"
                      >
                        <span className="w-14 shrink-0 font-mono text-xs text-tinta-500">
                          #{p.correlativo}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold tabular-nums text-tinta-900">
                            {p.fechaOperacion}
                          </span>
                          <span className="block text-xs text-tinta-500">
                            {p.origen === "PORTAL" ? "Portal" : "Manual"}
                          </span>
                        </span>
                        <EstadoBadge estado={p.estado} size="sm" />
                        <Money centavos={p.totalCentavos} />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        )}

        {seccion === "precios" && (
          <Card flush title="Productos de este cliente">
            {filas.isLoading ? (
              <RowSkeleton rows={5} />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-tinta-50 text-left mst-label">
                      {["Producto", "Familia", "Alias", "Precio", "Nota producción", "Favorito"].map(
                        (h) => (
                          <th
                            key={h}
                            className={cn(
                              "px-4 py-2.5 sm:px-5",
                              h === "Favorito" && "text-center",
                            )}
                          >
                            {h}
                          </th>
                        ),
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {(filas.data ?? []).map((fila) => (
                      <tr key={fila.productoId} className="border-t border-[var(--border-subtle)]">
                        <td className="px-4 py-2.5 sm:px-5">
                          <div className="font-semibold">{fila.nombreCanonico}</div>
                          <div className="font-mono text-xs text-tinta-500">{fila.sku}</div>
                        </td>
                        <td className="px-4 py-2.5 text-tinta-500 sm:px-5">
                          {FAMILIA_ETIQUETA[fila.familia]}
                        </td>
                        <td className="px-4 py-2.5 sm:px-5">
                          <InlineText
                            key={fila.alias ?? ""}
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
                        </td>
                        <td className="px-4 py-2.5 text-right sm:px-5">
                          {canPrecio ? (
                            <InlinePrecio
                              key={String(fila.precioCentavos)}
                              centavos={fila.precioCentavos}
                              onSave={(precioCentavos) =>
                                api(`/clientes/${id}/productos/${fila.productoId}`, {
                                  method: "PUT",
                                  body: JSON.stringify({ precioCentavos }),
                                }).then(() =>
                                  qc.invalidateQueries({
                                    queryKey: ["clientes", id, "productos"],
                                  }),
                                )
                              }
                            />
                          ) : (
                            <Money centavos={fila.precioCentavos} />
                          )}
                        </td>
                        <td className="px-4 py-2.5 sm:px-5">
                          <InlineText
                            key={fila.notaProduccion ?? ""}
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
                        </td>
                        <td className="px-4 py-2.5 sm:px-5">
                          <div className="flex items-center justify-center">
                            <Checkbox
                              size="lg"
                              checked={fila.favorito}
                              disabled={!canWrite}
                              aria-label={`Favorito: ${fila.nombreCanonico}`}
                              onChange={(e) => {
                                void api(`/clientes/${id}/productos/${fila.productoId}`, {
                                  method: "PUT",
                                  body: JSON.stringify({ favorito: e.target.checked }),
                                }).then(() =>
                                  qc.invalidateQueries({
                                    queryKey: ["clientes", id, "productos"],
                                  }),
                                );
                              }}
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        )}

        {seccion === "datos" && (
          <div className="grid gap-4">
            {canWrite && (
              <Card title="Foto">
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
                {(fotoFile || clearFoto) && (
                  <div className="mt-3">
                    <Button size="sm" loading={fotoBusy} onClick={() => void guardarFoto()}>
                      Guardar foto
                    </Button>
                  </div>
                )}
              </Card>
            )}

            <Card title="Ficha">
              <FichaForm cliente={c} canWrite={canWrite} />
              {error && <p className="mt-3 text-sm text-peligro">{error}</p>}
              {canWrite && (
                <div className="mt-4">
                  {c.activo ? (
                    <Button variant="danger" size="sm" onClick={() => desactivar.mutate()}>
                      Desactivar cliente
                    </Button>
                  ) : (
                    <Button variant="secondary" size="sm" onClick={() => activar.mutate()}>
                      Reactivar cliente
                    </Button>
                  )}
                </div>
              )}
            </Card>
          </div>
        )}
      </div>

      {tokenVisible && (
        <Dialog
          open
          onClose={() => setTokenVisible(null)}
          title="Token del portal"
          description="Cópielo ahora. No se vuelve a mostrar; si lo pierde, ruede uno nuevo."
          footer={
            <Button
              onClick={() => {
                void navigator.clipboard.writeText(tokenVisible);
              }}
            >
              Copiar token
            </Button>
          }
        >
          <p className="break-all font-mono text-sm">{tokenVisible}</p>
        </Dialog>
      )}
    </PanelShell>
  );
}

function MiniStat({
  label,
  value,
  hint,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
}) {
  return (
    <div className="rounded-tarjeta border border-[var(--border-subtle)] bg-blanco px-3 py-2.5">
      <p className="mst-label text-[10px]">
        {label}
        {hint ? ` · ${hint}` : ""}
      </p>
      <div className="mt-0.5 text-sm font-semibold tabular-nums text-tinta-900">
        {value}
      </div>
    </div>
  );
}

function FichaForm({ cliente, canWrite }: { cliente: ClientePublico; canWrite: boolean }) {
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

  return (
    <form
      className="grid gap-3 md:grid-cols-2"
      onSubmit={async (e) => {
        e.preventDefault();
        const parsed = crearClienteRequestSchema.safeParse({
          nombre,
          contacto: contacto.trim() || null,
          telefonoWa: telefonoWa.trim() || null,
          horarioEntregaFijo: horario.trim() || null,
          notasPermanentes: notas.trim() || null,
          limiteFacturasPendientes: limite.trim() ? Number(limite) : null,
        });
        if (!parsed.success) {
          setError("Revise los datos del cliente");
          return;
        }
        try {
          await api(`/clientes/${cliente.id}`, {
            method: "PATCH",
            body: JSON.stringify(parsed.data),
          });
          setError(null);
          toastSuccess("Ficha guardada");
          await qc.invalidateQueries({ queryKey: ["clientes", cliente.id] });
          await qc.invalidateQueries({ queryKey: ["clientes"] });
        } catch (err) {
          setError(err instanceof ApiError ? err.message : "No se pudo guardar");
          toastFromError(err, "No se pudo guardar");
        }
      }}
    >
      <Input
        id="nombre"
        label="Nombre"
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        disabled={!canWrite}
        required
      />
      <Input
        id="contacto"
        label="Contacto"
        value={contacto}
        onChange={(e) => setContacto(e.target.value)}
        disabled={!canWrite}
      />
      <Input
        id="wa"
        label="Teléfono WhatsApp"
        value={telefonoWa}
        onChange={(e) => setTelefonoWa(e.target.value)}
        disabled={!canWrite}
      />
      <Input
        id="horario"
        label="Horario de entrega fijo"
        value={horario}
        placeholder="09:00"
        hint="Formato 24 h, HH:MM"
        onChange={(e) => setHorario(e.target.value)}
        disabled={!canWrite}
      />
      <Input
        id="limite"
        label="Límite de facturas pendientes"
        value={limite}
        inputMode="numeric"
        hint="Como en el cuaderno de cobros"
        onChange={(e) => setLimite(e.target.value)}
        disabled={!canWrite}
      />
      <div className="md:col-span-2">
        <Textarea
          id="notas"
          label="Notas permanentes"
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
          disabled={!canWrite}
        />
      </div>
      {canWrite && (
        <div className="md:col-span-2">
          <Button type="submit">Guardar ficha</Button>
        </div>
      )}
      {error && <p className="text-sm text-peligro md:col-span-2">{error}</p>}
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
  disabled,
  onSave,
}: {
  value: string;
  disabled: boolean;
  onSave: (value: string) => Promise<unknown>;
}) {
  const [text, setText] = useState(value);
  return (
    <input
      value={text}
      disabled={disabled}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => {
        if (text !== value) void onSave(text);
      }}
      className="h-9 w-full min-w-[8rem] rounded-campo border border-[var(--border-default)] px-2 text-sm disabled:bg-tinta-50"
    />
  );
}

function InlinePrecio({
  centavos,
  onSave,
}: {
  centavos: number | null;
  onSave: (value: number | null) => Promise<unknown>;
}) {
  const [text, setText] = useState(
    centavos == null ? "" : formatearCentavos(centavos, { simbolo: false }),
  );
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="flex items-center justify-end gap-1">
      <span className="text-xs font-semibold text-tinta-500">Q</span>
      <input
        value={text}
        inputMode="decimal"
        onChange={(e) => setText(e.target.value)}
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
            setText(formatearCentavos(next, { simbolo: false }));
          } catch (err) {
            setError(err instanceof Error ? err.message : "Precio inválido");
          }
        }}
        className="h-9 w-24 rounded-campo border border-[var(--border-default)] px-2 text-right text-sm tabular-nums"
      />
      {error && <span className="sr-only">{error}</span>}
    </div>
  );
}
