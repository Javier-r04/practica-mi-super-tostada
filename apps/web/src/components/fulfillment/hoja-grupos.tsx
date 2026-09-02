"use client";

import { Chip } from "@heroui/react";
import {
  FAMILIA_ETIQUETA,
  UNIDAD_CORTA,
  gruposNotaProduccion,
  textoClienteNota,
  type BloqueCliente,
  type LineaProducto,
  type NotaProduccionGrupo,
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
  clientes,
  soloCambios,
}: {
  lineas: LineaProducto[];
  clientes?: readonly BloqueCliente[];
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
                  clientes={clientes}
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

function FilaHoja({
  linea,
  clientes,
}: {
  linea: LineaProducto;
  clientes?: readonly BloqueCliente[];
}) {
  const delta = deltaCantidad(linea);
  const eliminado = linea.cambio === "eliminado";
  const notas = gruposNotaProduccion(linea, clientes);

  return (
    <li
      className={cn(
        "border-b border-[var(--border-subtle)] px-4 py-2.5 last:border-b-0 sm:px-5",
        linea.cambio ? "bg-[var(--amber-100)]/60" : "bg-blanco",
        eliminado && "opacity-70",
      )}
    >
      <div className="flex flex-wrap items-start gap-2 sm:items-start sm:gap-3">
        <p
          className={cn(
            "min-w-0 flex-1 basis-full text-sm font-semibold text-pretty text-tinta-900 sm:basis-auto",
            eliminado && "line-through",
          )}
        >
          {linea.nombreCanonico}
        </p>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
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
            aria-label={
              delta ? `${delta.de} antes, ${delta.a} ahora` : undefined
            }
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
          <span className="w-10 shrink-0 text-xs text-tinta-500 sm:w-14">
            {UNIDAD_CORTA[linea.unidadMedida]}
          </span>
        </div>
      </div>
      <NotasProduccion grupos={notas} />
    </li>
  );
}

/** Notas de producción: bloque amarillo que envuelve. Nunca un Chip de una línea. */
function NotasProduccion({ grupos }: { grupos: NotaProduccionGrupo[] }) {
  if (grupos.length === 0) return null;
  return (
    <ul className="mt-1.5 grid min-w-0 gap-1.5">
      {grupos.map((grupo) => (
        <li
          key={grupo.nota}
          className="rounded-campo border border-[var(--yellow-400)]/45 border-l-[3px] border-l-[var(--yellow-400)] bg-[var(--yellow-100)] px-2.5 py-1.5"
        >
          <p className="text-[11px] font-semibold leading-snug text-pretty text-[var(--amber-700)]">
            {grupo.nota}
          </p>
          {grupo.clientes.length > 0 ? (
            <ul className="mt-1 flex flex-wrap gap-1">
              {grupo.clientes.map((cliente, i) => (
                <li
                  key={`${cliente.nombre}-${i}`}
                  className="max-w-full rounded-pill bg-[var(--yellow-200)] px-2 py-0.5 text-xs leading-snug text-pretty break-words tabular-nums text-[var(--amber-700)]"
                >
                  {textoClienteNota(cliente)}
                </li>
              ))}
            </ul>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
