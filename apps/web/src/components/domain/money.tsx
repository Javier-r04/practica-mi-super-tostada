import { formatearCentavos } from "@misupertostada/shared";
import { cn } from "@/lib/utils";

const tones = {
  default: "text-[var(--text-money)]",
  muted: "text-tinta-500",
  pendiente: "text-aviso",
  pagado: "text-marca",
  vencido: "text-peligro",
};

export function Money({
  centavos,
  tone = "default",
  truncate = false,
  className,
}: {
  centavos: number | null;
  tone?: keyof typeof tones;
  /** En celdas KPI estrechas: trunca con ellipsis en lugar de desbordar. */
  truncate?: boolean;
  className?: string;
}) {
  if (centavos == null) {
    return <span className={cn("text-tinta-500", className)}>—</span>;
  }
  return (
    <span
      className={cn(
        "tabular-nums font-semibold",
        truncate ? "block min-w-0 max-w-full truncate" : "whitespace-nowrap",
        tones[tone],
        className,
      )}
    >
      {formatearCentavos(centavos)}
    </span>
  );
}
