import {
  FAMILIA_ETIQUETA,
  UNIDAD_CORTA,
  type LineaProducto,
} from "@misupertostada/shared";
import { EstadoBadge } from "@/components/domain/estado-badge";
import { Badge, Tag } from "@/components/ui/badge";
import {
  deltaCantidad,
  gruposPorFamilia,
  lineasVisibles,
} from "@/lib/produccion-vista";
import { cn } from "@/lib/utils";

export function HojaGrupos({
  lineas,
  soloCambios,
}: {
  lineas: LineaProducto[];
  soloCambios: boolean;
}) {
  const visibles = lineasVisibles(lineas, soloCambios);
  const grupos = gruposPorFamilia(visibles);

  if (grupos.length === 0) {
    return (
      <p className="px-4 py-8 text-sm text-tinta-500 sm:px-5">
        No hay cambios respecto a la versión anterior.
      </p>
    );
  }

  return (
    <div>
      {grupos.map((grupo) => (
        <section key={grupo.familia}>
          <h3 className="sticky top-0 z-[1] flex items-center justify-between gap-2 border-t border-[var(--border-subtle)] bg-tinta-50 px-4 py-2 mst-label sm:px-5">
            <span>{FAMILIA_ETIQUETA[grupo.familia]}</span>
            <span className="tabular-nums text-tinta-400">
              {grupo.lineas.length}
            </span>
          </h3>
          <ul>
            {grupo.lineas.map((linea) => (
              <FilaHoja
                key={`${linea.productoId}-${linea.cambio ?? "ok"}`}
                linea={linea}
              />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function FilaHoja({ linea }: { linea: LineaProducto }) {
  const delta = deltaCantidad(linea);
  const eliminado = linea.cambio === "eliminado";

  return (
    <li
      className={cn(
        "flex min-h-fila items-center gap-2 border-b border-[var(--border-subtle)] px-4 py-2 sm:gap-3 sm:px-5",
        linea.cambio ? "bg-[var(--amber-100)]/60" : "bg-blanco",
        eliminado && "opacity-70",
      )}
    >
      <span
        className={cn(
          "min-w-0 flex-1 text-sm font-semibold text-pretty text-tinta-900",
          eliminado && "line-through",
        )}
      >
        {linea.nombreCanonico}
      </span>
      {linea.notaProduccion && <Tag>{linea.notaProduccion}</Tag>}
      <EstadoBadge estado={linea.puntoCargaEfectivo} size="sm" />
      {linea.cambio === "nuevo" && <Badge tone="amber">nuevo en v2</Badge>}
      {linea.cambio === "ajustado" && !delta && (
        <Badge tone="amber">ajustado</Badge>
      )}
      {eliminado && <Badge tone="amber">eliminado</Badge>}
      <span
        aria-label={
          delta ? `${delta.de} antes, ${delta.a} ahora` : undefined
        }
        className={cn(
          "shrink-0 font-display text-xl tabular-nums text-marca",
          eliminado && "line-through",
        )}
      >
        {delta ? (
          <>
            <span className="text-base text-tinta-500" aria-hidden>
              {delta.de}
            </span>
            <span className="mx-1 text-base text-tinta-400" aria-hidden>
              →
            </span>
            <span aria-hidden>{delta.a}</span>
          </>
        ) : (
          linea.cantidad
        )}
      </span>
      <span className="w-14 shrink-0 text-xs text-tinta-500">
        {UNIDAD_CORTA[linea.unidadMedida]}
      </span>
    </li>
  );
}
