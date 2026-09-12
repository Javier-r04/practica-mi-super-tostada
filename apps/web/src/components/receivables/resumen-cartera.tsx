"use client";

import type { CarteraResumen } from "@misupertostada/shared";
import { KpiCard, KpiGrid, KpiGridSkeleton } from "@/components/ui/kpi-grid";
import { Money } from "@/components/domain/money";
import { etiquetaDiaSemanaCorto } from "@/lib/fecha-ui";

/**
 * Indicadores clave de cartera y cobranza:
 * 1. Saldo por cobrar total de todos los clientes con facturas abiertas.
 * 2. Cantidad de facturas pendientes de cobro.
 * 3. Monto de entregas en la operación activa pendientes de facturar.
 * 4. Total cobrado durante el día de calle (caja civil).
 */
export function ResumenCartera({
  resumen,
  cargando,
}: {
  resumen: CarteraResumen | undefined;
  cargando: boolean;
}) {
  if (cargando || !resumen) {
    return <KpiGridSkeleton count={4} />;
  }

  return (
    <KpiGrid>
      <KpiCard
        etiqueta="Saldo por cobrar"
        nota="Deuda total abierta de clientes"
        valor={
          <Money
            centavos={resumen.pendientesSaldoCentavos}
            tone="pendiente"
            truncate
          />
        }
      />
      <KpiCard
        etiqueta="Facturas pendientes"
        nota="Con saldo pendiente de pago"
        tono={resumen.pendientesCount > 0 ? "aviso" : "ok"}
        valor={resumen.pendientesCount}
      />
      <KpiCard
        etiqueta="Por facturar de la operación"
        nota="Entregado sin factura todavía"
        valor={
          <Money
            centavos={resumen.porCobrarFechaOperacionCentavos}
            tone="muted"
            truncate
          />
        }
      />
      <KpiCard
        etiqueta="Cobrado hoy"
        nota={
          resumen.fechaCobro
            ? `Día de calle · ${etiquetaDiaSemanaCorto(resumen.fechaCobro)}`
            : "Día de calle"
        }
        valor={
          <Money
            centavos={resumen.cobradoHoyCentavos}
            tone="pagado"
            truncate
          />
        }
      />
    </KpiGrid>
  );
}
