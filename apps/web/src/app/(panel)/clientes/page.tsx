"use client";

import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import {
  crearClienteRequestSchema,
  tienePermiso,
  type ActorPublico,
  type ClientePublico,
} from "@misupertostada/shared";
import { api, ApiError } from "@/lib/api";
import { PanelShell } from "@/components/layout/panel-shell";
import { PageToolbar } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Input, Textarea } from "@/components/ui/field";
import { SearchField } from "@/components/ui/search-field";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { RowSkeleton } from "@/components/ui/skeleton";
import { CsvImportDialog } from "@/components/catalog/csv-import-dialog";

export default function ClientesPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  const [crear, setCrear] = useState(false);

  const me = useQuery({
    queryKey: ["auth", "me"],
    queryFn: () => api<{ usuario: ActorPublico }>("/auth/me"),
  });
  const canWrite = tienePermiso(me.data?.usuario.permisos ?? [], "catalogo.escribir");
  const clientes = useQuery({
    queryKey: ["clientes"],
    queryFn: () => api<ClientePublico[]>("/clientes"),
  });

  const filtrados = useMemo(() => {
    const list = clientes.data ?? [];
    const needle = q.trim().toLowerCase();
    if (!needle) return list;
    return list.filter((c) => c.nombre.toLowerCase().includes(needle));
  }, [clientes.data, q]);

  return (
    <PanelShell title="Clientes">
      <div className="grid gap-4">
        <PageToolbar
          description="Ficha, horario fijo y límite de facturas. Alias y precios se editan dentro de cada restaurante."
          meta={
            clientes.data
              ? `${clientes.data.length} cliente${clientes.data.length === 1 ? "" : "s"}`
              : undefined
          }
          actions={
            canWrite ? (
              <>
                <Button variant="secondary" size="sm" onClick={() => setImportOpen(true)}>
                  Importar CSV
                </Button>
                <Button size="sm" onClick={() => setCrear(true)}>
                  <Plus size={15} aria-hidden />
                  Nuevo cliente
                </Button>
              </>
            ) : null
          }
        />
        <Card flush>
          <div className="border-b border-[var(--border-subtle)] px-4 py-3 sm:px-5">
            <SearchField
              value={q}
              onChange={setQ}
              label="Buscar cliente"
              placeholder="Nombre del restaurante"
              className="max-w-md"
            />
          </div>
          {clientes.isLoading ? (
            <RowSkeleton />
          ) : filtrados.length === 0 ? (
            <EmptyState
              icon={<Users size={22} aria-hidden />}
              title={q ? "Ningún cliente coincide" : "No hay clientes"}
              description={
                q
                  ? "Pruebe con el nombre comercial del restaurante."
                  : "Cree la ficha o importe el CSV. El portal y los alias viven dentro de cada cliente."
              }
              action={
                canWrite && !q ? (
                  <Button size="sm" onClick={() => setCrear(true)}>
                    Nuevo cliente
                  </Button>
                ) : null
              }
            />
          ) : (
            <ul>
              {filtrados.map((c) => (
                <li key={c.id} className="border-b border-[var(--border-subtle)] last:border-b-0">
                  <Link
                    href={`/clientes/${c.id}`}
                    className="flex min-h-fila items-center gap-3 px-4 py-2.5 hover:bg-tinta-50 sm:px-5"
                  >
                    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-marca-soft text-[11px] font-semibold text-marca">
                      {c.nombre.slice(0, 2).toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold text-tinta-900">
                        {c.nombre}
                      </span>
                      <span className="block truncate text-xs text-tinta-500">
                        {c.contacto ?? "Sin contacto"}
                        {c.limiteFacturasPendientes != null
                          ? ` · límite ${c.limiteFacturasPendientes} facturas`
                          : ""}
                      </span>
                    </span>
                    {c.horarioEntregaFijo && (
                      <span className="hidden text-sm tabular-nums text-tinta-500 sm:inline">
                        {c.horarioEntregaFijo}
                      </span>
                    )}
                    {c.tieneTokenPortal && <Badge tone="green">Portal</Badge>}
                    {!c.activo && <Badge tone="amber">Inactivo</Badge>}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
      <CsvImportDialog
        tipo="clientes"
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onDone={() => qc.invalidateQueries({ queryKey: ["clientes"] })}
      />
      {crear && (
        <ClienteNuevoDialog
          onClose={() => setCrear(false)}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ["clientes"] });
            setCrear(false);
          }}
        />
      )}
    </PanelShell>
  );
}

function ClienteNuevoDialog({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const form = useForm({
    defaultValues: {
      nombre: "",
      contacto: "",
      telefonoWa: "",
      horarioEntregaFijo: "",
      notasPermanentes: "",
      limiteFacturasPendientes: "",
    },
  });

  return (
    <Dialog
      open
      onClose={onClose}
      title="Nuevo cliente"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cerrar
          </Button>
          <Button type="submit" form="cliente-nuevo" loading={form.formState.isSubmitting}>
            Guardar cliente
          </Button>
        </>
      }
    >
      <form
        id="cliente-nuevo"
        className="grid gap-3"
        onSubmit={form.handleSubmit(async (values) => {
          const limite = values.limiteFacturasPendientes.trim();
          const parsed = crearClienteRequestSchema.safeParse({
            nombre: values.nombre,
            contacto: values.contacto.trim() || null,
            telefonoWa: values.telefonoWa.trim() || null,
            horarioEntregaFijo: values.horarioEntregaFijo.trim() || null,
            notasPermanentes: values.notasPermanentes.trim() || null,
            limiteFacturasPendientes: limite ? Number(limite) : null,
          });
          if (!parsed.success) {
            setError("Revise los datos del cliente");
            return;
          }
          try {
            await api("/clientes", {
              method: "POST",
              body: JSON.stringify(parsed.data),
            });
            onSaved();
          } catch (err) {
            setError(err instanceof ApiError ? err.message : "No se pudo guardar");
          }
        })}
      >
        <Input id="nombre" label="Nombre" required {...form.register("nombre")} />
        <Input id="contacto" label="Contacto" {...form.register("contacto")} />
        <Input id="wa" label="Teléfono WhatsApp" {...form.register("telefonoWa")} />
        <Input
          id="horario"
          label="Horario de entrega fijo"
          placeholder="09:00"
          {...form.register("horarioEntregaFijo")}
        />
        <Input
          id="limite"
          label="Límite de facturas pendientes"
          inputMode="numeric"
          {...form.register("limiteFacturasPendientes")}
        />
        <Textarea id="notas" label="Notas permanentes" {...form.register("notasPermanentes")} />
        {error && <p className="text-sm text-peligro">{error}</p>}
      </form>
    </Dialog>
  );
}
