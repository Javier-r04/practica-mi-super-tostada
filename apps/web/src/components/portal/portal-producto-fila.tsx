"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Card, Chip } from "@heroui/react";
import { Star, Package } from "lucide-react";
import {
  UNIDAD_CORTA,
  type PortalProducto,
} from "@misupertostada/shared";
import { Money } from "@/components/domain/money";
import { ProductoThumb } from "@/components/catalog/producto-thumb";
import { QuantityStepper } from "@/components/ui/quantity-stepper";
import { AssetImage } from "@/components/ui/asset-image";
import { cn } from "@/lib/utils";

function ProductoNombres({ producto }: { producto: PortalProducto }) {
  return (
    <>
      <div className="flex min-w-0 items-center gap-1.5">
        <span className="min-w-0 line-clamp-2 text-pretty text-[15px] font-bold capitalize leading-snug text-tinta-900">
          {producto.alias}
        </span>
        {producto.favorito ? (
          <span className="inline-flex shrink-0 items-center gap-0.5 rounded-pill bg-[var(--yellow-100)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--green-900)]">
            <Star
              size={11}
              className="text-[var(--gold-500)]"
              fill="currentColor"
              aria-hidden
            />
            <span className="hidden sm:inline">Favorito</span>
          </span>
        ) : null}
      </div>
      {producto.alias !== producto.nombreCanonico ? (
        <p className="mt-0.5 line-clamp-1 text-pretty text-[12px] leading-snug text-tinta-500">
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
        Sin precio
      </Chip>
    );
  }

  return (
    <p className={cn("min-w-0 text-[13px] tabular-nums text-tinta-700", className)}>
      <Money centavos={producto.precioCentavos} tone="default" className="text-sm font-bold text-[var(--green-900)]" truncate />{" "}
      <span className="text-xs font-normal text-tinta-500">/ {unidad}</span>
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
  href,
}: {
  producto: PortalProducto;
  cantidad: number;
  onChange: (cantidad: number) => void;
  bloqueado: boolean;
  assetPath?: (assetId: string) => string;
  layout?: "row" | "card";
  /** Ficha del artículo. El stepper no navega. */
  href?: string;
}) {
  const unidad = UNIDAD_CORTA[producto.unidadMedida];
  const disabled = bloqueado || !producto.pedible;
  const srcPath =
    producto.fotoAssetId && assetPath
      ? assetPath(producto.fotoAssetId)
      : undefined;
  const elegido = cantidad > 0;

  const stepper = (
    <QuantityStepper
      value={cantidad}
      onChange={onChange}
      unidad={unidad}
      disabled={disabled}
      size="md"
      variant="plain"
      showAddWhenZero
    />
  );

  if (layout === "card") {
    const cuerpo = (
      <>
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-[var(--surface-secondary)]">
          {producto.fotoAssetId ? (
            <AssetImage
              assetId={producto.fotoAssetId}
              alt={producto.alias}
              variante="card"
              srcPath={srcPath}
              className="absolute inset-0 size-full object-cover transition-transform duration-control ease-out group-hover:scale-105"
            />
          ) : (
            <span
              className="grid size-full place-items-center bg-gradient-to-br from-[var(--cream-200)] to-[var(--cream-300)] text-[var(--green-900)]/40"
              aria-hidden
            >
              <Package size={36} strokeWidth={1.5} />
            </span>
          )}
          {producto.favorito ? (
            <span className="absolute right-2.5 top-2.5 flex items-center gap-1 rounded-full bg-blanco/95 px-2 py-0.5 text-xs font-bold text-[var(--green-900)] shadow-xs">
              <Star size={13} className="text-[var(--gold-500)]" fill="currentColor" aria-hidden />
              <span>Favorito</span>
            </span>
          ) : null}
        </div>
        <div className="grid gap-1 px-4 pt-3">
          <h3 className="truncate font-display text-[16px] font-bold capitalize text-tinta-900">
            {producto.alias}
          </h3>
          {producto.alias !== producto.nombreCanonico ? (
            <p className="truncate text-[12px] text-tinta-500">
              {producto.nombreCanonico}
            </p>
          ) : null}
        </div>
      </>
    );

    return (
      <Card
        className={cn(
          "group h-full gap-0 overflow-hidden bg-blanco p-0 transition-all duration-control ease-out hover:shadow-[var(--shadow-md)]",
          elegido
            ? "border-[var(--green-600)] ring-2 ring-[var(--green-600)] shadow-xs"
            : "border-[var(--border-subtle)]",
        )}
      >
        {href ? (
          <Link
            href={href}
            aria-label={`Ver detalle de ${producto.alias}`}
            className="min-w-0 text-inherit no-underline hover:text-inherit hover:no-underline focus-visible:outline-none focus-visible:shadow-foco"
          >
            {cuerpo}
          </Link>
        ) : (
          cuerpo
        )}
        <div className="mt-auto flex items-center justify-between border-t border-[var(--border-subtle)]/70 bg-[var(--surface-card)] px-3.5 py-2.5">
          <ProductoPrecio producto={producto} unidad={unidad} />
          {stepper}
        </div>
      </Card>
    );
  }

  const info = (
    <>
      <ProductoThumb
        nombre={producto.alias}
        fotoAssetId={producto.fotoAssetId}
        srcPath={srcPath}
        size="lg"
        variante="card"
      />
      <div className="min-w-0 flex-1">
        <ProductoNombres producto={producto} />
        <ProductoPrecio producto={producto} unidad={unidad} className="mt-1" />
      </div>
    </>
  );

  return (
    <div
      className={cn(
        "relative flex min-w-0 items-center gap-3 rounded-tarjeta border bg-blanco p-3 transition-all duration-control ease-out shadow-xs",
        elegido
          ? "border-[var(--green-600)] bg-[var(--green-50)/45] shadow-sm"
          : "border-[var(--border-subtle)] hover:border-[var(--border-default)]",
      )}
    >
      {href ? (
        <Link
          href={href}
          aria-label={`Ver detalle de ${producto.alias}`}
          className="flex min-w-0 flex-1 items-center gap-3 text-inherit no-underline hover:text-inherit hover:no-underline focus-visible:outline-none focus-visible:shadow-foco"
        >
          {info}
        </Link>
      ) : (
        <div className="flex min-w-0 flex-1 items-center gap-3">{info}</div>
      )}
      <div className="shrink-0">{stepper}</div>
    </div>
  );
}

export function PortalSeccion({
  titulo,
  cuenta,
  id,
  children,
}: {
  titulo: string;
  cuenta?: number;
  id?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="grid min-w-0 scroll-mt-20 gap-2">
      <h2 className="flex min-w-0 items-baseline justify-between gap-2 px-1 mst-label">
        <span>{titulo}</span>
        {cuenta != null ? (
          <span className="tabular-nums text-tinta-400">{cuenta}</span>
        ) : null}
      </h2>
      {children}
    </section>
  );
}
