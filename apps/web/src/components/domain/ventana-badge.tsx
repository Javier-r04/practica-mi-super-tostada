import { Clock, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

export function VentanaBadge({
  abierta,
  size = "md",
}: {
  abierta: boolean;
  size?: "sm" | "md";
}) {
  const Icon = abierta ? Clock : Lock;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-pill font-semibold tabular-nums",
        size === "sm" ? "h-[22px] px-2 text-[12px]" : "h-7 px-3 text-xs",
        abierta
          ? "bg-[var(--green-100)] text-[var(--green-700)]"
          : "bg-[var(--ink-100)] text-[var(--ink-600)]",
      )}
    >
      <Icon size={size === "sm" ? 12 : 14} aria-hidden />
      {abierta ? "Ventana abierta" : "Ventana cerrada"}
    </span>
  );
}
