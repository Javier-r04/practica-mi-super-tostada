"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import {
  FAMILIA_ETIQUETA,
  crearClienteRequestSchema,
  formatearCentavos,
  quetzalesTextoACentavos,
  tienePermiso,
  type ActorPublico,
  type ClienteProductoFila,
  type ClientePublico,
} from "@misupertostada/shared";
import { api, ApiError } from "@/lib/api";
import { PanelShell } from "@/components/layout/panel-shell";
import { PageToolbar } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Input, Textarea } from "@/components/ui/field";
import { Money } from "@/components/domain/money";
import { Skeleton } from "@/components/ui/skeleton";
import { CsvImportDialog } from "@/components/catalog/csv-import-dialog";

export default function ClienteFichaPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const qc = useQueryClient();
  const [importOpen, setImportOpen] = useState(false);
  const [tokenVisible, setTokenVisible] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
          <Skeleton className="h-48 w-full rounded-tarjeta" />
          <Skeleton className="h-64 w-full rounded-tarjeta" />
        </div>
      </PanelShell>
    );
  }

  const c = cliente.data;

  return (
    <PanelShell title={c.nombre}>
      <div className="grid gap-5">
        <div>
          <Link
            href="/clientes"
            className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-marca hover:text-marca-hover"
          >
            <ChevronLeft size={16} aria-hidden />
            Clientes
          </Link>
          <PageToolbar
            className="mt-2"
            description="Notas fijas y horario. El grosor y el punto de carga salen del catálogo, no se escriben a mano."
            meta={
              <>
                {c.horarioEntregaFijo ? `Entrega ${c.horarioEntregaFijo}` : "Sin horario fijo"}
                {c.limiteFacturasPendientes != null
                  ? ` · límite ${c.limiteFacturasPendientes} facturas`
                  : ""}
                {c.tieneTokenPortal ? " · portal activo" : ""}
                {!c.activo ? " · inactivo" : ""}
              </>
            }
            actions={
              canWrite ? (
                <>
                  <Button variant="secondary" size="sm" onClick={() => setImportOpen(true)}>
                    Importar precios
                  </Button>
                  <Button size="sm" onClick={() => rotar.mutate()} loading={rotar.isPending}>
                    {c.tieneTokenPortal ? "Rotar token del portal" : "Generar token del portal"}
                  </Button>
                </>
              ) : null
            }
          />
        </div>
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

        <Card
          flush
          title="Productos de este cliente"
          subtitle="Alias, precio y nota de producción · edición en línea"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-tinta-50 text-left text-[12px] font-semibold uppercase tracking-[0.08em] text-tinta-500">
                  {["Producto", "Familia", "Alias", "Precio", "Nota producción", "Favorito"].map(
                    (h) => (
                      <th key={h} className="px-4 py-2.5 sm:px-5">
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
                            qc.invalidateQueries({ queryKey: ["clientes", id, "productos"] }),
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
                              qc.invalidateQueries({ queryKey: ["clientes", id, "productos"] }),
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
                            body: JSON.stringify({ notaProduccion: notaProduccion || null }),
                          }).then(() =>
                            qc.invalidateQueries({ queryKey: ["clientes", id, "productos"] }),
                          )
                        }
                      />
                    </td>
                    <td className="px-4 py-2.5 sm:px-5">
                      <input
                        type="checkbox"
                        checked={fila.favorito}
                        disabled={!canWrite}
                        aria-label={`Favorito: ${fila.nombreCanonico}`}
                        onChange={(e) => {
                          void api(`/clientes/${id}/productos/${fila.productoId}`, {
                            method: "PUT",
                            body: JSON.stringify({ favorito: e.target.checked }),
                          }).then(() =>
                            qc.invalidateQueries({ queryKey: ["clientes", id, "productos"] }),
                          );
                        }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <CsvImportDialog
        tipo="cliente_producto"
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onDone={() => qc.invalidateQueries({ queryKey: ["clientes", id, "productos"] })}
      />

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
          await qc.invalidateQueries({ queryKey: ["clientes", cliente.id] });
        } catch (err) {
          setError(err instanceof ApiError ? err.message : "No se pudo guardar");
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
        onChange={(e) => setHorario(e.target.value)}
        disabled={!canWrite}
      />
      <Input
        id="limite"
        label="Límite de facturas pendientes"
        value={limite}
        inputMode="numeric"
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
