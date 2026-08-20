"use client";

import type { FacturaCartera } from "@misupertostada/shared";
import { EstadoBadge } from "@/components/domain/estado-badge";
import { Money } from "@/components/domain/money";
import { Button } from "@/components/ui/button";
import { CapturaDte } from "./captura-dte";

export function TablaCartera({
  facturas,
  puedeDte,
  puedeCobrar,
  hintDte,
  hintCobro,
  onCobrar,
  onDte,
}: {
  facturas: FacturaCartera[];
  puedeDte: boolean;
  puedeCobrar: boolean;
  hintDte?: string;
  hintCobro?: string;
  onCobrar: (fac: FacturaCartera) => void;
  onDte: (fac: FacturaCartera, numeroDte: string) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] border-collapse text-sm">
        <thead>
          <tr className="bg-tinta-50">
            {["DTE", "Cliente", "Pedido", "Monto", "Abonado", "Saldo", "Estado", ""].map((h) => (
              <th
                key={h}
                className={`px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-tinta-500 ${
                  ["Monto", "Abonado", "Saldo"].includes(h) ? "text-right" : "text-left"
                }`}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {facturas.map((f) => (
            <tr key={f.id} className="border-b border-[var(--border-subtle)] align-top">
              <td className="px-4 py-3 font-mono text-xs">
                {f.numeroDte ?? (
                  <span className="text-tinta-500">Sin DTE</span>
                )}
                {!f.numeroDte && (
                  <div className="mt-2 max-w-[220px]">
                    <CapturaDte
                      id={`dte-${f.id}`}
                      numeroDte={f.numeroDte}
                      disabled={!puedeDte}
                      hint={hintDte}
                      onSave={(numeroDte) => onDte(f, numeroDte)}
                    />
                  </div>
                )}
              </td>
              <td className="px-4 py-3 font-semibold">{f.clienteNombre}</td>
              <td className="px-4 py-3 font-mono text-xs text-tinta-500">#{f.correlativo}</td>
              <td className="px-4 py-3 text-right">
                <Money centavos={f.montoCentavos} />
              </td>
              <td className="px-4 py-3 text-right">
                <Money centavos={f.abonadoCentavos} tone="muted" />
              </td>
              <td className="px-4 py-3 text-right">
                <Money
                  centavos={f.saldoCentavos}
                  tone={
                    f.estado === "VENCIDO"
                      ? "vencido"
                      : f.estado === "PAGADO"
                        ? "pagado"
                        : "pendiente"
                  }
                />
              </td>
              <td className="px-4 py-3">
                <EstadoBadge estado={f.estado} size="sm" />
              </td>
              <td className="px-4 py-2 text-right">
                {f.estado !== "PAGADO" && (
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={!puedeCobrar}
                    title={hintCobro}
                    onClick={() => onCobrar(f)}
                  >
                    Registrar pago
                  </Button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
