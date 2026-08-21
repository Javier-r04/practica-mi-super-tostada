"use client";

import { Package } from "lucide-react";
import { AssetImage } from "@/components/ui/asset-image";
import { cn } from "@/lib/utils";

const SIZE = {
  sm: "size-11",
  md: "size-14",
} as const;

export function ProductoThumb({
  nombre,
  fotoAssetId,
  size = "sm",
  className,
  srcPath,
  variante = "thumb",
}: {
  nombre: string;
  fotoAssetId?: string | null;
  size?: keyof typeof SIZE;
  className?: string;
  /** Path API sin cookie de staff (portal). */
  srcPath?: string;
  variante?: "thumb" | "card";
}) {
  const box = cn(
    "relative shrink-0 overflow-hidden rounded-campo bg-tinta-50",
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
          className="absolute inset-0 size-full"
        />
      </span>
    );
  }

  return (
    <span
      className={cn(box, "grid place-items-center text-tinta-400")}
      aria-hidden
    >
      <Package size={size === "md" ? 22 : 18} strokeWidth={1.5} />
    </span>
  );
}
