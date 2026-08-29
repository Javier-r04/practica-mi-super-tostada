"use client";

import { Chip } from "@heroui/react";
import {
  FAMILIA_ETIQUETA,
  UNIDAD_CORTA,
  type LineaProducto,
  type UnidadMedida,
} from "@misupertostada/shared";
import { EstadoBadge } from "@/components/domain/estado-badge";
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
        No hay cambios respecto a la hoja anterior.
      </p>
    );
  }

  return (
    <div>
      {grupos.map((grupo) => {
        /* En «Solo cambios» la hoja está recortada: sumar lo visible daría un
           subtotal que no es el de la familia. Ahí solo se cuentan renglones. */
        const subtotal = soloCambios ? null : subtotalDe(grupo.lineas);
        return (
          <section key={grupo.familia}>
            <h3 className="sticky top-0 z-[1] flex items-baseline justify-between gap-2 border-y border-[var(--border-subtle)] bg-[var(--ink-50)] px-4 py-2 mst-label first:border-t-0 sm:px-5">
              <span>{FAMILIA_ETIQUETA[grupo.familia]}</span>
              {subtotal ? (
                <span className="flex items-baseline gap-1.5">
                  <span className="text-tinta-400 tabular-nums">
                    {grupo.lineas.length}
                  </span>
                  <span className="text-tinta-400" aria-hidden>
                    ·
                  </span>
                  <span className="font-display text-base leading-none tabular-nums text-tinta-900">
                    {subtotal.cantidad}
                  </span>
                  <span className="text-tinta-500">
                    {UNIDAD_CORTA[subtotal.unidad]}
                  </span>
                </span>
              ) : (
                <span className="tabular-nums text-tinta-400">
                  {grupo.lineas.length}
                </span>
              )}
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
        );
      })}
    </div>
  );
}

/** Suma de la familia sin los eliminados: es lo que de verdad hay que producir. */
function subtotalDe(
  lineas: readonly LineaProducto[],
): { cantidad: number; unidad: UnidadMedida } | null {
  const cuentan = lineas.filter((l) => l.cambio !== "eliminado");
  if (cuentan.length === 0) return null;
  const unidades = new Set(cuentan.map((l) => l.unidadMedida));
  if (unidades.size !== 1) return null; // mezclar libras con unidades no suma
  return {
    cantidad: cuentan.reduce((acc, l) => acc + l.cantidad, 0),
    unidad: cuentan[0]!.unidadMedida,
  };
}

function FilaHoja({ linea }: { linea: LineaProducto }) {
  const delta = deltaCantidad(linea);
  const eliminado = linea.cambio === "eliminado";

  return (
    <li
      className={cn(
        "flex min-h-fila items-center gap-2 border-b border-[var(--border-subtle)] px-4 py-2 last:border-b-0 sm:gap-3 sm:px-5",
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
      {linea.notaProduccion && (
        <Chip color="success" size="sm" variant="soft">
          {linea.notaProduccion}
        </Chip>
      )}
      <EstadoBadge estado={linea.puntoCargaEfectivo} size="sm" />
      {linea.cambio === "nuevo" && (
        <Chip color="warning" size="sm" variant="soft">
          nuevo
        </Chip>
      )}
      {linea.cambio === "ajustado" && !delta && (
        <Chip color="warning" size="sm" variant="soft">
          ajustado
        </Chip>
      )}
      {eliminado && (
        <Chip color="warning" size="sm" variant="soft">
          eliminado
        </Chip>
      )}
      <span
        aria-label={delta ? `${delta.de} antes, ${delta.a} ahora` : undefined}
        className={cn(
          "shrink-0 font-display text-2xl leading-none tabular-nums text-marca",
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
