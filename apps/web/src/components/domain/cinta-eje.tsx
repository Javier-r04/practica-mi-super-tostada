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
}: {
  copy?: CopyEje;
  loading?: boolean;
  actions?: ReactNode;
  className?: string;
}) {
  if (loading || !copy) {
    return (
      <div
        className={cn(
          "h-[52px] rounded-tarjeta border border-[var(--border-subtle)] bg-blanco",
          className,
        )}
        aria-hidden
      />
    );
  }

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-3 gap-y-1 rounded-tarjeta border border-[var(--border-subtle)] bg-blanco px-4 py-2.5 shadow-tarjeta",
        className,
      )}
    >
      <CalendarClock size={16} className="shrink-0 text-marca" aria-hidden />
      <p className="min-w-0 flex-1 text-sm text-pretty text-tinta-800">
        <span className="font-semibold tabular-nums text-tinta-900">
          {copy.titulo}
        </span>
        <span className="ml-2 text-tinta-500">{copy.detalle}</span>
      </p>
      {actions ? (
        <div className="flex shrink-0 items-center gap-2">{actions}</div>
      ) : null}
    </div>
  );
}
