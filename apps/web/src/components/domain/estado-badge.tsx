import {
  ESTADO_PRESENTACION,
  type EstadoBadgeVariant,
} from "@misupertostada/shared";
import { cn } from "@/lib/utils";

export function EstadoBadge({
  estado,
  size = "md",
}: {
  estado: EstadoBadgeVariant;
  size?: "sm" | "md";
}) {
  const e = ESTADO_PRESENTACION[estado];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-pill font-medium tracking-normal",
        size === "sm" ? "h-[18px] px-1.5 text-[11px]" : "h-[22px] px-2 text-[12px]",
      )}
      style={{ background: e.bg, color: e.fg }}
    >
      {e.label}
    </span>
  );
}
