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
        // `inline-block`, no `block`: truncar necesita un contenedor de bloque,
        // pero con `block` la cifra parte el renglón antes y después de sí
        // misma. En una frase —«Tiene Q 500.00 en comprobantes…»— eso dejaba
        // el monto solo en su propia línea. Como hijo de flex o grid el
        // navegador lo bloquifica igual, así que las tablas no cambian.
        truncate
          ? "inline-block min-w-0 max-w-full truncate align-bottom"
          : "whitespace-nowrap",
        tones[tone],
        className,
      )}
    >
      {formatearCentavos(centavos)}
    </span>
  );
}
