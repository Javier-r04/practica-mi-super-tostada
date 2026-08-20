"use client";

import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { GripVertical, Package, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import {
  FAMILIAS,
  FAMILIA_ETIQUETA,
  PUNTOS_CARGA,
  UNIDADES_MEDIDA,
  crearProductoRequestSchema,
  tienePermiso,
  type ActorPublico,
  type Familia,
  type ProductoPublico,
} from "@misupertostada/shared";
import { api, ApiError } from "@/lib/api";
import { PanelShell } from "@/components/layout/panel-shell";
import { PageToolbar } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Input, Select, Field } from "@/components/ui/field";
import { SearchField } from "@/components/ui/search-field";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { RowSkeleton } from "@/components/ui/skeleton";
import { EstadoBadge } from "@/components/domain/estado-badge";
import { CsvImportDialog } from "@/components/catalog/csv-import-dialog";

export default function CatalogoPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  const [editing, setEditing] = useState<ProductoPublico | "new" | null>(null);

  const me = useQuery({
    queryKey: ["auth", "me"],
    queryFn: () => api<{ usuario: ActorPublico }>("/auth/me"),
  });
  const canWrite = tienePermiso(me.data?.usuario.permisos ?? [], "catalogo.escribir");

  const productos = useQuery({
    queryKey: ["productos"],
    queryFn: () => api<ProductoPublico[]>("/productos"),
  });

  const filtrados = useMemo(() => {
    const list = productos.data ?? [];
    const needle = q.trim().toLowerCase();
    if (!needle) return list;
    return list.filter(
      (p) =>
        p.nombreCanonico.toLowerCase().includes(needle) ||
        p.sku.toLowerCase().includes(needle),
    );
  }, [productos.data, q]);

  const reorder = useMutation({
    mutationFn: (payload: { familia: Familia; ids: string[] }) =>
      api("/productos/orden", { method: "PUT", body: JSON.stringify(payload) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["productos"] }),
  });

  return (
    <PanelShell title="Catálogo">
      <div className="grid gap-4">
        <PageToolbar
          description="SKU planos agrupados por familia. No hay matriz de variantes: cada presentación es un producto."
          meta={
            productos.data
              ? `${productos.data.length} producto${productos.data.length === 1 ? "" : "s"}`
              : undefined
          }
          actions={
            canWrite ? (
              <>
                <Button variant="secondary" size="sm" onClick={() => setImportOpen(true)}>
                  Importar CSV
                </Button>
                <Button size="sm" onClick={() => setEditing("new")}>
                  <Plus size={15} aria-hidden />
                  Nuevo producto
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
              label="Buscar producto"
              placeholder="Nombre canónico o SKU"
              className="max-w-md"
            />
          </div>
          {productos.isLoading ? (
            <RowSkeleton />
          ) : filtrados.length === 0 ? (
            <EmptyState
              icon={<Package size={22} aria-hidden />}
              title={q ? "Ningún producto coincide" : "No hay productos"}
              description={
                q
                  ? "Pruebe con el SKU o el nombre canónico."
                  : "Cargue el catálogo a mano o importe el CSV. Es el listado que Alex y Carla van a reconocer."
              }
              action={
                canWrite && !q ? (
                  <Button size="sm" onClick={() => setEditing("new")}>
                    Nuevo producto
                  </Button>
                ) : null
              }
            />
          ) : (
            FAMILIAS.map((familia) => {
              const items = filtrados.filter((p) => p.familia === familia);
              if (items.length === 0) return null;
              return (
                <FamiliaGrupo
                  key={familia}
                  familia={familia}
                  items={items}
                  canWrite={canWrite}
                  canDrag={canWrite && q.trim() === ""}
                  onEdit={setEditing}
                  onReorder={(ids) => reorder.mutate({ familia, ids })}
                />
              );
            })
          )}
        </Card>
      </div>
      <CsvImportDialog
        tipo="productos"
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onDone={() => qc.invalidateQueries({ queryKey: ["productos"] })}
      />
      {editing && (
        <ProductoDialog
          producto={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ["productos"] });
            setEditing(null);
          }}
        />
      )}
    </PanelShell>
  );
}

function FamiliaGrupo({
  familia,
  items,
  canWrite,
  canDrag,
  onEdit,
  onReorder,
}: {
  familia: Familia;
  items: ProductoPublico[];
  canWrite: boolean;
  canDrag: boolean;
  onEdit: (p: ProductoPublico) => void;
  onReorder: (ids: string[]) => void;
}) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const ids = items.map((p) => p.id);

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = ids.indexOf(String(active.id));
    const newIndex = ids.indexOf(String(over.id));
    onReorder(arrayMove(ids, oldIndex, newIndex));
  }

  return (
    <section>
      <h3 className="sticky top-0 z-[1] border-t border-[var(--border-subtle)] bg-tinta-50 px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-tinta-500 sm:px-5">
        {FAMILIA_ETIQUETA[familia]}
      </h3>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          <ul>
            {items.map((p) => (
              <ProductoRow
                key={p.id}
                producto={p}
                canWrite={canWrite}
                canDrag={canDrag}
                onEdit={onEdit}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
    </section>
  );
}

function ProductoRow({
  producto,
  canWrite,
  canDrag,
  onEdit,
}: {
  producto: ProductoPublico;
  canWrite: boolean;
  canDrag: boolean;
  onEdit: (p: ProductoPublico) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: producto.id,
    disabled: !canDrag,
  });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className="flex min-h-fila items-center gap-3 border-b border-[var(--border-subtle)] px-4 py-2 sm:px-5"
    >
      {canDrag && (
        <button
          type="button"
          className="inline-flex size-11 shrink-0 cursor-grab items-center justify-center text-tinta-500"
          aria-label={`Reordenar ${producto.nombreCanonico}`}
          {...attributes}
          {...listeners}
        >
          <GripVertical size={16} aria-hidden />
        </button>
      )}
      <span className="hidden w-24 shrink-0 font-mono text-xs text-tinta-500 sm:block">
        {producto.sku}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold text-tinta-900">{producto.nombreCanonico}</span>
        <span className="block text-xs text-tinta-500">
          <span className="font-mono sm:hidden">{producto.sku} · </span>
          {producto.unidadMedida}
        </span>
      </span>
      <EstadoBadge estado={producto.puntoCarga} size="sm" />
      {!producto.activo && <Badge tone="amber">Inactivo</Badge>}
      {canWrite && (
        <Button variant="ghost" size="sm" onClick={() => onEdit(producto)}>
          Editar
        </Button>
      )}
    </li>
  );
}

function ProductoDialog({
  producto,
  onClose,
  onSaved,
}: {
  producto: ProductoPublico | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const form = useForm({
    defaultValues: {
      sku: producto?.sku ?? "",
      nombreCanonico: producto?.nombreCanonico ?? "",
      familia: producto?.familia ?? "TORTILLA",
      unidadMedida: producto?.unidadMedida ?? "LIBRA",
      puntoCarga: producto?.puntoCarga ?? "DEMOCRACIA",
      esProducido: producto?.esProducido ?? true,
    },
  });
  const qc = useQueryClient();
  const desactivar = useMutation({
    mutationFn: () =>
      api(`/productos/${producto!.id}/desactivar`, { method: "PATCH" }),
    onSuccess: onSaved,
  });
  const activar = useMutation({
    mutationFn: () => api(`/productos/${producto!.id}/activar`, { method: "PATCH" }),
    onSuccess: onSaved,
  });

  return (
    <Dialog
      open
      onClose={onClose}
      title={producto ? "Editar producto" : "Nuevo producto"}
      footer={
        <>
          {producto && producto.activo && (
            <Button variant="danger" className="mr-auto" onClick={() => desactivar.mutate()}>
              Desactivar
            </Button>
          )}
          {producto && !producto.activo && (
            <Button variant="secondary" className="mr-auto" onClick={() => activar.mutate()}>
              Reactivar
            </Button>
          )}
          <Button variant="secondary" onClick={onClose}>
            Cerrar
          </Button>
          <Button
            type="submit"
            form="producto-form"
            loading={form.formState.isSubmitting}
          >
            Guardar producto
          </Button>
        </>
      }
    >
      <form
        id="producto-form"
        className="grid gap-3"
        onSubmit={form.handleSubmit(async (values) => {
          const parsed = crearProductoRequestSchema.safeParse({
            ...values,
            esProducido: Boolean(values.esProducido),
          });
          if (!parsed.success) {
            setError("Revise los campos del producto");
            return;
          }
          setError(null);
          try {
            if (producto) {
              await api(`/productos/${producto.id}`, {
                method: "PATCH",
                body: JSON.stringify(parsed.data),
              });
            } else {
              await api("/productos", {
                method: "POST",
                body: JSON.stringify(parsed.data),
              });
            }
            await qc.invalidateQueries({ queryKey: ["productos"] });
            onSaved();
          } catch (err) {
            setError(err instanceof ApiError ? err.message : "No se pudo guardar");
          }
        })}
      >
        <Input id="sku" label="SKU" required {...form.register("sku")} />
        <Input
          id="nombreCanonico"
          label="Nombre canónico"
          required
          {...form.register("nombreCanonico")}
        />
        <Select id="familia" label="Familia" {...form.register("familia")}>
          {FAMILIAS.map((f) => (
            <option key={f} value={f}>
              {FAMILIA_ETIQUETA[f]}
            </option>
          ))}
        </Select>
        <Select id="unidad" label="Unidad" {...form.register("unidadMedida")}>
          {UNIDADES_MEDIDA.map((u) => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
        </Select>
        <Select id="punto" label="Punto de carga" {...form.register("puntoCarga")}>
          {PUNTOS_CARGA.map((p) => (
            <option key={p} value={p}>
              {p === "DEMOCRACIA" ? "Democracia" : "Planta"}
            </option>
          ))}
        </Select>
        <label className="flex min-h-tap items-center gap-2 text-sm">
          <input id="es-producido" type="checkbox" {...form.register("esProducido")} />
          Es producido
        </label>
        {producto && (
          <Field label="Foto (opcional)">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="text-sm"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                try {
                  await subirFotoProducto(file, producto.id);
                  await qc.invalidateQueries({ queryKey: ["productos"] });
                } catch (err) {
                  setError(
                    err instanceof ApiError ? err.message : "No se pudo subir la foto",
                  );
                }
              }}
            />
          </Field>
        )}
        {error && <p className="text-sm text-peligro">{error}</p>}
      </form>
    </Dialog>
  );
}

type PresignOk =
  | { alreadyUploaded: true; assetId: string }
  | {
      alreadyUploaded: false;
      url: string;
      headers: Record<string, string>;
    };

async function subirFotoProducto(file: File, productoId: string): Promise<void> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    throw new Error("Use JPEG, PNG o WebP");
  }
  const buf = await file.arrayBuffer();
  const hash = await crypto.subtle.digest("SHA-256", buf);
  const sha256 = [...new Uint8Array(hash)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  const body = {
    ownerType: "producto" as const,
    ownerId: productoId,
    mime: file.type,
    size: file.size,
    sha256,
  };
  const presign = await api<PresignOk>("/assets/presign", {
    method: "POST",
    body: JSON.stringify(body),
  });
  let assetId: string;
  if (presign.alreadyUploaded) {
    assetId = presign.assetId;
  } else {
    await fetch(presign.url, {
      method: "PUT",
      body: file,
      headers: presign.headers,
    });
    const confirmed = await api<{ id: string }>("/assets/confirm", {
      method: "POST",
      body: JSON.stringify(body),
    });
    assetId = confirmed.id;
  }
  await api(`/productos/${productoId}`, {
    method: "PATCH",
    body: JSON.stringify({ fotoAssetId: assetId }),
  });
}
