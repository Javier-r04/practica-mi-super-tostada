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
import {
  Alert,
  Button,
  Card,
  Chip,
  Description,
  Input,
  Label,
  Modal,
  SearchField,
  Spinner,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
} from "@heroui/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { GripVertical, Package, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import {
  FAMILIAS,
  FAMILIA_ETIQUETA,
  crearProductoRequestSchema,
  editarProductoRequestSchema,
  formatearCentavos,
  quetzalesTextoACentavos,
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
import { Money } from "@/components/domain/money";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { EstadoBadge } from "@/components/domain/estado-badge";
import { FotoPicker } from "@/components/catalog/foto-picker";
import { ProductoThumb } from "@/components/catalog/producto-thumb";
import {
  ProductosResumen,
  resumenProductos,
} from "@/components/catalog/productos-resumen";

type FiltroActivo = "activos" | "todos" | "sin_foto";

const FILTROS = [
  { id: "activos", label: "Activos" },
  { id: "sin_foto", label: "Sin foto" },
  { id: "todos", label: "Todos" },
] as const;

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
  const canPrecio = tienePermiso(me.data?.usuario.permisos ?? [], "precios.cambiar");

  const productos = useQuery({
    queryKey: ["productos"],
    queryFn: () => api<ProductoPublico[]>("/productos"),
  });

  const resumen = useMemo(
    () => (productos.data ? resumenProductos(productos.data) : null),
    [productos.data],
  );

  const filtrados = useMemo(() => {
    const list = productos.data ?? [];
    const needle = q.trim().toLowerCase();
    return list.filter((p) => {
      if (filtro !== "todos" && !p.activo) return false;
      if (filtro === "sin_foto" && p.fotoAssetId) return false;
      if (!needle) return true;
      return (
        p.nombreCanonico.toLowerCase().includes(needle) ||
        p.sku.toLowerCase().includes(needle)
      );
    });
  }, [productos.data, q, filtro]);

  const reorder = useMutation({
    mutationFn: (payload: { familia: Familia; ids: string[] }) =>
      api("/productos/orden", { method: "PUT", body: JSON.stringify(payload) }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["productos"] });
      toastSuccess("Orden actualizado");
    },
    onError: (err) => toastFromError(err, "No se pudo guardar el orden"),
  });

  /* Arrastrar solo tiene sentido cuando la lista está completa dentro de la
     familia: con búsqueda o con el filtro "sin foto" faltan filas y el orden
     que se guardaría no sería el que el usuario ve. */
  const listaCompleta = q.trim() === "" && filtro !== "sin_foto";
  const total = productos.data?.length ?? 0;

  return (
    <PanelShell title="Catálogo">
      <div className="grid gap-5">
        <ProductosResumen resumen={resumen} cargando={productos.isLoading} />

        <section className="grid gap-3" aria-label="Buscar y filtrar">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <SearchField
              aria-label="Buscar producto"
              className="min-w-0 flex-1"
              value={q}
              onChange={setQ}
            >
              <SearchField.Group>
                <SearchField.SearchIcon />
                <SearchField.Input placeholder="Nombre o SKU" />
                <SearchField.ClearButton />
              </SearchField.Group>
            </SearchField>
            {canWrite && (
              <Button
                className="button--accent shrink-0"
                variant="primary"
                onPress={() => setEditing("new")}
              >
                <Plus size={16} aria-hidden />
                Nuevo producto
              </Button>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <ToggleButtonGroup
              aria-label="Filtrar productos"
              className="mst-segmento-activo"
              disallowEmptySelection
              selectedKeys={new Set([filtro])}
              selectionMode="single"
              size="sm"
              onSelectionChange={(keys) => {
                const next = [...keys][0];
                if (typeof next === "string") setFiltro(next as FiltroActivo);
              }}
            >
              {FILTROS.map((f, i) => (
                <ToggleButton key={f.id} id={f.id}>
                  {i > 0 && <ToggleButtonGroup.Separator />}
                  {f.label}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>

            {!productos.isLoading && (
              <p className="mst-label tabular-nums" aria-live="polite">
                {filtrados.length} de {total}
              </p>
            )}
          </div>
        </section>

        <Card className="gap-0 overflow-hidden p-0">
          {productos.isLoading ? (
            <CatalogoSkeleton />
          ) : filtrados.length === 0 ? (
            <EmptyState
              icon={<Package size={22} aria-hidden />}
              title={q ? "Ningún producto coincide" : "No hay productos"}
              description={
                q
                  ? "Pruebe con el SKU o el nombre."
                  : filtro === "sin_foto"
                    ? "Todos los productos activos ya tienen foto."
                    : filtro === "activos"
                      ? "No hay productos activos. Cambie a Todos o cree uno nuevo."
                      : "Cargue el catálogo a mano. Es el listado que Alex y Carla van a reconocer."
              }
              action={
                canWrite && !q && filtro !== "sin_foto" ? (
                  <Button
                    className="button--accent"
                    size="sm"
                    variant="primary"
                    onPress={() => setEditing("new")}
                  >
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
                  canDrag={canWrite && listaCompleta}
                  onEdit={setEditing}
                  onReorder={(ids) => {
                    const allInFamilia = (productos.data ?? [])
                      .filter((p) => p.familia === familia)
                      .map((p) => p.id);
                    const visibles = new Set(ids);
                    const ocultos = allInFamilia.filter((id) => !visibles.has(id));
                    reorder.mutate({ familia, ids: [...ids, ...ocultos] });
                  }}
                />
              );
            })
          )}
        </Card>
      </div>

      {editing && (
        <ProductoModal
          producto={editing === "new" ? null : editing}
          canPrecio={canPrecio}
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
          className="flex min-h-fila items-center gap-3 border-b border-[var(--border-subtle)] px-4 last:border-b-0 sm:px-5"
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
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );
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
      <h3 className="sticky top-0 z-[1] flex items-center justify-between gap-2 border-y border-[var(--border-subtle)] bg-[var(--ink-50)] px-4 py-2 mst-label first:border-t-0 sm:px-5">
        <span>{FAMILIA_ETIQUETA[familia]}</span>
        <span className="tabular-nums text-tinta-400">{items.length}</span>
      </h3>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={onDragEnd}
      >
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
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: producto.id, disabled: !canDrag });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "group flex min-h-fila items-center gap-2 border-b border-[var(--border-subtle)] px-2 py-2 last:border-b-0 sm:gap-3 sm:px-3",
        "transition-colors duration-control ease-out hover:bg-[var(--ink-50)]",
        isDragging && "relative z-[2] bg-blanco shadow-[var(--shadow-md)]",
        !producto.activo && "opacity-70",
      )}
    >
      {canDrag ? (
        <button
          type="button"
          className="inline-flex size-11 shrink-0 cursor-grab items-center justify-center rounded-campo text-tinta-400 opacity-0 transition-opacity duration-control ease-out focus-visible:opacity-100 focus-visible:outline-none focus-visible:shadow-foco group-hover:opacity-100 active:cursor-grabbing max-sm:opacity-100"
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
        {!producto.fotoAssetId && producto.activo && (
          <Chip className="hidden md:inline-flex" color="warning" size="sm" variant="soft">
            Sin foto
          </Chip>
        )}
        <EstadoBadge estado={producto.puntoCarga} size="sm" />
        {!producto.activo && (
          <Chip color="warning" size="sm" variant="soft">
            Inactivo
          </Chip>
        )}
        {canWrite && (
          <Button
            className="hidden sm:inline-flex"
            size="sm"
            variant="ghost"
            onPress={() => onEdit(producto)}
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
          {producto.precioBaseCentavos != null && (
            <>
              {" · "}
              <Money centavos={producto.precioBaseCentavos} tone="muted" />
            </>
          )}
        </span>
      </span>
    </>
  );
}

const UNIDADES = [
  { id: "LIBRA", label: "Libra" },
  { id: "BOLSA", label: "Bolsa" },
  { id: "UNIDAD", label: "Unidad" },
] as const;

const PUNTOS = [
  { id: "DEMOCRACIA", label: "Democracia" },
  { id: "PLANTA", label: "Planta" },
] as const;

function ProductoModal({
  producto,
  canPrecio,
  onClose,
  onSaved,
}: {
  producto: ProductoPublico | null;
  canPrecio: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [foto, setFoto] = useState<File | null>(null);
  const [clearFoto, setClearFoto] = useState(false);
  const [precioText, setPrecioText] = useState(
    producto?.precioBaseCentavos == null
      ? ""
      : formatearCentavos(producto.precioBaseCentavos, { simbolo: false, miles: false }),
  );
  const [precioError, setPrecioError] = useState<string | null>(null);
  const [campos, setCampos] = useState({
    sku: producto?.sku ?? "",
    nombreCanonico: producto?.nombreCanonico ?? "",
    familia: (producto?.familia ?? "TORTILLA") as Familia,
    unidadMedida: (producto?.unidadMedida ??
      "LIBRA") as ProductoPublico["unidadMedida"],
    puntoCarga: (producto?.puntoCarga ??
      "DEMOCRACIA") as ProductoPublico["puntoCarga"],
  });

  const set =
    <K extends keyof typeof campos>(k: K) =>
    (value: (typeof campos)[K]) =>
      setCampos((prev) => ({ ...prev, [k]: value }));

  const guardar = useMutation({
    mutationFn: async () => {
      let precioBaseCentavos: number | null | undefined = undefined;
      if (canPrecio) {
        if (precioText.trim() === "") {
          precioBaseCentavos = null;
        } else {
          try {
            precioBaseCentavos = quetzalesTextoACentavos(precioText);
            setPrecioError(null);
          } catch (err) {
            setPrecioError(
              err instanceof Error ? err.message : "Precio inválido",
            );
            throw new Error("Revise el precio base");
          }
        }
      }

      let productoId = producto?.id;
      if (producto) {
        const parsed = editarProductoRequestSchema.parse({
          ...campos,
          esProducido: producto.esProducido,
          ...(canPrecio ? { precioBaseCentavos } : {}),
        });
        await api(`/productos/${producto.id}`, {
          method: "PATCH",
          body: JSON.stringify(parsed),
        });
      } else {
        const parsed = crearProductoRequestSchema.parse({
          ...campos,
          esProducido: true,
          ...(canPrecio && precioBaseCentavos != null
            ? { precioBaseCentavos }
            : {}),
        });
        const creado = await api<ProductoPublico>("/productos", {
          method: "POST",
          body: JSON.stringify(parsed),
        });
        productoId = creado.id;
      }

      /* La foto va en un segundo viaje: si falla, el producto ya existe y la
         foto se agrega al editar. No se pierde la captura. */
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
          return;
        }
      } else if (productoId && clearFoto && producto?.fotoAssetId) {
        await api(`/productos/${productoId}`, {
          method: "PATCH",
          body: JSON.stringify({ fotoAssetId: null }),
        });
      }

      toastSuccess(producto ? "Producto actualizado" : "Producto guardado");
    },
    onSuccess: () => {
      setError(null);
      onSaved();
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : "No se pudo guardar");
      if (err instanceof ApiError) toastFromError(err, "No se pudo guardar");
    },
  });

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
    <Modal.Backdrop isOpen onOpenChange={(open) => !open && onClose()}>
      <Modal.Container size="lg">
        <Modal.Dialog>
          <Modal.CloseTrigger />
          <Modal.Header>
            <Modal.Heading>
              {producto ? "Editar producto" : "Nuevo producto"}
            </Modal.Heading>
            <p className="text-sm text-tinta-500">
              SKU planos por familia. La foto ayuda a reconocerlo en el portal y en
              captura.
            </p>
          </Modal.Header>

          <Modal.Body>
            <form
              id="producto-form"
              className="grid gap-6"
              onSubmit={(e) => {
                e.preventDefault();
                guardar.mutate();
              }}
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

              <fieldset className="grid gap-3">
                <legend className="mb-1 text-sm font-semibold text-tinta-900">
                  Identidad
                </legend>
                <div className="grid gap-3 sm:grid-cols-[10rem_1fr]">
                  <TextField isRequired value={campos.sku} onChange={set("sku")}>
                    <Label>SKU</Label>
                    <Input autoCapitalize="characters" className="font-mono" />
                  </TextField>
                  <TextField
                    isRequired
                    value={campos.nombreCanonico}
                    onChange={set("nombreCanonico")}
                  >
                    <Label>Nombre</Label>
                    <Input placeholder="Ej. Tostada de maíz" />
                  </TextField>
                </div>
              </fieldset>

              <fieldset className="grid gap-4">
                <legend className="mb-1 text-sm font-semibold text-tinta-900">
                  Operación
                </legend>

                <OpcionUnica
                  label="Familia"
                  descripcion="Agrupa el listado y define el orden de producción."
                  value={campos.familia}
                  options={FAMILIAS.map((f) => ({ id: f, label: FAMILIA_ETIQUETA[f] }))}
                  onChange={(v) => set("familia")(v as Familia)}
                />
                <OpcionUnica
                  label="Unidad"
                  value={campos.unidadMedida}
                  options={UNIDADES}
                  onChange={(v) =>
                    set("unidadMedida")(v as ProductoPublico["unidadMedida"])
                  }
                />
                <OpcionUnica
                  label="Punto de carga"
                  descripcion="Dónde sube el producto a la ruta."
                  value={campos.puntoCarga}
                  options={PUNTOS}
                  onChange={(v) => set("puntoCarga")(v as ProductoPublico["puntoCarga"])}
                />
                {canPrecio && (
                  <TextField
                    className="grid gap-1.5"
                    isInvalid={precioError != null}
                    value={precioText}
                    onChange={setPrecioText}
                  >
                    <Label>Precio base</Label>
                    <Description>
                      Lista de fábrica. Los clientes lo heredan si no tienen precio
                      propio.
                    </Description>
                    <Input
                      className="tabular-nums"
                      inputMode="decimal"
                      placeholder="12.50"
                    />
                    {precioError && (
                      <Description className="text-peligro">{precioError}</Description>
                    )}
                  </TextField>
                )}
              </fieldset>

              {error && (
                <Alert status="danger">
                  <Alert.Indicator />
                  <Alert.Content>
                    <Alert.Title>No se guardó</Alert.Title>
                    <Alert.Description>{error}</Alert.Description>
                  </Alert.Content>
                </Alert>
              )}
            </form>
          </Modal.Body>

          <Modal.Footer>
            {producto && producto.activo && (
              <Button
                className="mr-auto"
                isPending={desactivar.isPending}
                variant="danger-soft"
                onPress={() => desactivar.mutate()}
              >
                {({ isPending }) => (
                  <>
                    {isPending && <Spinner color="current" size="sm" />}
                    Desactivar
                  </>
                )}
              </Button>
            )}
            {producto && !producto.activo && (
              <Button
                className="mr-auto"
                isPending={activar.isPending}
                variant="secondary"
                onPress={() => activar.mutate()}
              >
                {({ isPending }) => (
                  <>
                    {isPending && <Spinner color="current" size="sm" />}
                    Reactivar
                  </>
                )}
              </Button>
            )}
            <Button variant="tertiary" onPress={onClose}>
              Cerrar
            </Button>
            <Button
              form="producto-form"
              isDisabled={guardar.isPending}
              type="submit"
              variant="primary"
            >
              {guardar.isPending ? "Un momento…" : "Guardar producto"}
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}

/* Un solo grupo de segmentos por decisión: son enums cortos y cerrados, y en
   tablet se eligen de un toque —mejor que un select que abre una capa más. */
function OpcionUnica({
  label,
  descripcion,
  value,
  options,
  onChange,
}: {
  label: string;
  descripcion?: string;
  value: string;
  options: ReadonlyArray<{ id: string; label: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <div className="grid gap-1.5">
      <span className="mst-label">{label}</span>
      <ToggleButtonGroup
        aria-label={label}
        className="mst-segmento-activo"
        disallowEmptySelection
        fullWidth
        selectedKeys={new Set([value])}
        selectionMode="single"
        onSelectionChange={(keys) => {
          const next = [...keys][0];
          if (typeof next === "string") onChange(next);
        }}
      >
        {options.map((o, i) => (
          <ToggleButton key={o.id} id={o.id}>
            {i > 0 && <ToggleButtonGroup.Separator />}
            {o.label}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
      {descripcion && <p className="text-xs text-tinta-500">{descripcion}</p>}
    </div>
  );
}
