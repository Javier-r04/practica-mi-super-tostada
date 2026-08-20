import {
  ESTADO_PRESENTACION,
  type Estado,
} from "@misupertostada/shared";
import type * as React from "react";
import { cn } from "@/lib/utils";

export interface EstadoBadgeProps {
  /** Estados de pedido, de cobranza, de cola offline y puntos de carga. */
  estado: Estado;
  size?: "sm" | "md";
  className?: string;
  style?: React.CSSProperties;
}

export function EstadoBadge({
  estado,
  size = "md",
  className,
  style,
}: EstadoBadgeProps) {
  const presentacion = ESTADO_PRESENTACION[estado];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-pill font-semibold uppercase tracking-[var(--tracking-caps)]",
        size === "sm"
          ? "h-[18px] px-1.5 text-[length:var(--text-3xs)]"
          : "h-[22px] px-[9px] text-[length:var(--text-2xs)]",
        className,
      )}
      style={{
        background: presentacion.bg,
        color: presentacion.fg,
        ...style,
      }}
    >
      {estado === "SIN_SINCRONIZAR" ? (
        <span className="size-1.5 shrink-0 rounded-pill bg-current" />
      ) : null}
      {presentacion.label}
    </span>
  );
}
