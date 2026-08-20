import { formatearCentavos } from "@misupertostada/shared";
import { cn } from "@/lib/utils";

const tones = {
  default: "text-[var(--text-money)]",
  muted: "text-tinta-500",
  pendiente: "text-aviso",
};

export function Money({
  centavos,
  tone = "default",
  className,
}: {
  centavos: number | null;
  tone?: keyof typeof tones;
  className?: string;
}) {
  if (centavos == null) {
    return <span className={cn("text-tinta-500", className)}>—</span>;
  }
  return (
    <span className={cn("whitespace-nowrap tabular-nums font-semibold", tones[tone], className)}>
      {formatearCentavos(centavos)}
    </span>
  );
}
