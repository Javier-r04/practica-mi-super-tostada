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
      <div className="flex min-w-0 items-start gap-1.5">
        <span className="min-w-0 line-clamp-2 text-pretty text-[15px] font-semibold capitalize leading-snug text-tinta-900">
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
        Sin precio — avise a la fábrica
      </Chip>
    );
  }

  return (
    <p className={cn("min-w-0 text-[13px] tabular-nums text-tinta-600", className)}>
      <Money centavos={producto.precioCentavos} tone="muted" truncate /> / {unidad}
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
    />
  );

  if (layout === "card") {
    const cuerpo = (
      <>
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-tinta-50">
          {producto.fotoAssetId ? (
            <AssetImage
              assetId={producto.fotoAssetId}
              alt={producto.alias}
              variante="card"
              srcPath={srcPath}
              className="absolute inset-0 size-full object-cover"
            />
          ) : (
            <span className="grid size-full place-items-center text-tinta-400" aria-hidden>
              <Package size={36} strokeWidth={1.5} />
            </span>
          )}
          {producto.favorito ? (
            <span className="absolute right-2.5 top-2.5 grid size-8 place-items-center rounded-full bg-blanco/95 text-[var(--gold-500)]">
              <Star size={16} fill="currentColor" aria-label="De los que pide siempre" />
            </span>
          ) : null}
        </div>
        <div className="grid gap-1 px-4 pt-3">
          <h3 className="truncate font-display text-[17px] font-bold capitalize text-tinta-900">
            {producto.alias}
          </h3>
          {producto.alias !== producto.nombreCanonico ? (
            <p className="truncate text-[12px] text-tinta-500">
              {producto.nombreCanonico}
            </p>
          ) : null}
          <ProductoPrecio producto={producto} unidad={unidad} />
        </div>
      </>
    );

    return (
      <Card
        className={cn(
          "h-full gap-0 overflow-hidden bg-blanco p-0",
          elegido && "ring-1 ring-[var(--green-600)]",
        )}
      >
        {href ? (
          <Link
            href={href}
            className="min-w-0 text-inherit no-underline hover:text-inherit hover:no-underline focus-visible:outline-none focus-visible:shadow-foco"
          >
            {cuerpo}
          </Link>
        ) : (
          cuerpo
        )}
        <div className="mt-auto flex justify-end px-3 pb-3 pt-2">{stepper}</div>
      </Card>
    );
  }

  const info = (
    <>
      <ProductoThumb
        nombre={producto.alias}
        fotoAssetId={producto.fotoAssetId}
        srcPath={srcPath}
        size="md"
      />
      <div className="min-w-0 flex-1">
        <ProductoNombres producto={producto} />
        <ProductoPrecio producto={producto} unidad={unidad} className="mt-0.5" />
      </div>
    </>
  );

  return (
    <div
      className={cn(
        "flex min-w-0 items-center gap-2 py-3",
        elegido && "rounded-campo bg-[var(--green-50)]",
      )}
    >
      {href ? (
        <Link
          href={href}
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
  children,
}: {
  titulo: string;
  cuenta?: number;
  children: ReactNode;
}) {
  return (
    <section className="grid min-w-0 gap-1">
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
