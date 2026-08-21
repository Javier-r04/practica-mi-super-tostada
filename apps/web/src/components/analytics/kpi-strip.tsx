"use client";

import { formatearCentavos, type Tablero } from "@misupertostada/shared";
import { Money } from "@/components/domain/money";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

function scrollToAnchor(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  el.scrollIntoView({ behavior: reduce ? "auto" : "smooth" });
}

function MetricKpi({
  id,
  label,
  hint,
  brand,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  brand?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={() => scrollToAnchor(id)}
      className={cn(
        "flex-1 rounded-tarjeta border p-4 text-left shadow-tarjeta",
        "transition-[box-shadow] duration-control ease-out",
        "focus-visible:outline-none focus-visible:shadow-foco",
        brand
          ? "border-[var(--green-900)] bg-[var(--surface-brand)] text-[var(--text-on-brand)]"
          : "border-[var(--border-subtle)] bg-blanco",
      )}
    >
      <div
        className={cn(
          "mst-label",
          brand && "text-[var(--green-200)]",
        )}
      >
        {label}
      </div>
      <div
        className={cn(
          "mt-1.5 font-display text-3xl leading-none tabular-nums",
          brand ? "text-[var(--yellow-400)]" : "text-marca",
        )}
      >
        {children}
      </div>
      {hint && (
        <div
          className={cn(
            "mt-1 text-xs",
            brand ? "text-[var(--green-200)]" : "text-tinta-500",
          )}
        >
          {hint}
        </div>
      )}
    </button>
  );
}

function pctDePuntosBase(puntosBase: number): string {
  const signo = puntosBase < 0 ? "−" : "";
  const abs = Math.abs(puntosBase);
  const entero = Math.trunc(abs / 100);
  const dec = Math.trunc((abs % 100) / 10);
  return `${signo}${entero}.${dec}`;
}

function deltaTexto(centavos: number, puntosBase: number): string {
  const signoQ = centavos > 0 ? "+" : "";
  const signoPct = puntosBase > 0 ? "+" : "";
  return `${signoQ}${formatearCentavos(centavos)} · ${signoPct}${pctDePuntosBase(puntosBase)} % vs anterior`;
}

export function KpiStrip({ data }: { data: Tablero }) {
  const k = data.kpis;
  const unDia = data.filtrosAplicados.desde === data.filtrosAplicados.hasta;
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      <MetricKpi
        id="chart-ventas"
        label="Ventas"
        hint={deltaTexto(k.ventasDeltaCentavos, k.ventasDeltaPuntosBase)}
        brand={!unDia}
      >
        <Money
          centavos={k.ventasCentavos}
          className={!unDia ? "text-[var(--yellow-400)]" : undefined}
        />
      </MetricKpi>
      <MetricKpi
        id="chart-adopcion"
        label="Pedidos"
        hint={`${k.portal} del portal · ${k.manual} manuales`}
      >
        {k.pedidos}
      </MetricKpi>
      <MetricKpi
        id="chart-cartera"
        label="Por cobrar"
        hint={
          data.filtrosAplicados.carteraAplica
            ? "Saldo de facturas pendientes"
            : "Cartera no se recorta por producto"
        }
        brand={unDia && data.filtrosAplicados.carteraAplica}
      >
        {data.filtrosAplicados.carteraAplica ? (
          <Money
            centavos={k.porCobrarCentavos}
            className={
              unDia && data.filtrosAplicados.carteraAplica
                ? "text-[var(--yellow-400)]"
                : undefined
            }
          />
        ) : (
          <span className={unDia ? undefined : "text-tinta-500"}>N/A</span>
        )}
      </MetricKpi>
      <MetricKpi
        id="chart-cobrado"
        label="Cobrado"
        hint={`Efectivo ${formatearCentavos(k.cobradoEfectivoCentavos)} · Transferencia ${formatearCentavos(k.cobradoTransferenciaCentavos)}`}
      >
        <Money centavos={k.cobradoCentavos} />
      </MetricKpi>
      <MetricKpi
        id={unDia ? "chart-sin-pedido" : "chart-clientes"}
        label={unDia ? "Aún no piden" : "Dejaron de pedir"}
        hint={
          unDia
            ? "Activos sin pedido en esta fecha de operación"
            : "Diarios en silencio 3 días hábiles"
        }
      >
        {k.clientesAlertaCount}
      </MetricKpi>
    </div>
  );
}
