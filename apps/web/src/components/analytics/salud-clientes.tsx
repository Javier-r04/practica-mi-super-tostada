"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Card, Chip } from "@heroui/react";
import type { ClientePublico } from "@misupertostada/shared";
import { ClienteAvatar } from "@/components/catalog/cliente-avatar";
import { Money } from "@/components/domain/money";
import { EmptyState } from "@/components/ui/empty-state";
import {
  DIAS_PAGO_LENTO,
  formatearFechaCorta,
  segmentarSaludClientes,
  type ClienteSaludVista,
} from "@/lib/tablero-vista";
import { cn } from "@/lib/utils";

function fotoDe(
  clientes: ClientePublico[] | undefined,
  clienteId: string,
): string | null | undefined {
  return clientes?.find((c) => c.id === clienteId)?.fotoAssetId;
}

/** Misma cifra chica que la tira de KPIs: etiqueta arriba, número en tabular. */
function Cifra({
  etiqueta,
  valor,
  tono = "neutro",
}: {
  etiqueta: string;
  valor: number;
  tono?: "neutro" | "aviso" | "peligro";
}) {
  return (
    <Card variant="secondary" className="gap-1 p-3">
      <dt className="mst-label text-[11px]">{etiqueta}</dt>
      <dd
        className={cn(
          "text-[22px] font-semibold leading-none tabular-nums",
          tono === "peligro"
            ? "text-peligro"
            : tono === "aviso"
              ? "text-aviso-700"
              : "text-tinta-900",
        )}
      >
        {valor}
      </dd>
    </Card>
  );
}

function FilaCliente({
  c,
  fotoAssetId,
  meta,
  trailing,
  badge,
}: {
  c: ClienteSaludVista;
  fotoAssetId?: string | null;
  meta: string;
  trailing: ReactNode;
  badge?: ReactNode;
}) {
  return (
    <li>
      <Link
        href={`/clientes/${c.clienteId}`}
        className="flex min-h-[52px] items-center gap-3 rounded-campo px-2 py-2 text-inherit no-underline transition-colors hover:bg-[var(--ink-100)] hover:text-inherit hover:no-underline focus-visible:outline-none focus-visible:shadow-foco"
      >
        <ClienteAvatar nombre={c.nombre} fotoAssetId={fotoAssetId} size="sm" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-pretty text-sm font-semibold text-tinta-900">
              {c.nombre}
            </span>
            {badge}
          </div>
          <p className="mt-0.5 text-xs text-tinta-500">{meta}</p>
        </div>
        <span className="shrink-0 font-mono text-sm tabular-nums text-tinta-800">
          {trailing}
        </span>
      </Link>
    </li>
  );
}

export function SaludClientesCard({
  clientes,
  catalogo,
}: {
  clientes: ClienteSaludVista[];
  catalogo?: ClientePublico[];
}) {
  if (clientes.length === 0) {
    return (
      <Card>
        <Card.Header>
          <Card.Title>Salud de clientes</Card.Title>
          <Card.Description>
            Quién necesita atención · quién mueve ticket
          </Card.Description>
        </Card.Header>
        <Card.Content>
          <EmptyState
            title="Sin clientes en este recorte"
            description="Con otro periodo o sin el filtro de cliente vuelven a aparecer."
          />
        </Card.Content>
      </Card>
    );
  }

  const salud = segmentarSaludClientes(clientes);
  const atencion = [...salud.dejaronDePedir, ...salud.paganLento];
  const sinSenales =
    salud.resumen.dejaron === 0 && salud.resumen.lentos === 0;

  return (
    <Card>
      <Card.Header>
        <Card.Title>Salud de clientes</Card.Title>
        <Card.Description>
          Señales accionables · no el padrón completo
        </Card.Description>
      </Card.Header>
      <Card.Content className="grid gap-5">
        <dl className="grid grid-cols-3 gap-2 sm:gap-3">
          <Cifra
            etiqueta="Dejaron de pedir"
            valor={salud.resumen.dejaron}
            tono={salud.resumen.dejaron > 0 ? "peligro" : "neutro"}
          />
          <Cifra
            etiqueta={`Pagan ≥${DIAS_PAGO_LENTO} d`}
            valor={salud.resumen.lentos}
            tono={salud.resumen.lentos > 0 ? "aviso" : "neutro"}
          />
          <Cifra etiqueta="Con pedido" valor={salud.resumen.conPedidos} />
        </dl>

        <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
          <section className="grid gap-2">
            <h3 className="mst-label">Atención</h3>
            {sinSenales ? (
              <p className="rounded-campo border border-[var(--border-subtle)] bg-[var(--green-50)] px-3 py-3 text-sm text-tinta-800">
                Nadie en silencio ni con mediana de pago lenta en este recorte.
              </p>
            ) : (
              <ul className="grid gap-0.5">
                {atencion.map((c) => (
                  <FilaCliente
                    key={c.clienteId}
                    c={c}
                    fotoAssetId={fotoDe(catalogo, c.clienteId)}
                    badge={
                      c.dejoDePedir ? (
                        <Chip color="danger" size="sm" variant="soft">
                          Dejó de pedir
                        </Chip>
                      ) : (
                        <Chip color="warning" size="sm" variant="soft">
                          Pago lento
                        </Chip>
                      )
                    }
                    meta={
                      c.dejoDePedir
                        ? `Último ${c.ultimoPedidoFecha ? formatearFechaCorta(c.ultimoPedidoFecha) : "—"} · mediana pago ${c.diasPagoMediana} d`
                        : `${c.pedidos} pedidos · mediana pago ${c.diasPagoMediana} d`
                    }
                    trailing={<Money centavos={c.ticketPromedioCentavos} />}
                  />
                ))}
              </ul>
            )}
            {(salud.resumen.dejaron > salud.dejaronDePedir.length ||
              salud.resumen.lentos > salud.paganLento.length) && (
              <p className="text-xs text-tinta-500">
                Mostramos los casos más urgentes. El resto está en{" "}
                <Link
                  href="/clientes"
                  className="font-semibold text-marca no-underline hover:text-marca-hover hover:no-underline"
                >
                  Clientes
                </Link>
                .
              </p>
            )}
          </section>

          <section className="grid gap-2">
            <h3 className="mst-label">Mayor ticket promedio</h3>
            {salud.topTicket.length === 0 ? (
              <p className="text-sm text-tinta-500">
                Sin tickets en este recorte.
              </p>
            ) : (
              <ul className="grid gap-0.5">
                {salud.topTicket.map((c) => (
                  <FilaCliente
                    key={c.clienteId}
                    c={c}
                    fotoAssetId={fotoDe(catalogo, c.clienteId)}
                    meta={`${c.pedidos} pedidos · pago ${c.diasPagoMediana} d`}
                    trailing={<Money centavos={c.ticketPromedioCentavos} />}
                  />
                ))}
              </ul>
            )}
          </section>
        </div>
      </Card.Content>
    </Card>
  );
}
