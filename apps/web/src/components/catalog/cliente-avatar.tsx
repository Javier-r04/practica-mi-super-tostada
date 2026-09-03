"use client";

import { Avatar } from "@heroui/react";
import { AssetImage } from "@/components/ui/asset-image";
import { cn } from "@/lib/utils";

function iniciales(nombre: string): string {
  const parts = nombre.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]!.slice(0, 1)}${parts[1]!.slice(0, 1)}`.toUpperCase();
}

/* Los tamaños son del panel, no de HeroUI: la misma ficha aparece en reparto,
   cartera y tablero, y ahí el diámetro está calibrado con la altura de fila. */
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
  return (
    <Avatar
      className={cn(
        "shrink-0 rounded-full font-semibold",
        fotoAssetId ? "bg-[var(--ink-200)]" : "bg-[var(--green-200)]",
        SIZE[size],
        className,
      )}
    >
      {/* La foto se sirve tras cookie de sesión: la trae AssetImage como blob,
          no Avatar.Image, que solo sabe de URLs públicas. */}
      {fotoAssetId ? (
        <AssetImage
          assetId={fotoAssetId}
          alt={nombre}
          variante="thumb"
          className="absolute inset-0 size-full"
        />
      ) : (
        <Avatar.Fallback
          aria-hidden
          className={cn(
            "bg-[var(--green-200)] text-[var(--green-850)]",
            "text-[length:inherit] ring-1 ring-inset ring-[var(--green-300)]",
          )}
        >
          {iniciales(nombre)}
        </Avatar.Fallback>
      )}
    </Avatar>
  );
}
