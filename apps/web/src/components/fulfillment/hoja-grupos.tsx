"use client";

import { Button, Chip, Disclosure } from "@heroui/react";
import { ChevronDown } from "lucide-react";
import {
  FAMILIA_ETIQUETA,
  UNIDAD_CORTA,
  desgloseProductoConNotas,
  type BloqueCliente,
  type ClienteDeProducto,
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
    <div className="hoja-grupos">
      {grupos.map((grupo) => {
        /* En «Solo cambios» la hoja está recortada: sumar lo visible daría un
           subtotal que no es el de la familia. Ahí solo se cuentan renglones. */
        const subtotal = soloCambios ? null : subtotalDe(grupo.lineas);
        return (
          <section key={grupo.familia}>
            <h3 className="sticky top-0 z-[1] flex items-baseline justify-between gap-2 border-y border-[var(--border-subtle)] bg-[var(--ink-50)] px-4 py-2.5 mst-label first:border-t-0 sm:px-5">
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

/** Especiales primero: Alex los busca al abrir. Luego nombre. */
function ordenDesglose(
  desglose: readonly ClienteDeProducto[],
): ClienteDeProducto[] {
  return [...desglose].sort((a, b) => {
    const ae = Boolean(a.notaProduccion);
    const be = Boolean(b.notaProduccion);
    if (ae !== be) return ae ? -1 : 1;
    return a.nombre.localeCompare(b.nombre, "es");
  });
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
  const desglose = ordenDesglose(desgloseProductoConNotas(linea, clientes));
  const conEspeciales = desglose.some((c) => Boolean(c.notaProduccion));
  const nEspeciales = desglose.filter((c) => c.notaProduccion).length;
  const puedeDesplegar = desglose.length > 0;

  const meta = (
    <div className="flex min-w-0 flex-wrap items-center gap-1.5">
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
      {conEspeciales && (
        <Chip color="warning" size="sm" variant="soft">
          {nEspeciales === 1
            ? "1 especial"
            : `${nEspeciales} especiales`}
        </Chip>
      )}
    </div>
  );

  const cantidad = (
    <div className="flex shrink-0 items-baseline justify-end gap-1.5 tabular-nums">
      <span
        aria-label={delta ? `${delta.de} antes, ${delta.a} ahora` : undefined}
        className={cn(
          "font-display text-2xl leading-none text-marca",
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
      <span className="w-8 text-xs text-tinta-500 sm:w-10">
        {UNIDAD_CORTA[linea.unidadMedida]}
      </span>
    </div>
  );

  if (!puedeDesplegar) {
    return (
      <li
        className={cn(
          "border-b border-[var(--border-subtle)] last:border-b-0",
          linea.cambio ? "bg-[var(--amber-100)]/50" : "bg-blanco",
          eliminado && "opacity-70",
        )}
      >
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 px-4 py-3 sm:px-5">
          <div className="min-w-0 space-y-1.5">
            <p
              className={cn(
                "text-sm font-semibold text-pretty text-tinta-900",
                eliminado && "line-through",
              )}
            >
              {linea.nombreCanonico}
            </p>
            {meta}
          </div>
          {cantidad}
        </div>
      </li>
    );
  }

  return (
    <li
      className={cn(
        "border-b border-[var(--border-subtle)] last:border-b-0",
        linea.cambio ? "bg-[var(--amber-100)]/50" : "bg-blanco",
        eliminado && "opacity-70",
      )}
    >
      <Disclosure>
        {({ isExpanded }) => (
          <>
            <Disclosure.Heading>
              <Button
                aria-label={
                  isExpanded
                    ? `Ocultar clientes de ${linea.nombreCanonico}`
                    : `Ver clientes de ${linea.nombreCanonico}`
                }
                className={cn(
                  "grid h-auto w-full grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-2.5 rounded-none px-4 py-3 text-left sm:gap-3 sm:px-5",
                  "transition-colors duration-[var(--dur-fast)] ease-[var(--ease-out)]",
                  "hover:bg-[var(--ink-50)]/80 data-[pressed]:bg-[var(--ink-50)]",
                )}
                slot="trigger"
                variant="ghost"
              >
                <span
                  aria-hidden
                  className={cn(
                    "mt-0.5 grid size-7 shrink-0 place-items-center rounded-campo bg-[var(--ink-50)] text-tinta-600",
                    "transition-transform duration-[var(--dur-normal)] ease-[var(--ease-out)]",
                    isExpanded && "rotate-180 bg-[var(--ink-100)]",
                  )}
                >
                  <ChevronDown size={16} strokeWidth={2.25} />
                </span>
                <span className="min-w-0 space-y-1.5">
                  <span className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
                    <span
                      className={cn(
                        "text-sm font-semibold text-pretty text-tinta-900",
                        eliminado && "line-through",
                      )}
                    >
                      {linea.nombreCanonico}
                    </span>
                    <span className="text-xs tabular-nums text-tinta-500">
                      {desglose.length === 1
                        ? "1 cliente"
                        : `${desglose.length} clientes`}
                    </span>
                  </span>
                  {meta}
                </span>
                {cantidad}
              </Button>
            </Disclosure.Heading>
            <Disclosure.Content>
              <Disclosure.Body>
                <DesgloseClientes desglose={desglose} />
              </Disclosure.Body>
            </Disclosure.Content>
          </>
        )}
      </Disclosure>
    </li>
  );
}

function DesgloseClientes({
  desglose,
}: {
  desglose: readonly ClienteDeProducto[];
}) {
  const especiales = desglose.filter((c) => c.notaProduccion);
  const normales = desglose.filter((c) => !c.notaProduccion);

  return (
    <div className="border-t border-[var(--border-subtle)] bg-[var(--ink-50)]/70 px-3 py-2.5 sm:px-4">
      <div className="grid gap-2">
        {especiales.length > 0 ? (
          <ul className="grid gap-1.5" aria-label="Clientes con nota especial">
            {especiales.map((cliente, i) => (
              <li
                key={`esp-${cliente.nombre}-${i}`}
                className="rounded-campo border border-[var(--yellow-400)]/50 border-l-[3px] border-l-[var(--yellow-400)] bg-[var(--yellow-100)] px-3 py-2"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <p className="min-w-0 flex-1 text-sm font-semibold text-pretty text-[var(--amber-700)]">
                    {cliente.nombre}
                  </p>
                  <p className="shrink-0 text-sm font-semibold tabular-nums text-[var(--amber-700)]">
                    {cliente.cantidad} {UNIDAD_CORTA[cliente.unidadMedida]}
                  </p>
                </div>
                <p className="mt-0.5 text-[11px] font-semibold leading-snug text-pretty text-[var(--amber-700)]">
                  {cliente.notaProduccion}
                </p>
              </li>
            ))}
          </ul>
        ) : null}

        {normales.length > 0 ? (
          <ul
            className={cn(
              "grid gap-0 overflow-hidden rounded-campo border border-[var(--border-subtle)] bg-blanco",
              especiales.length > 0 && "mt-0.5",
            )}
            aria-label="Resto de clientes"
          >
            {normales.map((cliente, i) => (
              <li
                key={`ok-${cliente.nombre}-${i}`}
                className="flex items-baseline justify-between gap-3 border-b border-[var(--border-subtle)] px-3 py-2 last:border-b-0"
              >
                <p className="min-w-0 flex-1 text-sm font-medium text-pretty text-tinta-900">
                  {cliente.nombre}
                </p>
                <p className="shrink-0 text-sm tabular-nums text-tinta-700">
                  {cliente.cantidad} {UNIDAD_CORTA[cliente.unidadMedida]}
                </p>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
