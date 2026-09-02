"use client";

import { formatearCentavos, type Tablero } from "@misupertostada/shared";
import { Money } from "@/components/domain/money";
import {
  KpiCardAncla,
  KpiGrid,
  KpiGridSkeleton,
  type KpiTono,
} from "@/components/ui/kpi-grid";

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
  return <KpiGridSkeleton count={5} columns="tablero" rowHeight={92} />;
}

export function KpiStrip({ data }: { data: Tablero }) {
  const k = data.kpis;
  const unDia = data.filtrosAplicados.desde === data.filtrosAplicados.hasta;
  const bajaronVentas = k.ventasDeltaPuntosBase < 0;
  return (
    <KpiGrid columns="tablero">
      <KpiCardAncla
        ancla="chart-ventas"
        etiqueta="Ventas"
        valor={<Money centavos={k.ventasCentavos} tone="pagado" truncate />}
        nota={deltaTexto(k.ventasDeltaCentavos, k.ventasDeltaPuntosBase)}
        tono={bajaronVentas ? "aviso" : "marca"}
      />
      <KpiCardAncla
        ancla="chart-adopcion"
        etiqueta="Pedidos"
        valor={k.pedidos}
        nota={`${k.portal} del portal · ${k.manual} manuales`}
      />
      <KpiCardAncla
        ancla="chart-cartera"
        etiqueta="Por cobrar"
        valor={
          data.filtrosAplicados.carteraAplica ? (
            <Money centavos={k.porCobrarCentavos} tone="pendiente" truncate />
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
      <KpiCardAncla
        ancla="chart-cobrado"
        etiqueta="Cobrado"
        valor={<Money centavos={k.cobradoCentavos} truncate />}
        nota={`Efectivo ${formatearCentavos(k.cobradoEfectivoCentavos)} · Transferencia ${formatearCentavos(k.cobradoTransferenciaCentavos)}`}
      />
      <KpiCardAncla
        ancla={unDia ? "chart-sin-pedido" : "chart-clientes"}
        etiqueta={unDia ? "Aún no piden" : "Dejaron de pedir"}
        valor={k.clientesAlertaCount}
        nota={
          unDia
            ? "Activos sin pedido en esta fecha de operación"
            : "Diarios en silencio 3 días hábiles"
        }
        tono={(k.clientesAlertaCount > 0 ? "peligro" : "neutro") as KpiTono}
      />
    </KpiGrid>
  );
}
