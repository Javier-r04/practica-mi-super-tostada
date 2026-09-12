"use client";

import { Money } from "@/components/domain/money";
import { KpiCard, KpiGrid, KpiGridSkeleton } from "@/components/ui/kpi-grid";
import type { ResumenClientes } from "@/lib/cliente-cobranza";

/* Lo que Cristian sacaba contando a mano en el cuaderno antes de repartir:
   cuántos clientes hay vivos, a cuántos se les debe cobrar y cuánto suma. */
export function ClientesResumen({
  resumen,
  cargando,
}: {
  resumen: ResumenClientes | null;
  cargando: boolean;
}) {
  if (cargando || !resumen) {
    return <KpiGridSkeleton count={4} />;
  }

  return (
    <KpiGrid>
      <KpiCard etiqueta="Clientes activos" valor={resumen.activos} />
      <KpiCard
        etiqueta="Con facturas pendientes"
        valor={resumen.conSaldo}
        tono={resumen.conSaldo > 0 ? "aviso" : "ok"}
      />
      <KpiCard
        etiqueta="Saldo por cobrar"
        valor={
          <Money centavos={resumen.saldoCentavos} tone="pendiente" truncate />
        }
      />
      <KpiCard
        etiqueta="Al límite de crédito"
        nota="Alerta informativa"
        valor={resumen.excedidos}
        tono={resumen.excedidos > 0 ? "peligro" : "ok"}
      />
    </KpiGrid>
  );
}
