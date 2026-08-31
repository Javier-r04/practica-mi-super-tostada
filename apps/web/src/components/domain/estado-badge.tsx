import {
  ABONO_ESTADOS,
  ABONO_ESTADO_PRESENTACION,
  ESTADO_PRESENTACION,
  type AbonoEstado,
  type EstadoBadgeVariant,
} from "@misupertostada/shared";
import { cn } from "@/lib/utils";

function esAbonoEstado(estado: EstadoBadgeVariant): estado is AbonoEstado {
  return (ABONO_ESTADOS as readonly string[]).includes(estado);
}

export function EstadoBadge({
  estado,
  size = "md",
  dominio,
}: {
  estado: EstadoBadgeVariant;
  size?: "sm" | "md";
  /** Abono a cuenta: PENDIENTE = «En revisión», no factura pendiente. */
  dominio?: "factura" | "abono";
}) {
  const e =
    dominio === "abono" && esAbonoEstado(estado)
      ? ABONO_ESTADO_PRESENTACION[estado]
      : ESTADO_PRESENTACION[estado];
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
