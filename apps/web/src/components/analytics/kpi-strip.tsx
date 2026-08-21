"use client";

import { formatearCentavos, type Tablero } from "@misupertostada/shared";
import { Money } from "@/components/domain/money";
import type { ReactNode } from "react";

function Kpi({
  id,
  label,
  hint,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={() =>
        document.getElementById(id)?.scrollIntoView({ behavior: "smooth" })
      }
      className="flex-1 rounded-tarjeta border border-[var(--border-subtle)] bg-blanco p-4 text-left shadow-tarjeta"
    >
      <div className="mst-label">
        {label}
      </div>
      <div className="mt-1.5 font-display text-3xl leading-none text-marca">
        {children}
      </div>
      {hint && <div className="mt-1 text-xs text-tinta-500">{hint}</div>}
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
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <Kpi
        id="chart-ventas"
        label="Ventas"
        hint={deltaTexto(k.ventasDeltaCentavos, k.ventasDeltaPuntosBase)}
      >
        <Money centavos={k.ventasCentavos} />
      </Kpi>
      <Kpi
        id="chart-adopcion"
        label="Pedidos"
        hint={`${k.portal} del portal · ${k.manual} manuales`}
      >
        {k.pedidos}
      </Kpi>
      <Kpi
        id="chart-cartera"
        label="Por cobrar"
        hint={
          data.filtrosAplicados.carteraAplica
            ? "Saldo de facturas pendientes"
            : "Cartera no se recorta por producto"
        }
      >
        {data.filtrosAplicados.carteraAplica ? (
          <Money centavos={k.porCobrarCentavos} />
        ) : (
          <span className="text-tinta-500">N/A</span>
        )}
      </Kpi>
      <Kpi
        id="chart-cobrado"
        label="Cobrado"
        hint={`Efectivo ${formatearCentavos(k.cobradoEfectivoCentavos)} · Transferencia ${formatearCentavos(k.cobradoTransferenciaCentavos)}`}
      >
        <Money centavos={k.cobradoCentavos} />
      </Kpi>
      <Kpi
        id={unDia ? "chart-sin-pedido" : "chart-clientes"}
        label={unDia ? "Aún no piden" : "Dejaron de pedir"}
        hint={
          unDia
            ? "Activos sin pedido en esta fecha de operación"
            : "Diarios en silencio 3 días hábiles"
        }
      >
        {k.clientesAlertaCount}
      </Kpi>
      <Kpi
        id="chart-adopcion"
        label="Adopción portal"
        hint={`${k.portal} portal · ${k.manual} manual`}
      >
        {Math.trunc(k.adopcionPuntosBase / 100)} %
      </Kpi>
    </div>
  );
}
