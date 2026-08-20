"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  FAMILIAS,
  FAMILIA_ETIQUETA,
  PEDIDO_ORIGENES,
  PUNTOS_CARGA,
  type ClientePublico,
  type PeriodoTablero,
} from "@misupertostada/shared";
import { Input, Select } from "@/components/ui/field";
import { Button } from "@/components/ui/button";

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

export function FiltrosTableroBarra({
  clientes,
  aplicados,
}: {
  clientes: ClientePublico[];
  aplicados?: { desde: string; hasta: string };
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const f = filtrosDesdeSearch(sp);
  const desdeMostrado = f.desde || aplicados?.desde || "";
  const hastaMostrado = f.hasta || aplicados?.hasta || "";

  function aplicar(next: Partial<FiltrosTablero>) {
    const merged = { ...f, ...next };
    router.replace(`${pathname}${queryDeFiltros(merged)}`);
  }

  function preset(periodo: PeriodoTablero) {
    router.replace(
      `${pathname}${queryDeFiltros({
        ...f,
        periodo,
        desde: "",
        hasta: "",
      })}`,
    );
  }

  return (
    <div className="sticky top-0 z-[var(--z-sticky)] -mx-4 border-b border-[var(--border-subtle)] bg-[var(--surface-page)] px-4 py-3 lg:-mx-6 lg:px-6">
      <div className="mx-auto grid w-full max-w-[var(--page-max)] gap-3">
        <div className="flex flex-wrap gap-1">
          {(
            [
              ["hoy", "Hoy"],
              ["semana", "Semana"],
              ["quincena", "Quincena"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              aria-pressed={f.periodo === id && !f.desde}
              onClick={() => preset(id)}
              className={
                f.periodo === id && !f.desde
                  ? "inline-flex min-h-11 items-center rounded-campo bg-marca px-3 text-sm font-semibold text-blanco"
                  : "inline-flex min-h-11 items-center rounded-campo bg-tinta-50 px-3 text-sm font-semibold text-tinta-800"
              }
            >
              {label}
            </button>
          ))}
          {f.desde && f.hasta && f.periodo === "rango" && (
            <span className="inline-flex min-h-11 items-center rounded-campo bg-tinta-50 px-3 text-sm font-semibold text-tinta-800">
              Rango
            </span>
          )}
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Input
            id="tab-desde"
            label="Desde"
            type="date"
            value={desdeMostrado}
            onChange={(e) =>
              aplicar({
                periodo: "rango",
                desde: e.target.value,
                hasta: f.hasta || aplicados?.hasta || e.target.value,
              })
            }
          />
          <Input
            id="tab-hasta"
            label="Hasta"
            type="date"
            value={hastaMostrado}
            onChange={(e) =>
              aplicar({
                periodo: "rango",
                desde: f.desde || aplicados?.desde || e.target.value,
                hasta: e.target.value,
              })
            }
          />
          <Select
            id="tab-cliente"
            label="Cliente"
            value={f.clienteId}
            onChange={(e) => aplicar({ clienteId: e.target.value })}
          >
            <option value="">Todos</option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </Select>
          <Select
            id="tab-familia"
            label="Familia"
            value={f.familia}
            onChange={(e) => aplicar({ familia: e.target.value })}
          >
            <option value="">Todas</option>
            {FAMILIAS.map((fam) => (
              <option key={fam} value={fam}>
                {FAMILIA_ETIQUETA[fam]}
              </option>
            ))}
          </Select>
          <Select
            id="tab-carga"
            label="Punto de carga"
            value={f.puntoCarga}
            onChange={(e) => aplicar({ puntoCarga: e.target.value })}
          >
            <option value="">Ambos</option>
            {PUNTOS_CARGA.map((p) => (
              <option key={p} value={p}>
                {p === "PLANTA" ? "Planta" : "La Demo"}
              </option>
            ))}
          </Select>
          <Select
            id="tab-origen"
            label="Origen"
            value={f.origen}
            onChange={(e) => aplicar({ origen: e.target.value })}
          >
            <option value="">Todos</option>
            {PEDIDO_ORIGENES.map((o) => (
              <option key={o} value={o}>
                {o === "PORTAL" ? "Portal" : "Manual"}
              </option>
            ))}
          </Select>
          <div className="flex items-end">
            <Button
              variant="ghost"
              className="w-full"
              onClick={() =>
                router.replace(
                  `${pathname}${queryDeFiltros({
                    periodo: "quincena",
                    desde: "",
                    hasta: "",
                    clienteId: "",
                    familia: "",
                    puntoCarga: "",
                    origen: "",
                  })}`,
                )
              }
            >
              Limpiar filtros
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
