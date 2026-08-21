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
  crearProductoRequestSchema,
  tienePermiso,
  type ActorPublico,
  type Familia,
  type ProductoPublico,
} from "@misupertostada/shared";
import { api, ApiError } from "@/lib/api";
import { toastFromError, toastSuccess } from "@/lib/toast";
import { subirFotoProducto } from "@/lib/upload-asset";
import { cn } from "@/lib/utils";
import { PanelShell } from "@/components/layout/panel-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/field";
import { SearchField } from "@/components/ui/search-field";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { EstadoBadge } from "@/components/domain/estado-badge";
import { FotoPicker } from "@/components/catalog/foto-picker";
import { ProductoThumb } from "@/components/catalog/producto-thumb";

type FiltroActivo = "activos" | "todos";

export default function CatalogoPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [filtro, setFiltro] = useState<FiltroActivo>("activos");
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
    return list.filter((p) => {
      if (filtro === "activos" && !p.activo) return false;
      if (!needle) return true;
      return (
        p.nombreCanonico.toLowerCase().includes(needle) ||
        p.sku.toLowerCase().includes(needle)
      );
    });
  }, [productos.data, q, filtro]);

  const meta = useMemo(() => {
    const list = productos.data ?? [];
    if (list.length === 0) return undefined;
    const activos = list.filter((p) => p.activo).length;
    const inactivos = list.length - activos;
    if (filtro === "activos") {
      return `${activos} activo${activos === 1 ? "" : "s"}${
        inactivos > 0 ? ` · ${inactivos} inactivo${inactivos === 1 ? "" : "s"} ocultos` : ""
      }`;
    }
    return `${list.length} producto${list.length === 1 ? "" : "s"} · ${activos} activo${
      activos === 1 ? "" : "s"
    }`;
  }, [productos.data, filtro]);

  const reorder = useMutation({
    mutationFn: (payload: { familia: Familia; ids: string[] }) =>
      api("/productos/orden", { method: "PUT", body: JSON.stringify(payload) }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["productos"] });
      toastSuccess("Orden actualizado");
    },
    onError: (err) => toastFromError(err, "No se pudo guardar el orden"),
  });

  return (
    <PanelShell title="Catálogo">
      <div className="grid gap-4">
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          <div className="flex min-w-0 items-center gap-2 overflow-x-auto sm:contents">
            {canWrite ? (
              <Button size="sm" className="shrink-0" onClick={() => setEditing("new")}>
                <Plus size={15} aria-hidden />
                Nuevo producto
              </Button>
            ) : null}
            <SearchField
              value={q}
              onChange={setQ}
              label="Buscar producto"
              placeholder="Nombre o SKU"
              className="min-w-[10rem] flex-1"
            />
            <SegmentedControl
              label="Filtrar productos"
              value={filtro}
              onChange={setFiltro}
              className="shrink-0"
              options={
                [
                  { id: "activos", label: "Activos" },
                  { id: "todos", label: "Todos" },
                ] as const
              }
            />
          </div>
        </div>

        {meta ? <p className="mst-label -mt-1 tabular-nums">{meta}</p> : null}

        <Card flush>
          {productos.isLoading ? (
            <CatalogoSkeleton />
          ) : filtrados.length === 0 ? (
            <EmptyState
              icon={<Package size={22} aria-hidden />}
              title={q ? "Ningún producto coincide" : "No hay productos"}
              description={
                q
                  ? "Pruebe con el SKU o el nombre."
                  : filtro === "activos"
                    ? "No hay productos activos. Cambie a Todos o cree uno nuevo."
                    : "Cargue el catálogo a mano. Es el listado que Alex y Carla van a reconocer."
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
                  onReorder={(ids) => {
                    const allInFamilia = (productos.data ?? [])
                      .filter((p) => p.familia === familia)
                      .map((p) => p.id);
                    if (filtro === "activos") {
                      const visibles = new Set(ids);
                      const ocultos = allInFamilia.filter((id) => !visibles.has(id));
                      reorder.mutate({ familia, ids: [...ids, ...ocultos] });
                      return;
                    }
                    reorder.mutate({ familia, ids });
                  }}
                />
              );
            })
          )}
        </Card>
      </div>

      {editing && (
        <ProductoDialog
          producto={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            void qc.invalidateQueries({ queryKey: ["productos"] });
            setEditing(null);
          }}
        />
      )}
    </PanelShell>
  );
}

function CatalogoSkeleton() {
  return (
    <ul aria-hidden>
      {Array.from({ length: 6 }, (_, i) => (
        <li
          key={i}
          className="flex min-h-fila items-center gap-3 border-b border-[var(--border-subtle)] px-4 sm:px-5"
        >
          <Skeleton className="size-11 shrink-0 rounded-campo" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-3.5 w-2/3 max-w-xs" />
            <Skeleton className="h-3 w-28" />
          </div>
          <Skeleton className="hidden h-5 w-16 rounded-pill sm:block" />
        </li>
      ))}
    </ul>
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
      <h3 className="sticky top-0 z-[1] flex items-center justify-between gap-2 border-t border-[var(--border-subtle)] bg-tinta-50 px-4 py-2 mst-label sm:px-5">
        <span>{FAMILIA_ETIQUETA[familia]}</span>
        <span className="tabular-nums text-tinta-400">{items.length}</span>
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
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: producto.id,
    disabled: !canDrag,
  });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "flex min-h-fila items-center gap-2 border-b border-[var(--border-subtle)] px-2 py-2 sm:gap-3 sm:px-3",
        isDragging && "relative z-[2] bg-blanco shadow-tarjeta",
        !producto.activo && "opacity-70",
      )}
    >
      {canDrag ? (
        <button
          type="button"
          className="inline-flex size-11 shrink-0 cursor-grab items-center justify-center text-tinta-400 active:cursor-grabbing"
          aria-label={`Reordenar ${producto.nombreCanonico}`}
          {...attributes}
          {...listeners}
        >
          <GripVertical size={16} aria-hidden />
        </button>
      ) : (
        <span className="size-2 shrink-0 sm:size-11" aria-hidden />
      )}

      {canWrite ? (
        <button
          type="button"
          onClick={() => onEdit(producto)}
          className={cn(
            "flex min-w-0 flex-1 items-center gap-3 rounded-campo px-1 py-1 text-left",
            "transition-colors duration-150 ease-out hover:bg-tinta-50",
            "focus-visible:outline-none focus-visible:shadow-foco",
          )}
        >
          <ProductoRowBody producto={producto} />
        </button>
      ) : (
        <div className="flex min-w-0 flex-1 items-center gap-3 px-1 py-1">
          <ProductoRowBody producto={producto} />
        </div>
      )}

      <div className="flex shrink-0 items-center gap-1.5 pr-1 sm:gap-2 sm:pr-2">
        <EstadoBadge estado={producto.puntoCarga} size="sm" />
        {!producto.activo && <Badge tone="amber">Inactivo</Badge>}
        {canWrite && (
          <Button
            variant="ghost"
            size="sm"
            className="hidden sm:inline-flex"
            onClick={() => onEdit(producto)}
          >
            Editar
          </Button>
        )}
      </div>
    </li>
  );
}

function ProductoRowBody({ producto }: { producto: ProductoPublico }) {
  return (
    <>
      <ProductoThumb
        nombre={producto.nombreCanonico}
        fotoAssetId={producto.fotoAssetId}
        size="sm"
      />
      <span className="hidden w-24 shrink-0 font-mono text-xs tabular-nums text-tinta-500 sm:block">
        {producto.sku}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold text-pretty text-tinta-900">
          {producto.nombreCanonico}
        </span>
        <span className="mt-0.5 block text-xs text-pretty text-tinta-500">
          <span className="font-mono sm:hidden">{producto.sku} · </span>
          {producto.unidadMedida}
        </span>
      </span>
    </>
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
  const [foto, setFoto] = useState<File | null>(null);
  const [clearFoto, setClearFoto] = useState(false);
  const form = useForm({
    defaultValues: {
      sku: producto?.sku ?? "",
      nombreCanonico: producto?.nombreCanonico ?? "",
      familia: producto?.familia ?? "TORTILLA",
      unidadMedida: producto?.unidadMedida ?? "LIBRA",
      puntoCarga: producto?.puntoCarga ?? "DEMOCRACIA",
    },
  });
  const qc = useQueryClient();

  const desactivar = useMutation({
    mutationFn: () => api(`/productos/${producto!.id}/desactivar`, { method: "PATCH" }),
    onSuccess: () => {
      toastSuccess("Producto desactivado");
      onSaved();
    },
    onError: (err) => toastFromError(err, "No se pudo desactivar"),
  });
  const activar = useMutation({
    mutationFn: () => api(`/productos/${producto!.id}/activar`, { method: "PATCH" }),
    onSuccess: () => {
      toastSuccess("Producto reactivado");
      onSaved();
    },
    onError: (err) => toastFromError(err, "No se pudo reactivar"),
  });

  const fotoMostrada = clearFoto ? null : producto?.fotoAssetId;

  return (
    <Dialog
      open
      size="lg"
      onClose={onClose}
      title={producto ? "Editar producto" : "Nuevo producto"}
      description="SKU planos por familia. La foto ayuda a reconocerlo en el portal y en captura."
      footer={
        <>
          {producto && producto.activo && (
            <Button
              variant="danger"
              className="mr-auto"
              loading={desactivar.isPending}
              onClick={() => desactivar.mutate()}
            >
              Desactivar
            </Button>
          )}
          {producto && !producto.activo && (
            <Button
              variant="secondary"
              className="mr-auto"
              loading={activar.isPending}
              onClick={() => activar.mutate()}
            >
              Reactivar
            </Button>
          )}
          <Button variant="secondary" onClick={onClose}>
            Cerrar
          </Button>
          <Button type="submit" form="producto-form" loading={form.formState.isSubmitting}>
            Guardar producto
          </Button>
        </>
      }
    >
      <form
        id="producto-form"
        className="grid gap-5"
        onSubmit={form.handleSubmit(async (values) => {
          const parsed = crearProductoRequestSchema.safeParse({
            ...values,
            esProducido: true,
          });
          if (!parsed.success) {
            setError("Revise los campos del producto");
            return;
          }
          setError(null);
          try {
            let productoId = producto?.id;
            if (producto) {
              await api(`/productos/${producto.id}`, {
                method: "PATCH",
                body: JSON.stringify(parsed.data),
              });
            } else {
              const creado = await api<ProductoPublico>("/productos", {
                method: "POST",
                body: JSON.stringify(parsed.data),
              });
              productoId = creado.id;
            }

            if (productoId && foto) {
              try {
                const assetId = await subirFotoProducto(foto, productoId);
                await api(`/productos/${productoId}`, {
                  method: "PATCH",
                  body: JSON.stringify({ fotoAssetId: assetId }),
                });
              } catch (err) {
                toastFromError(
                  err,
                  "Producto guardado; la foto no se subió. Puede agregarla al editar.",
                );
                await qc.invalidateQueries({ queryKey: ["productos"] });
                onSaved();
                return;
              }
            } else if (productoId && clearFoto && producto?.fotoAssetId) {
              await api(`/productos/${productoId}`, {
                method: "PATCH",
                body: JSON.stringify({ fotoAssetId: null }),
              });
            }

            toastSuccess(producto ? "Producto actualizado" : "Producto guardado");
            await qc.invalidateQueries({ queryKey: ["productos"] });
            onSaved();
          } catch (err) {
            const msg = err instanceof ApiError ? err.message : "No se pudo guardar";
            setError(msg);
            toastFromError(err, "No se pudo guardar");
          }
        })}
      >
        <FotoPicker
          label="Foto del producto"
          hint="JPEG, PNG o WebP. Opcional."
          shape="rounded"
          value={foto}
          existingAssetId={fotoMostrada}
          onChange={(file) => {
            setFoto(file);
            if (file) setClearFoto(false);
          }}
          onClearExisting={() => {
            setClearFoto(true);
            setFoto(null);
          }}
        />

        <section className="grid gap-3">
          <h3 className="text-sm font-semibold text-tinta-900">Identidad</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input id="sku" label="SKU" required {...form.register("sku")} />
            <div className="sm:col-span-2">
              <Input
                id="nombreCanonico"
                label="Nombre"
                required
                {...form.register("nombreCanonico")}
              />
            </div>
          </div>
        </section>

        <section className="grid gap-4">
          <h3 className="text-sm font-semibold text-tinta-900">Operación</h3>
          <div className="grid gap-4">
            <div className="grid gap-1.5">
              <span className="mst-label">Familia</span>
              <SegmentedControl
                label="Familia"
                fullWidth
                value={form.watch("familia")}
                onChange={(v) => form.setValue("familia", v)}
                options={FAMILIAS.map((f) => ({
                  id: f,
                  label: FAMILIA_ETIQUETA[f],
                }))}
              />
            </div>
            <div className="grid gap-1.5">
              <span className="mst-label">Unidad</span>
              <SegmentedControl
                label="Unidad"
                fullWidth
                value={form.watch("unidadMedida")}
                onChange={(v) => form.setValue("unidadMedida", v)}
                options={
                  [
                    { id: "LIBRA", label: "Libra" },
                    { id: "BOLSA", label: "Bolsa" },
                    { id: "UNIDAD", label: "Unidad" },
                  ] as const
                }
              />
            </div>
            <div className="grid gap-1.5">
              <span className="mst-label">Punto de carga</span>
              <SegmentedControl
                label="Punto de carga"
                fullWidth
                value={form.watch("puntoCarga")}
                onChange={(v) => form.setValue("puntoCarga", v)}
                options={
                  [
                    { id: "DEMOCRACIA", label: "Democracia" },
                    { id: "PLANTA", label: "Planta" },
                  ] as const
                }
              />
            </div>
          </div>
        </section>

        {error && <p className="text-sm text-peligro">{error}</p>}
      </form>
    </Dialog>
  );
}
