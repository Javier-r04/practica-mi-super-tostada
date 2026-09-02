import type { PortalPedido, PortalPedidoResumen } from "@misupertostada/shared";
import { EstadoBadge } from "@/components/domain/estado-badge";
import { cn } from "@/lib/utils";

type PedidoChip = Pick<PortalPedido, "correlativo" | "estado"> | PortalPedidoResumen;

/**
 * Píldoras del pedido abierto en el portal: número amarillo + estado.
 * Mismo lenguaje que la loseta «Pedido de esta noche» y el badge del nav.
 */
export function PortalPedidoChip({
  pedido,
  className,
  tono = "claro",
}: {
  pedido: PedidoChip;
  className?: string;
  /** `claro` sobre botón verde; `oscuro` sobre tarjeta de marca. */
  tono?: "claro" | "oscuro";
}) {
  return (
    <span
      className={cn("inline-flex flex-wrap items-center gap-2", className)}
    >
      <span
        className={cn(
          "inline-flex min-h-7 items-center rounded-pill px-3 font-mono text-xs font-semibold tabular-nums",
          tono === "oscuro"
            ? "bg-[var(--yellow-400)] text-[var(--green-900)]"
            : "bg-[var(--yellow-200)] text-[var(--amber-700)]",
        )}
      >
        #{pedido.correlativo}
      </span>
      <EstadoBadge estado={pedido.estado} size="sm" />
    </span>
  );
}
