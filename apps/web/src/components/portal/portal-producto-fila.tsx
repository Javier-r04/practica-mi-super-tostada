"use client";

import type { ReactNode } from "react";
import { Star } from "lucide-react";
import {
  UNIDAD_CORTA,
  type PortalProducto,
} from "@misupertostada/shared";
import { Money } from "@/components/domain/money";
import { ProductoThumb } from "@/components/catalog/producto-thumb";
import { QuantityStepper } from "@/components/ui/quantity-stepper";
import { cn } from "@/lib/utils";

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
  const srcPath =
    producto.fotoAssetId && assetPath
      ? assetPath(producto.fotoAssetId)
      : undefined;

  if (layout === "card") {
    return (
      <div className="flex flex-col gap-3 rounded-tarjeta border border-[var(--border-subtle)] bg-blanco p-4">
        <ProductoThumb
          nombre={producto.alias}
          fotoAssetId={producto.fotoAssetId}
          srcPath={srcPath}
          size="md"
          variante={producto.fotoAssetId ? "card" : "thumb"}
          className="size-20"
        />
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-sm font-semibold capitalize text-tinta-900">
              {producto.alias}
            </span>
            {producto.favorito ? (
              <Star
                size={13}
                className="shrink-0 text-[var(--gold-500)]"
                fill="currentColor"
                aria-label="Favorito"
              />
            ) : null}
          </div>
          <p className="text-[12px] text-tinta-500">
            {producto.alias !== producto.nombreCanonico
              ? `${producto.nombreCanonico} · `
              : null}
            {producto.pedible ? (
              <>
                <Money centavos={producto.precioCentavos} tone="muted" /> /{" "}
                {unidad}
              </>
            ) : (
              "Sin precio — avise a la fábrica"
            )}
          </p>
        </div>
        <QuantityStepper
          value={cantidad}
          onChange={onChange}
          unidad={unidad}
          disabled={disabled}
          size="lg"
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex items-center gap-3 border-b border-[var(--border-subtle)] px-4 py-3",
      )}
    >
      <ProductoThumb
        nombre={producto.alias}
        fotoAssetId={producto.fotoAssetId}
        srcPath={srcPath}
        size="sm"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-sm font-semibold capitalize text-tinta-900">
            {producto.alias}
          </span>
          {producto.favorito ? (
            <Star
              size={13}
              className="shrink-0 text-[var(--gold-500)]"
              fill="currentColor"
              aria-label="Favorito"
            />
          ) : null}
        </div>
        <p className="text-[12px] text-tinta-500">
          {producto.alias !== producto.nombreCanonico
            ? `${producto.nombreCanonico} · `
            : null}
          {producto.pedible ? (
            <>
              <Money centavos={producto.precioCentavos} tone="muted" /> / {unidad}
            </>
          ) : (
            "Sin precio — avise a la fábrica"
          )}
        </p>
      </div>
      <QuantityStepper
        value={cantidad}
        onChange={onChange}
        unidad={unidad}
        disabled={disabled}
        size="lg"
      />
    </div>
  );
}

export function PortalSeccion({
  titulo,
  children,
}: {
  titulo: string;
  children: ReactNode;
}) {
  return (
    <section className="grid gap-2">
      <h2 className="px-4 mst-label lg:px-0">{titulo}</h2>
      <div className="border-y border-[var(--border-subtle)] bg-blanco lg:rounded-tarjeta lg:border">
        {children}
      </div>
    </section>
  );
}
