import { EstadoBadge } from "@/components/domain/estado-badge";
import { Badge, Tag } from "@/components/ui/badge";
import { UNIDAD_CORTA, type GrupoCarga, type LineaProducto } from "@misupertostada/shared";
import { cn } from "@/lib/utils";

export function HojaGrupos({
  grupos,
  soloCambios,
}: {
  grupos: GrupoCarga[];
  soloCambios: boolean;
}) {
  const visibles = grupos
    .map((g) => ({
      ...g,
      lineas: soloCambios ? g.lineas.filter((l) => l.cambio) : g.lineas,
    }))
    .filter((g) => g.lineas.length > 0);

  if (visibles.length === 0) {
    return (
      <p className="px-5 py-8 text-sm text-tinta-500">
        No hay cambios respecto a la versión anterior.
      </p>
    );
  }

  return (
    <div>
      {visibles.map((grupo) => (
        <div key={grupo.puntoCarga}>
          <div className="flex items-center gap-2 border-y border-[var(--border-subtle)] bg-tinta-50 px-4 py-2">
            <EstadoBadge estado={grupo.puntoCarga} size="sm" />
            <span className="text-[12px] font-semibold uppercase tracking-[0.08em] text-tinta-500">
              punto de carga
            </span>
          </div>
          {grupo.lineas.map((linea) => (
            <FilaHoja key={`${linea.productoId}-${linea.cambio ?? "ok"}`} linea={linea} />
          ))}
        </div>
      ))}
    </div>
  );
}

function FilaHoja({ linea }: { linea: LineaProducto }) {
  return (
    <div
      className={cn(
        "flex min-h-11 items-center gap-3 border-b border-[var(--border-subtle)] px-4 py-3",
        linea.cambio ? "bg-[var(--yellow-100)]" : "bg-blanco",
      )}
    >
      <span className="min-w-0 flex-1 text-sm font-semibold text-tinta-900">
        {linea.nombreCanonico}
      </span>
      {linea.notaProduccion && <Tag>{linea.notaProduccion}</Tag>}
      {linea.cambio === "nuevo" && <Badge tone="amber">nuevo en v2</Badge>}
      {linea.cambio === "ajustado" && <Badge tone="amber">ajustado</Badge>}
      {linea.cambio === "eliminado" && <Badge>eliminado</Badge>}
      <span className="font-display text-xl tabular-nums text-marca">
        {linea.cantidad}
      </span>
      <span className="w-14 text-xs text-tinta-500">
        {UNIDAD_CORTA[linea.unidadMedida]}
      </span>
    </div>
  );
}
