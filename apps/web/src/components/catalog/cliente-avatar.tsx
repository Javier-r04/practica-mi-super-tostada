"use client";

import { AssetImage } from "@/components/ui/asset-image";
import { cn } from "@/lib/utils";

function iniciales(nombre: string): string {
  const parts = nombre.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]!.slice(0, 1)}${parts[1]!.slice(0, 1)}`.toUpperCase();
}

const SIZE = {
  sm: "size-9 text-[10px]",
  md: "size-14 text-sm",
  lg: "size-20 text-base sm:size-24 sm:text-lg",
} as const;

export function ClienteAvatar({
  nombre,
  fotoAssetId,
  size = "md",
  className,
}: {
  nombre: string;
  fotoAssetId?: string | null;
  size?: keyof typeof SIZE;
  className?: string;
}) {
  const box = cn(
    "relative shrink-0 overflow-hidden rounded-full font-semibold",
    SIZE[size],
    className,
  );

  if (fotoAssetId) {
    return (
      <span className={cn(box, "bg-[var(--ink-200)]")}>
        <AssetImage
          assetId={fotoAssetId}
          alt={nombre}
          variante="thumb"
          className="absolute inset-0 size-full"
        />
      </span>
    );
  }

  return (
    <span
      className={cn(
        box,
        "grid place-items-center bg-[var(--green-200)] text-[var(--green-850)]",
        "ring-1 ring-inset ring-[var(--green-300)]",
      )}
      aria-hidden
    >
      {iniciales(nombre)}
    </span>
  );
}
