import { formatearCentavos } from "@misupertostada/shared";
import type * as React from "react";
import { cn } from "@/lib/utils";

const sizeClass = {
  sm: "text-xs font-semibold",
  md: "text-sm font-semibold",
  lg: "text-lg font-semibold",
  xl: "font-core text-2xl font-semibold tracking-[var(--tracking-display)]",
} as const;

const toneClass = {
  default: "text-[var(--text-money)]",
  muted: "text-tinta-500",
  pagado: "text-pagado",
  pendiente: "text-aviso-700",
  vencido: "text-peligro",
  accent: "text-acento",
  inverse: "text-blanco",
} as const;

export interface MoneyProps {
  /** Monto en centavos enteros. `1250` → `Q 12.50`. */
  centavos: number;
  /** `xl` usa el mismo Plex Sans a 24 px, para cifras de tablero. */
  size?: keyof typeof sizeClass;
  tone?: keyof typeof toneClass;
  /** `false` omite el símbolo `Q` (columnas donde ya está en el encabezado). */
  simbolo?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export function Money({
  centavos,
  size = "md",
  tone = "default",
  simbolo = true,
  className,
  style,
}: MoneyProps) {
  return (
    <span
      className={cn(
        "tabular-nums whitespace-nowrap",
        sizeClass[size],
        toneClass[tone],
        className,
      )}
      style={style}
    >
      {formatearCentavos(centavos, { simbolo })}
    </span>
  );
}

export { formatearCentavos };
