"use client";

import type { CuadreDia, PagoMetodo } from "@misupertostada/shared";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Money } from "@/components/domain/money";

export function VistaCuadre({ cuadre }: { cuadre: CuadreDia }) {
  const vacio = cuadre.pagos.length === 0;

  return (
    <Card
      title="Cuadre del día"
      subtitle={`Pagos con fecha ${cuadre.fecha} · no es la fecha de operación`}
    >
        <div className="grid gap-3 sm:grid-cols-3">
          <ResumenMetodo
            label="Efectivo"
            centavos={cuadre.totalEfectivoCentavos}
          />
          <ResumenMetodo
            label="Transferencia"
            centavos={cuadre.totalTransferenciaCentavos}
          />
          <div className="rounded-[calc(var(--radius-card)-0.5rem)] bg-[var(--green-50)] px-3 py-2.5">
            <div className="mst-label">Total</div>
            <Money
              centavos={cuadre.totalCentavos}
              className="mt-0.5 text-lg"
              tone="pagado"
            />
          </div>
        </div>

        {cuadre.porActor.length > 0 && (
          <ul className="mt-4 grid gap-2">
            {cuadre.porActor.map((a) => (
              <li
                key={a.usuarioId ?? a.username}
                className="flex flex-wrap items-baseline justify-between gap-2 text-sm"
              >
                <span className="font-semibold text-tinta-900">{a.username}</span>
                <span className="tabular-nums text-tinta-500">
                  {a.count} cobro{a.count === 1 ? "" : "s"} · efectivo{" "}
                  <Money centavos={a.efectivoCentavos} />
                  {a.transferenciaCentavos > 0 ? (
                    <>
                      {" "}
                      · transf. <Money centavos={a.transferenciaCentavos} />
                    </>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        )}

        {vacio ? (
          <p className="mt-4 text-sm text-tinta-500">
            Aún no hay cobros registrados hoy.
          </p>
        ) : (
          <ul className="mt-4 border-t border-[var(--border-subtle)]">
            {cuadre.pagos.map((p) => (
              <li
                key={p.id}
                className="flex min-h-11 items-center gap-3 border-b border-[var(--border-subtle)] py-2 text-sm last:border-b-0"
              >
                <MetodoBadge metodo={p.metodo} />
                <span className="min-w-0 flex-1 truncate font-medium text-tinta-900">
                  {p.clienteNombre ?? p.numeroDte ?? "Factura"}
                </span>
                <span className="hidden text-xs text-tinta-500 sm:inline">
                  {p.registradoPorNombre ?? "—"}
                </span>
                <Money centavos={p.montoCentavos} />
              </li>
            ))}
          </ul>
        )}
      </Card>
  );
}

function ResumenMetodo({
  label,
  centavos,
}: {
  label: string;
  centavos: number;
}) {
  return (
    <div className="rounded-[calc(var(--radius-card)-0.5rem)] bg-tinta-50 px-3 py-2.5">
      <div className="mst-label">{label}</div>
      <Money centavos={centavos} className="mt-0.5 text-lg" />
    </div>
  );
}

function MetodoBadge({ metodo }: { metodo: PagoMetodo }) {
  if (metodo === "EFECTIVO") {
    return <Badge tone="green">Efectivo</Badge>;
  }
  return <Badge tone="neutral">Transferencia</Badge>;
}
