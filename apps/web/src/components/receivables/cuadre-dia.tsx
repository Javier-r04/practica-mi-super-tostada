"use client";

import type { CuadreDia } from "@misupertostada/shared";
import { Card } from "@/components/ui/card";
import { Money } from "@/components/domain/money";
import { EstadoBadge } from "@/components/domain/estado-badge";

export function VistaCuadre({ cuadre }: { cuadre: CuadreDia }) {
  return (
    <Card title="Cuadre del día" subtitle={`Pagos con fecha ${cuadre.fecha} · no es la fecha de operación`}>
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <div className="text-[12px] font-semibold uppercase tracking-[0.08em] text-tinta-500">
            Efectivo
          </div>
          <Money centavos={cuadre.totalEfectivoCentavos} className="text-lg" />
        </div>
        <div>
          <div className="text-[12px] font-semibold uppercase tracking-[0.08em] text-tinta-500">
            Transferencia
          </div>
          <Money centavos={cuadre.totalTransferenciaCentavos} className="text-lg" />
        </div>
        <div>
          <div className="text-[12px] font-semibold uppercase tracking-[0.08em] text-tinta-500">
            Total
          </div>
          <Money centavos={cuadre.totalCentavos} className="text-lg" tone="pagado" />
        </div>
      </div>
      <ul className="mt-4 grid gap-2">
        {cuadre.porActor.map((a) => (
          <li key={a.usuarioId ?? a.username} className="flex justify-between text-sm">
            <span className="font-semibold">{a.username}</span>
            <span className="text-tinta-500">
              {a.count} cobros · efectivo <Money centavos={a.efectivoCentavos} />
            </span>
          </li>
        ))}
      </ul>
      <ul className="mt-4 border-t border-[var(--border-subtle)]">
        {cuadre.pagos.map((p) => (
          <li
            key={p.id}
            className="flex min-h-11 items-center gap-3 border-b border-[var(--border-subtle)] py-2 text-sm"
          >
            <EstadoBadge estado={p.metodo === "EFECTIVO" ? "PAGADO" : "PENDIENTE"} size="sm" />
            <span className="min-w-0 flex-1 truncate">{p.clienteNombre ?? p.numeroDte ?? p.facturaId}</span>
            <span className="text-xs text-tinta-500">{p.registradoPorNombre}</span>
            <Money centavos={p.montoCentavos} />
          </li>
        ))}
      </ul>
    </Card>
  );
}
