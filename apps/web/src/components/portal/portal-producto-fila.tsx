"use client";

import type { ReactNode } from "react";
import { Card, Chip, Button } from "@heroui/react";
import { Star, X, Package } from "lucide-react";
import {
  UNIDAD_CORTA,
  type PortalProducto,
} from "@misupertostada/shared";
import { Money } from "@/components/domain/money";
import { ProductoThumb } from "@/components/catalog/producto-thumb";
import { QuantityStepper } from "@/components/ui/quantity-stepper";
import { AssetImage } from "@/components/ui/asset-image";
import { cn } from "@/lib/utils";

/* El stepper de ±: en teléfono se pide de un toque por unidad; tocar el
   número abre teclado numérico para cantidades grandes. Es compartido con
   captura interna. */

function ProductoNombres({ producto }: { producto: PortalProducto }) {
  return (
    <>
      <div className="flex items-start gap-1.5">
        <span className="text-pretty text-[15px] font-semibold capitalize leading-snug text-tinta-900">
          {producto.alias}
        </span>
        {producto.favorito ? (
          <Star
            size={14}
            className="mt-0.5 shrink-0 text-[var(--gold-500)]"
            fill="currentColor"
            aria-label="De los que pide siempre"
          />
        ) : null}
      </div>
      {producto.alias !== producto.nombreCanonico ? (
        <p className="mt-0.5 text-pretty text-[12px] leading-snug text-tinta-500">
          {producto.nombreCanonico}
        </p>
      ) : null}
    </>
  );
}

function ProductoPrecio({
  producto,
  unidad,
  className,
}: {
  producto: PortalProducto;
  unidad: string;
  className?: string;
}) {
  if (!producto.pedible) {
    return (
      <Chip className={className} color="warning" size="sm" variant="soft">
        Sin precio — avise a la fábrica
      </Chip>
    );
  }

  return (
    <p className={cn("text-[13px] tabular-nums text-tinta-600", className)}>
      <Money centavos={producto.precioCentavos} tone="muted" /> / {unidad}
    </p>
  );
}

export function PortalProductoFila({
  producto,
  cantidad,
  onChange,
  bloqueado,
  assetPath,
  layout = "row",
}: {
  producto: PortalProducto;
  cantidad: number;
  onChange: (cantidad: number) => void;
  bloqueado: boolean;
  assetPath?: (assetId: string) => string;
  layout?: "row" | "card";
}) {
  const unidad = UNIDAD_CORTA[producto.unidadMedida];
  const disabled = bloqueado || !producto.pedible;
  /* Camino de fotos sin cookie de staff: el portal sirve el asset por
     `/p/{token}/assets/{id}` y `AssetImage` hace el fetch con credentials
     "omit" cuando recibe `srcPath`. No lo toque. */
  const srcPath =
    producto.fotoAssetId && assetPath
      ? assetPath(producto.fotoAssetId)
      : undefined;
  const elegido = cantidad > 0;

  if (layout === "card") {
    return (
      <Card
        className={cn(
          "h-full gap-0 overflow-hidden bg-blanco border-[1px] transition-colors duration-control ease-out",
          elegido
            ? "border-[var(--green-600)] ring-1 ring-[var(--green-600)]"
            : "border-[var(--border-subtle)]",
        )}
      >
        <div className="relative aspect-[4/3] w-full grid place-items-center bg-tinta-50 overflow-hidden border-b border-[var(--border-subtle)]">
          {producto.fotoAssetId ? (
            <AssetImage
              assetId={producto.fotoAssetId}
              alt={producto.alias}
              variante="card"
              srcPath={srcPath}
              className="absolute inset-0 size-full object-cover"
            />
          ) : (
            <span className="text-tinta-400" aria-hidden>
              <Package size={32} strokeWidth={1.5} />
            </span>
          )}
          
          <div className="absolute top-2.5 left-2.5">
            <Chip 
              className="bg-white/95 text-tinta-900 font-bold uppercase tracking-wider backdrop-blur-sm text-[11px] shadow-sm border border-tinta-100"
              size="sm"
            >
              {producto.familia}
            </Chip>
          </div>
          
          {producto.favorito ? (
            <div className="absolute top-2.5 right-2.5 bg-white/95 rounded-full p-1.5 shadow-sm backdrop-blur-sm border border-tinta-100">
              <Star
                size={16}
                className="text-[var(--gold-500)]"
                fill="currentColor"
                aria-label="De los que pide siempre"
              />
            </div>
          ) : null}
        </div>

        <div className="flex flex-1 flex-col gap-3 p-4">
          <div className="min-w-0">
            <h3 className="truncate font-display text-[17px] font-bold capitalize text-tinta-900 mb-0.5">
              {producto.alias}
            </h3>
            {producto.alias !== producto.nombreCanonico ? (
              <p className="truncate text-[12px] text-tinta-500 mb-1">
                {producto.nombreCanonico}
              </p>
            ) : null}
            {producto.pedible ? (
              <p className="mt-1 text-[14px] font-bold text-tinta-900">
                <Money centavos={producto.precioCentavos} /> <span className="font-normal text-tinta-500">/ {unidad}</span>
              </p>
            ) : (
              <Chip className="mt-1" color="warning" size="sm" variant="soft">
                Sin precio — avise a la fábrica
              </Chip>
            )}
          </div>
          
          <div className="mt-auto flex items-center gap-2">
            <div className="flex-1 [&>div]:w-full [&>div>span]:flex-1">
              <QuantityStepper
                value={cantidad}
                onChange={onChange}
                unidad={unidad}
                disabled={disabled}
                size="lg"
              />
            </div>
            {elegido ? (
              <Button
                isIconOnly
                variant="tertiary"
                size="lg"
                className="shrink-0 rounded-campo bg-peligro/10 text-peligro"
                onPress={() => onChange(0)}
                aria-label="Eliminar"
              >
                <X size={20} strokeWidth={2} />
              </Button>
            ) : null}
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div
      className={cn(
        "grid gap-2.5 border-b border-[var(--border-subtle)] py-3 pr-3 last:border-b-0",
        "border-l-[3px] pl-3 transition-colors duration-control ease-out",
        elegido
          ? "border-l-[var(--green-600)] bg-[var(--green-50)]"
          : "border-l-transparent",
      )}
    >
      <div className="flex min-w-0 gap-3">
        <ProductoThumb
          nombre={producto.alias}
          fotoAssetId={producto.fotoAssetId}
          srcPath={srcPath}
          size="md"
        />
        <div className="min-w-0 flex-1">
          <ProductoNombres producto={producto} />
        </div>
      </div>
      <div className="flex min-w-0 items-center justify-between gap-2">
        <ProductoPrecio
          producto={producto}
          unidad={unidad}
          className="min-w-0 shrink truncate"
        />
        <QuantityStepper
          value={cantidad}
          onChange={onChange}
          unidad={unidad}
          disabled={disabled}
          size="md"
          className="shrink-0"
        />
      </div>
    </div>
  );
}

export function PortalSeccion({
  titulo,
  cuenta,
  children,
}: {
  titulo: string;
  /** Cuántos productos trae la sección: orienta al cliente sin abrir nada. */
  cuenta?: number;
  children: ReactNode;
}) {
  return (
    <section className="grid gap-2">
      <h2 className="flex items-baseline justify-between gap-2 px-1 mst-label">
        <span>{titulo}</span>
        {cuenta != null ? (
          <span className="tabular-nums text-tinta-400">{cuenta}</span>
        ) : null}
      </h2>
      <Card className="gap-0 overflow-hidden p-0">{children}</Card>
    </section>
  );
}
