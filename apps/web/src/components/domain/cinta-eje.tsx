import { CalendarClock } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { CopyEje } from "@/lib/ejes-vista";

/**
 * Rótulo del eje de fecha al que está anclada una pantalla.
 *
 * Existe porque «hoy» son tres días distintos mientras la ventana cruza la
 * medianoche (ver `USAGE.md` §4). Cada pantalla de operación abre esta cinta
 * arriba diciendo *qué* está viendo y *por qué*, en vez de dejar que se deduzca
 * de los datos. El navbar da los tres ejes; esto dice cuál manda aquí.
 */
export function CintaEje({
  copy,
  loading,
  actions,
  className,
  variant = "default",
  extra,
}: {
  copy?: CopyEje;
  loading?: boolean;
  actions?: ReactNode;
  className?: string;
  /** `accent` = borde y fondo amarillo del rótulo de captura. */
  variant?: "default" | "accent";
  /** Píldoras o metadatos debajo del copy (p. ej. horario de ventana). */
  extra?: ReactNode;
}) {
  if (loading || !copy) {
    return (
      <div
        className={cn(
          "h-[52px] rounded-tarjeta border border-[var(--border-subtle)] bg-blanco",
          variant === "accent" &&
            "border-[var(--yellow-300)]/35 bg-[var(--yellow-100)]/10",
          className,
        )}
        aria-hidden
      />
    );
  }

  const acento = variant === "accent";

  return (
    <div
      className={cn(
        "grid gap-2.5 rounded-tarjeta border px-4 py-3 shadow-tarjeta",
        acento
          ? "border-[var(--yellow-300)]/40 bg-[var(--yellow-100)]/25"
          : "border-[var(--border-subtle)] bg-blanco",
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <CalendarClock
          size={16}
          className={cn("shrink-0", acento ? "text-acento-fuerte" : "text-marca")}
          aria-hidden
        />
        <p className="min-w-0 flex-1 text-sm text-pretty">
          <span
            className={cn(
              "font-semibold tabular-nums",
              acento ? "text-[var(--amber-700)]" : "text-tinta-900",
            )}
          >
            {copy.titulo}
          </span>
          <span
            className={cn(
              "ml-2",
              acento ? "text-[var(--amber-700)]/85" : "text-tinta-500",
            )}
          >
            {copy.detalle}
          </span>
        </p>
        {actions ? (
          <div className="flex shrink-0 items-center gap-2">{actions}</div>
        ) : null}
      </div>
      {extra ? <div>{extra}</div> : null}
    </div>
  );
}
