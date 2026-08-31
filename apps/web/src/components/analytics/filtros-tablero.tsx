"use client";

import { startTransition, useCallback, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  Button,
  ToggleButton,
  ToggleButtonGroup,
} from "@heroui/react";
import { Filter, X } from "lucide-react";
import {
  FAMILIAS,
  FAMILIA_ETIQUETA,
  PEDIDO_ORIGENES,
  PUNTOS_CARGA,
  type CalendarioAhora,
  type ClientePublico,
  type PeriodoTablero,
} from "@misupertostada/shared";
import { api } from "@/lib/api";
import { DateField } from "@/components/ui/date-field";
import { Droplist, DroplistGroup } from "@/components/ui/droplist";
import {
  etiquetaRangoCorto,
  hoyCivilIso,
  rangoUiDePreset,
} from "@/lib/fecha-ui";

export type FiltrosTablero = {
  periodo: PeriodoTablero;
  desde: string;
  hasta: string;
  clienteId: string;
  familia: string;
  puntoCarga: string;
  origen: string;
};

export function queryDeFiltros(f: FiltrosTablero): string {
  const s = new URLSearchParams();
  if (f.periodo) s.set("periodo", f.periodo);
  if (f.desde) s.set("desde", f.desde);
  if (f.hasta) s.set("hasta", f.hasta);
  if (f.clienteId) s.set("clienteId", f.clienteId);
  if (f.familia) s.set("familia", f.familia);
  if (f.puntoCarga) s.set("puntoCarga", f.puntoCarga);
  if (f.origen) s.set("origen", f.origen);
  const out = s.toString();
  return out ? `?${out}` : "";
}

export function filtrosDesdeSearch(
  sp: URLSearchParams,
  now?: Date,
): FiltrosTablero {
  const periodo = (sp.get("periodo") ?? "quincena") as PeriodoTablero;
  const resuelto: PeriodoTablero =
    periodo === "hoy" ||
    periodo === "semana" ||
    periodo === "mes" ||
    periodo === "rango"
      ? periodo
      : "quincena";
  if (resuelto !== "rango") {
    const ancla = hoyCivilIso(now);
    const rango = rangoUiDePreset(resuelto, ancla, now);
    return {
      periodo: resuelto,
      desde: rango?.desde ?? ancla,
      hasta: rango?.hasta ?? ancla,
      clienteId: sp.get("clienteId") ?? "",
      familia: sp.get("familia") ?? "",
      puntoCarga: sp.get("puntoCarga") ?? "",
      origen: sp.get("origen") ?? "",
    };
  }
  return {
    periodo: resuelto,
    desde: sp.get("desde") ?? "",
    hasta: sp.get("hasta") ?? "",
    clienteId: sp.get("clienteId") ?? "",
    familia: sp.get("familia") ?? "",
    puntoCarga: sp.get("puntoCarga") ?? "",
    origen: sp.get("origen") ?? "",
  };
}

export function mismosFiltros(a: FiltrosTablero, b: FiltrosTablero): boolean {
  return (
    a.periodo === b.periodo &&
    a.desde === b.desde &&
    a.hasta === b.hasta &&
    a.clienteId === b.clienteId &&
    a.familia === b.familia &&
    a.puntoCarga === b.puntoCarga &&
    a.origen === b.origen
  );
}

function conteoFiltrosExtra(value: FiltrosTablero): number {
  return [value.clienteId, value.familia, value.puntoCarga, value.origen].filter(
    Boolean,
  ).length;
}

/** El recorte de tiempo, en el orden en que Cristian lo pide. */
const PERIODOS = [
  { id: "hoy", label: "Hoy" },
  { id: "semana", label: "Semana" },
  { id: "quincena", label: "Quincena" },
  { id: "mes", label: "Mes" },
  { id: "rango", label: "Personalizado" },
] as const satisfies readonly { id: PeriodoTablero; label: string }[];

type ChipFiltro = {
  clave: string;
  etiqueta: string;
  texto: string;
  /** Qué aplicar al quitarlo. */
  limpiar: Partial<FiltrosTablero>;
};

/**
 * Filtros activos legibles sin abrir el panel: con el panel cerrado, el único
 * rastro de un recorte era el contador del botón, y una cifra rara se leía
 * como dato malo en vez de como filtro puesto.
 */
function chipsDeFiltros(
  value: FiltrosTablero,
  clientes: ClientePublico[],
): ChipFiltro[] {
  const chips: ChipFiltro[] = [];
  if (value.clienteId) {
    const nombre = clientes.find((c) => c.id === value.clienteId)?.nombre;
    chips.push({
      clave: "clienteId",
      etiqueta: "Cliente",
      texto: nombre ?? "Cliente",
      limpiar: { clienteId: "" },
    });
  }
  if (value.familia) {
    chips.push({
      clave: "familia",
      etiqueta: "Familia",
      texto:
        FAMILIA_ETIQUETA[value.familia as keyof typeof FAMILIA_ETIQUETA] ??
        value.familia,
      limpiar: { familia: "" },
    });
  }
  if (value.puntoCarga) {
    chips.push({
      clave: "puntoCarga",
      etiqueta: "Punto de carga",
      texto: value.puntoCarga === "PLANTA" ? "Planta" : "La Demo",
      limpiar: { puntoCarga: "" },
    });
  }
  if (value.origen) {
    chips.push({
      clave: "origen",
      etiqueta: "Origen",
      texto: value.origen === "PORTAL" ? "Portal" : "Manual",
      limpiar: { origen: "" },
    });
  }
  return chips;
}

/** Select corto de un solo valor, con «todos» como primera opción. */
function SelectFiltro({
  label,
  value,
  onChange,
  todosLabel,
  opciones,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  todosLabel: string;
  opciones: { value: string; label: string }[];
}) {
  return (
    <Droplist
      label={label}
      value={value}
      onChange={onChange}
      placeholder={todosLabel}
      options={[{ value: "", label: todosLabel }, ...opciones]}
    />
  );
}

export function FiltrosTableroBarra({
  clientes,
  aplicados,
  value,
  onChange,
  acciones,
}: {
  clientes: ClientePublico[];
  /** Rango resuelto por el servidor (solo con datos del filtro actual). */
  aplicados?: { desde: string; hasta: string };
  value: FiltrosTablero;
  onChange: (next: FiltrosTablero) => void;
  /** Acciones de la página (exportar), en la misma línea que el periodo. */
  acciones?: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const extras = conteoFiltrosExtra(value);
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(extras > 0);
  const calendario = useQuery({
    queryKey: ["calendario", "ahora"],
    queryFn: () => api<CalendarioAhora>("/calendario/ahora"),
  });
  // El tablero recorta por día de CALENDARIO, igual que `resolverRangoTablero` en el
  // servidor. Usar la fecha de operación aquí desalineaba el rango que se
  // muestra del que realmente se consulta.
  const fechaHoy = calendario.data?.hoyCivil;

  const syncUrl = useCallback(
    (next: FiltrosTablero) => {
      const href = `${pathname}${queryDeFiltros(next)}`;
      startTransition(() => {
        router.replace(href, { scroll: false });
      });
    },
    [pathname, router],
  );

  function aplicar(partial: Partial<FiltrosTablero>) {
    const next = { ...value, ...partial };
    onChange(next);
    syncUrl(next);
  }

  const enPersonalizado = value.periodo === "rango";
  const desdeMostrado =
    (enPersonalizado ? value.desde : value.desde || aplicados?.desde) || "";
  const hastaMostrado =
    (enPersonalizado ? value.hasta : value.hasta || aplicados?.hasta) || "";

  /** El preset resuelve su propio rango; «personalizado» lo elige el calendario. */
  function elegirPeriodo(periodo: PeriodoTablero) {
    if (periodo === "rango") {
      aplicar({
        periodo: "rango",
        desde: desdeMostrado,
        hasta: hastaMostrado,
      });
      return;
    }
    const ancla = fechaHoy ?? hoyCivilIso();
    const rango = rangoUiDePreset(periodo, ancla);
    aplicar({
      periodo,
      desde: rango?.desde ?? ancla,
      hasta: rango?.hasta ?? ancla,
    });
  }

  const chips = chipsDeFiltros(value, clientes);

  return (
    <div className="grid gap-2">
      {/*
        Una sola línea: periodo, filtros y las acciones de la página. El botón
        de exportar vivía en el cuerpo, una banda vacía abajo del filtro que no
        se alineaba con nada; junto al periodo queda claro qué recorte baja.
      */}
      <div className="flex flex-wrap items-center gap-2">
        <ToggleButtonGroup
          className="mst-segmento-activo"
          isDetached
          aria-label="Periodo del tablero"
          disallowEmptySelection
          selectedKeys={new Set([value.periodo])}
          selectionMode="single"
          size="sm"
          onSelectionChange={(keys) => {
            const next = [...keys][0];
            if (typeof next === "string") elegirPeriodo(next as PeriodoTablero);
          }}
        >
          {PERIODOS.map((p) => (
            <ToggleButton key={p.id} id={p.id}>
              {p.label}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>

        {enPersonalizado ? (
          <div className="min-w-[13rem] flex-1 sm:max-w-[18rem] [&_.mst-control]:h-9 [&_.mst-control]:md:h-8">
            <DateField
              id="tab-rango"
              value={desdeMostrado}
              rangeEnd={hastaMostrado || undefined}
              ancla={desdeMostrado || hastaMostrado || aplicados?.hasta}
              fechaHoy={fechaHoy}
              presets={false}
              clearable={false}
              onChange={(iso) =>
                aplicar({
                  periodo: "rango",
                  desde: iso,
                  hasta: iso,
                })
              }
              onRangeChange={(rango) =>
                aplicar({
                  periodo: "rango",
                  desde: rango.desde,
                  hasta: rango.hasta,
                })
              }
            />
          </div>
        ) : desdeMostrado && hastaMostrado ? (
          <p className="mst-label tabular-nums" aria-live="polite">
            {etiquetaRangoCorto(desdeMostrado, hastaMostrado)}
          </p>
        ) : null}

        <Button
          className="shrink-0"
          variant={filtrosAbiertos || extras > 0 ? "secondary" : "ghost"}
          aria-expanded={filtrosAbiertos}
          aria-controls="tab-filtros-panel"
          onPress={() => setFiltrosAbiertos((v) => !v)}
        >
          <Filter size={15} aria-hidden />
          Filtros
          {extras > 0 ? (
            <span className="grid size-5 place-items-center rounded-full bg-marca text-[11px] tabular-nums text-blanco">
              {extras}
            </span>
          ) : null}
        </Button>
        {acciones ? (
          <div className="flex flex-1 flex-wrap items-center justify-end gap-2">
            {acciones}
          </div>
        ) : null}
      </div>

      {/*
        El tablero es el único módulo que corta por día de calendario: sus KPI
        mezclan operaciones (ventas) con caja (pagos), y la caja solo
        existe en el eje de calendario. Decirlo evita leer «21 ago» como operación.
      */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <p className="mst-label">
          Días de calendario en Guatemala, no operaciones
        </p>
        {chips.length > 0 ? (
          <>
            <span className="text-tinta-500" aria-hidden>
              ·
            </span>
            {chips.map((chip) => (
              <button
                key={chip.clave}
                type="button"
                onClick={() => aplicar(chip.limpiar)}
                className="inline-flex min-h-9 items-center gap-1 rounded-pill border border-[var(--border-subtle)] bg-blanco py-0.5 pl-2 pr-1.5 text-xs font-semibold text-tinta-800 transition-colors duration-control ease-out hover:border-[var(--border-strong)] hover:bg-tinta-50 focus-visible:outline-none focus-visible:shadow-foco"
              >
                <span className="text-tinta-500">{chip.etiqueta}</span>
                {chip.texto}
                <X size={13} aria-hidden />
                <span className="sr-only">Quitar filtro</span>
              </button>
            ))}
          </>
        ) : null}
      </div>

      {filtrosAbiertos ? (
        <div
          id="tab-filtros-panel"
          className="mt-1 rounded-tarjeta border border-[var(--border-subtle)] bg-blanco p-3"
        >
          <DroplistGroup>
            <Droplist
              label="Cliente"
              searchable
              searchPlaceholder="Buscar restaurante"
              value={value.clienteId}
              onChange={(clienteId) => aplicar({ clienteId })}
              placeholder="Todos"
              options={[
                { value: "", label: "Todos" },
                ...clientes.map((c) => ({ value: c.id, label: c.nombre })),
              ]}
            />

            <SelectFiltro
              label="Familia"
              value={value.familia}
              onChange={(familia) => aplicar({ familia })}
              todosLabel="Todas"
              opciones={FAMILIAS.map((fam) => ({
                value: fam,
                label: FAMILIA_ETIQUETA[fam],
              }))}
            />
            <SelectFiltro
              label="Punto de carga"
              value={value.puntoCarga}
              onChange={(puntoCarga) => aplicar({ puntoCarga })}
              todosLabel="Ambos"
              opciones={PUNTOS_CARGA.map((p) => ({
                value: p,
                label: p === "PLANTA" ? "Planta" : "La Demo",
              }))}
            />
            <SelectFiltro
              label="Origen"
              value={value.origen}
              onChange={(origen) => aplicar({ origen })}
              todosLabel="Todos"
              opciones={PEDIDO_ORIGENES.map((o) => ({
                value: o,
                label: o === "PORTAL" ? "Portal" : "Manual",
              }))}
            />
          </DroplistGroup>
          <div className="mt-3 flex items-end">
            <Button
              className="w-full sm:w-auto"
              variant="ghost"
              onPress={() =>
                aplicar({
                  periodo: "quincena",
                  desde: "",
                  hasta: "",
                  clienteId: "",
                  familia: "",
                  puntoCarga: "",
                  origen: "",
                })
              }
            >
              Limpiar filtros
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
