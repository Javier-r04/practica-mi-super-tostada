"use client";

import { Card, Chip } from "@heroui/react";
import { Wallet } from "lucide-react";
import type { CuadreDia, PagoMetodo } from "@misupertostada/shared";
import { Money } from "@/components/domain/money";
import { EmptyState } from "@/components/ui/empty-state";

export function VistaCuadre({ cuadre }: { cuadre: CuadreDia }) {
  const vacio = cuadre.pagos.length === 0;

  return (
    <Card className="p-5">
      <Card.Header>
        <Card.Title>Cuadre del día</Card.Title>
        <Card.Description>
          Pagos con fecha {cuadre.fecha} · no es la fecha de operación
        </Card.Description>
      </Card.Header>

      <Card.Content className="grid gap-4">
        {/* Las tres cifras que Carla canta al cerrar: efectivo, transferencia y
            la suma. El total va aparte, en verde, porque es la que se compara
            contra el sobre. */}
        <dl className="grid min-w-0 gap-3 sm:grid-cols-3">
          <Cifra etiqueta="Efectivo" centavos={cuadre.totalEfectivoCentavos} />
          <Cifra
            etiqueta="Transferencia"
            centavos={cuadre.totalTransferenciaCentavos}
          />
          <Cifra
            destacado
            etiqueta="Total"
            centavos={cuadre.totalCentavos}
            tone="pagado"
          />
        </dl>

        {cuadre.porActor.length > 0 && (
          <ul className="grid gap-2">
            {cuadre.porActor.map((a) => (
              <li
                key={a.usuarioId ?? a.username}
                className="grid min-w-0 gap-1 text-sm sm:flex sm:flex-wrap sm:items-baseline sm:justify-between sm:gap-2"
              >
                <span className="truncate font-semibold text-tinta-900">
                  {a.username}
                </span>
                <span className="min-w-0 tabular-nums text-tinta-500">
                  {a.count} cobro{a.count === 1 ? "" : "s"} · efectivo{" "}
                  <Money centavos={a.efectivoCentavos} truncate />
                  {a.transferenciaCentavos > 0 ? (
                    <>
                      {" "}
                      · transf.{" "}
                      <Money centavos={a.transferenciaCentavos} truncate />
                    </>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        )}

        {vacio ? (
          <EmptyState
            icon={<Wallet size={22} aria-hidden />}
            title="Sin cobros este día"
            description="Aún no hay cobros registrados. Al guardar un pago aparece aquí con quien lo recibió."
          />
        ) : (
          <ul className="border-t border-[var(--border-subtle)]">
            {cuadre.pagos.map((p) => (
              <li
                key={p.id}
                className="flex min-h-11 min-w-0 items-center gap-2 border-b border-[var(--border-subtle)] py-2 text-sm last:border-b-0 sm:gap-3"
              >
                <MetodoChip metodo={p.metodo} />
                <span className="min-w-0 flex-1 truncate font-medium text-tinta-900">
                  {p.clienteNombre ?? p.numeroDte ?? "Factura"}
                </span>
                <span className="hidden shrink-0 text-xs text-tinta-500 sm:inline">
                  {p.registradoPorNombre ?? "—"}
                </span>
                <Money
                  centavos={p.montoCentavos}
                  truncate
                  className="shrink-0 text-sm sm:text-base"
                />
              </li>
            ))}
          </ul>
        )}
      </Card.Content>
    </Card>
  );
}

function Cifra({
  etiqueta,
  centavos,
  destacado,
  tone,
}: {
  etiqueta: string;
  centavos: number;
  destacado?: boolean;
  tone?: "pagado";
}) {
  return (
    <div
      className={
        destacado
          ? "min-w-0 rounded-[calc(var(--radius-card)-0.5rem)] bg-[var(--green-50)] px-3 py-2.5"
          : "min-w-0 rounded-[calc(var(--radius-card)-0.5rem)] bg-tinta-50 px-3 py-2.5"
      }
    >
      <dt className="mst-label text-[11px]">{etiqueta}</dt>
      <dd className="mt-0.5 min-w-0">
        <Money
          centavos={centavos}
          truncate
          className="text-base sm:text-lg"
          tone={tone}
        />
      </dd>
    </div>
  );
}

function MetodoChip({ metodo }: { metodo: PagoMetodo }) {
  return metodo === "EFECTIVO" ? (
    <Chip color="success" size="sm" variant="soft">
      Efectivo
    </Chip>
  ) : (
    <Chip size="sm" variant="soft">
      Transferencia
    </Chip>
  );
}
