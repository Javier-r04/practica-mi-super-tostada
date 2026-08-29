"use client";

import { Card } from "@heroui/react";
import type { ReactNode } from "react";
import { formatearCentavos, type Tablero } from "@misupertostada/shared";
import { Money } from "@/components/domain/money";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

function scrollToAnchor(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  el.scrollIntoView({ behavior: reduce ? "auto" : "smooth" });
}

/**
 * Misma cifra que en clientes y catálogo: `dl` + `Card`, etiqueta chica y el
 * número grande en tabular. Aquí además lleva al bloque que la explica, con
 * un botón que cubre la tarjeta (el `dl`/`dt`/`dd` se conserva intacto).
 */
function Cifra({
  ancla,
  etiqueta,
  valor,
  nota,
  tono = "neutro",
}: {
  ancla: string;
  etiqueta: string;
  valor: ReactNode;
  nota?: string;
  tono?: "neutro" | "marca" | "aviso" | "peligro";
}) {
  return (
    <Card className="relative gap-1 p-4">
      <dt className="mst-label text-[11px]">{etiqueta}</dt>
      <dd
        className={cn(
          "text-[22px] font-semibold leading-none tabular-nums",
          tono === "peligro"
            ? "text-peligro"
            : tono === "aviso"
              ? "text-aviso-700"
              : tono === "marca"
                ? "text-marca"
                : "text-tinta-900",
        )}
      >
        {valor}
      </dd>
      {nota && <p className="text-[11px] leading-snug text-tinta-500">{nota}</p>}
      <button
        type="button"
        onClick={() => scrollToAnchor(ancla)}
        className="absolute inset-0 rounded-tarjeta transition-shadow duration-control ease-out hover:shadow-tarjeta focus-visible:outline-none focus-visible:shadow-foco"
      >
        <span className="sr-only">Ver el detalle de {etiqueta}</span>
      </button>
    </Card>
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

export function KpiStripSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-5">
      {Array.from({ length: 5 }, (_, i) => (
        <Skeleton key={i} className="h-[92px] w-full rounded-tarjeta" />
      ))}
    </div>
  );
}

export function KpiStrip({ data }: { data: Tablero }) {
  const k = data.kpis;
  const unDia = data.filtrosAplicados.desde === data.filtrosAplicados.hasta;
  const bajaronVentas = k.ventasDeltaPuntosBase < 0;
  return (
    <dl className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-5">
      <Cifra
        ancla="chart-ventas"
        etiqueta="Ventas"
        valor={<Money centavos={k.ventasCentavos} tone="pagado" />}
        nota={deltaTexto(k.ventasDeltaCentavos, k.ventasDeltaPuntosBase)}
        tono={bajaronVentas ? "aviso" : "marca"}
      />
      <Cifra
        ancla="chart-adopcion"
        etiqueta="Pedidos"
        valor={k.pedidos}
        nota={`${k.portal} del portal · ${k.manual} manuales`}
      />
      <Cifra
        ancla="chart-cartera"
        etiqueta="Por cobrar"
        valor={
          data.filtrosAplicados.carteraAplica ? (
            <Money centavos={k.porCobrarCentavos} tone="pendiente" />
          ) : (
            <span className="text-tinta-500">N/A</span>
          )
        }
        nota={
          data.filtrosAplicados.carteraAplica
            ? "Saldo de facturas pendientes"
            : "Cartera no se recorta por producto"
        }
        tono="aviso"
      />
      <Cifra
        ancla="chart-cobrado"
        etiqueta="Cobrado"
        valor={<Money centavos={k.cobradoCentavos} />}
        nota={`Efectivo ${formatearCentavos(k.cobradoEfectivoCentavos)} · Transferencia ${formatearCentavos(k.cobradoTransferenciaCentavos)}`}
      />
      <Cifra
        ancla={unDia ? "chart-sin-pedido" : "chart-clientes"}
        etiqueta={unDia ? "Aún no piden" : "Dejaron de pedir"}
        valor={k.clientesAlertaCount}
        nota={
          unDia
            ? "Activos sin pedido en esta fecha de operación"
            : "Diarios en silencio 3 días hábiles"
        }
        tono={k.clientesAlertaCount > 0 ? "peligro" : "neutro"}
      />
    </dl>
  );
}
