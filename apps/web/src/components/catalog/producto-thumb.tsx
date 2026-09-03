"use client";

import { Package } from "lucide-react";
import { AssetImage, type Variante } from "@/components/ui/asset-image";
import { cn } from "@/lib/utils";

const SIZE = {
  sm: "size-11",
  md: "size-14",
  lg: "size-[68px]",
} as const;

export function ProductoThumb({
  nombre,
  fotoAssetId,
  size = "sm",
  className,
  srcPath,
  variante = size === "lg" ? "card" : "thumb",
}: {
  nombre: string;
  fotoAssetId?: string | null;
  size?: keyof typeof SIZE;
  className?: string;
  /** Path API sin cookie de staff (portal). */
  srcPath?: string;
  variante?: Variante;
}) {
  const box = cn(
    "relative shrink-0 overflow-hidden rounded-tarjeta bg-[var(--surface-secondary)]",
    "ring-1 ring-inset ring-[var(--border-subtle)]",
    SIZE[size],
    className,
  );

  if (fotoAssetId) {
    return (
      <span className={box}>
        <AssetImage
          assetId={fotoAssetId}
          alt={nombre}
          variante={variante}
          srcPath={srcPath}
          className="absolute inset-0 size-full object-cover"
        />
      </span>
    );
  }

  return (
    <span
      className={cn(
        box,
        "grid place-items-center bg-gradient-to-br from-[var(--cream-200)] to-[var(--cream-300)] text-[var(--green-900)]/45",
      )}
      aria-hidden
    >
      <Package size={size === "lg" ? 28 : size === "md" ? 22 : 18} strokeWidth={1.5} />
    </span>
  );
}
