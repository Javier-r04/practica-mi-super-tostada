"use client";

import { startTransition, useCallback, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Filter } from "lucide-react";
import {
  FAMILIAS,
  FAMILIA_ETIQUETA,
  PEDIDO_ORIGENES,
  PUNTOS_CARGA,
  type ClientePublico,
  type PeriodoTablero,
} from "@misupertostada/shared";
import { DateField } from "@/components/ui/date-field";
import { Droplist } from "@/components/ui/droplist";
import { Button } from "@/components/ui/button";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { cn } from "@/lib/utils";

export type FiltrosTablero = {
  periodo: PeriodoTablero;
  desde: string;
  hasta: string;
  clienteId: string;
  familia: string;
  puntoCarga: string;
  origen: string;
};

const PERIODOS_UI = [
  { id: "hoy", label: "Hoy" },
  { id: "semana", label: "Semana" },
  { id: "quincena", label: "Quincena" },
] as const;

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

export function filtrosDesdeSearch(sp: URLSearchParams): FiltrosTablero {
  const periodo = (sp.get("periodo") ?? "quincena") as PeriodoTablero;
  return {
    periodo:
      periodo === "hoy" || periodo === "semana" || periodo === "rango"
        ? periodo
        : "quincena",
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
  return [
    value.clienteId,
    value.familia,
    value.puntoCarga,
    value.origen,
    value.periodo === "rango" ? value.desde || value.hasta : "",
  ].filter(Boolean).length;
}

export function FiltrosTableroBarra({
  clientes,
  aplicados,
  value,
  onChange,
}: {
  clientes: ClientePublico[];
  /** Rango resuelto por el servidor (solo con datos del filtro actual). */
  aplicados?: { desde: string; hasta: string };
  value: FiltrosTablero;
  onChange: (next: FiltrosTablero) => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const extras = conteoFiltrosExtra(value);
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(extras > 0);

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

  function preset(periodo: "hoy" | "semana" | "quincena") {
    aplicar({ periodo, desde: "", hasta: "" });
  }

  const enRango = value.periodo === "rango" && Boolean(value.desde && value.hasta);
  const periodoUi: "hoy" | "semana" | "quincena" =
    value.periodo === "hoy" || value.periodo === "semana"
      ? value.periodo
      : "quincena";
  const desdeMostrado = value.desde || (!enRango ? aplicados?.desde : "") || "";
  const hastaMostrado = value.hasta || (!enRango ? aplicados?.hasta : "") || "";

  return (
    <div
      className={cn(
        "sticky top-0 z-[var(--z-sticky)] -mx-4 border-b border-[var(--border-subtle)] bg-[var(--surface-page)] px-4 py-3 lg:-mx-6 lg:px-6",
      )}
    >
      <div className="mx-auto flex w-full max-w-[var(--page-max)] flex-wrap items-center gap-2">
        <SegmentedControl
          label="Periodo del tablero"
          value={periodoUi}
          onChange={preset}
          options={PERIODOS_UI}
        />
        {enRango && (
          <span className="inline-flex min-h-10 items-center rounded-pill bg-[var(--ink-100)] px-3 text-sm font-semibold text-tinta-800">
            Rango
          </span>
        )}
        <Button
          size="sm"
          variant={filtrosAbiertos || extras > 0 ? "secondary" : "ghost"}
          className="shrink-0"
          aria-expanded={filtrosAbiertos}
          onClick={() => setFiltrosAbiertos((v) => !v)}
        >
          <Filter size={15} aria-hidden />
          Filtros
          {extras > 0 ? (
            <span className="tabular-nums">{extras}</span>
          ) : null}
        </Button>
      </div>

      {filtrosAbiertos && (
        <div className="mx-auto mt-3 grid w-full max-w-[var(--page-max)] gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <DateField
            id="tab-desde"
            label="Desde"
            value={desdeMostrado}
            onChange={(desde) =>
              aplicar({
                periodo: "rango",
                desde,
                hasta: value.hasta || aplicados?.hasta || desde,
              })
            }
          />
          <DateField
            id="tab-hasta"
            label="Hasta"
            value={hastaMostrado}
            onChange={(hasta) =>
              aplicar({
                periodo: "rango",
                desde: value.desde || aplicados?.desde || hasta,
                hasta,
              })
            }
          />
          <Droplist
            id="tab-cliente"
            label="Cliente"
            value={value.clienteId}
            onChange={(clienteId) => aplicar({ clienteId })}
            searchable
            searchPlaceholder="Buscar restaurante"
            options={[
              { value: "", label: "Todos" },
              ...clientes.map((c) => ({ value: c.id, label: c.nombre })),
            ]}
          />
          <Droplist
            id="tab-familia"
            label="Familia"
            value={value.familia}
            onChange={(familia) => aplicar({ familia })}
            options={[
              { value: "", label: "Todas" },
              ...FAMILIAS.map((fam) => ({
                value: fam,
                label: FAMILIA_ETIQUETA[fam],
              })),
            ]}
          />
          <Droplist
            id="tab-carga"
            label="Punto de carga"
            value={value.puntoCarga}
            onChange={(puntoCarga) => aplicar({ puntoCarga })}
            options={[
              { value: "", label: "Ambos" },
              ...PUNTOS_CARGA.map((p) => ({
                value: p,
                label: p === "PLANTA" ? "Planta" : "La Demo",
              })),
            ]}
          />
          <Droplist
            id="tab-origen"
            label="Origen"
            value={value.origen}
            onChange={(origen) => aplicar({ origen })}
            options={[
              { value: "", label: "Todos" },
              ...PEDIDO_ORIGENES.map((o) => ({
                value: o,
                label: o === "PORTAL" ? "Portal" : "Manual",
              })),
            ]}
          />
          <div className="flex items-end sm:col-span-2 lg:col-span-2">
            <Button
              variant="ghost"
              className="w-full"
              onClick={() =>
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
      )}
    </div>
  );
}
