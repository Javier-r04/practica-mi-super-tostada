"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import type { ClientePublico } from "@misupertostada/shared";
import { ClienteAvatar } from "@/components/catalog/cliente-avatar";
import { Badge } from "@/components/ui/badge";
import { Money } from "@/components/domain/money";
import { cn } from "@/lib/utils";
import type { ClienteCobranzaResumen } from "@/lib/cliente-cobranza";

export function ClienteMiniCard({
  cliente,
  cobranza,
}: {
  cliente: ClientePublico;
  cobranza: ClienteCobranzaResumen;
}) {
  const excedido =
    cliente.limiteFacturasPendientes != null &&
    cobranza.facturasPendientes >= cliente.limiteFacturasPendientes;
  const tieneAlerta =
    excedido || cobranza.facturasVencidas > 0 || cobranza.facturasPendientes > 0;

  return (
    <Link
      href={`/clientes/${cliente.id}`}
      className={cn(
        "group flex flex-col gap-3 rounded-tarjeta border-2 bg-blanco p-4 shadow-tarjeta",
        "text-inherit no-underline transition-[border-color] duration-150 ease-out",
        "hover:border-[var(--border-accent)] hover:text-inherit hover:no-underline",
        "focus-visible:outline-none",
        excedido ? "border-peligro/40" : "border-[var(--border-subtle)]",
        !cliente.activo && "opacity-70",
      )}
    >
      <div className="flex items-start gap-3">
        <ClienteAvatar
          nombre={cliente.nombre}
          fotoAssetId={cliente.fotoAssetId}
          size="md"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="truncate font-semibold text-tinta-900 text-wrap">
              {cliente.nombre}
            </span>
            {!cliente.activo && <Badge tone="amber">Inactivo</Badge>}
          </div>
          <p className="mt-0.5 truncate text-sm text-pretty text-tinta-500">
            {cliente.contacto ?? "Sin contacto"}
            {cliente.telefonoWa ? ` · ${cliente.telefonoWa}` : ""}
          </p>
          <p className="mt-0.5 text-xs tabular-nums text-tinta-500">
            {cliente.horarioEntregaFijo
              ? `Entrega ${cliente.horarioEntregaFijo}`
              : "Sin horario fijo"}
          </p>
        </div>
      </div>

      <div
        className={cn(
          "grid grid-cols-2 gap-2 rounded-[calc(var(--radius-card)-0.5rem)] p-2.5",
          tieneAlerta ? "bg-tinta-50" : "bg-[var(--green-50)]",
        )}
      >
        <Metric
          label="Pendientes"
          value={
            cliente.limiteFacturasPendientes != null
              ? `${cobranza.facturasPendientes}/${cliente.limiteFacturasPendientes}`
              : String(cobranza.facturasPendientes)
          }
          tone={
            excedido ? "danger" : cobranza.facturasPendientes > 0 ? "warn" : "ok"
          }
        />
        <Metric
          label="Saldo"
          value={<Money centavos={cobranza.saldoCentavos} />}
          tone={cobranza.saldoCentavos > 0 ? "warn" : "ok"}
        />
        <Metric
          label="Por facturar"
          value={String(cobranza.facturasEnProgreso)}
          hint="Sin DTE"
          tone={cobranza.facturasEnProgreso > 0 ? "warn" : "muted"}
        />
        <Metric
          label="Vencidas"
          value={String(cobranza.facturasVencidas)}
          tone={cobranza.facturasVencidas > 0 ? "danger" : "muted"}
        />
      </div>
    </Link>
  );
}

function Metric({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  tone: "ok" | "warn" | "danger" | "muted";
}) {
  const color =
    tone === "danger"
      ? "text-peligro"
        : tone === "warn"
          ? "text-aviso"
          : tone === "ok"
          ? "text-marca"
          : "text-tinta-500";
  return (
    <div className="min-w-0 px-1 py-0.5">
      <p className="mst-label text-[10px]">
        {label}
        {hint ? ` · ${hint}` : ""}
      </p>
      <p className={cn("mt-0.5 text-sm font-semibold tabular-nums", color)}>
        {value}
      </p>
    </div>
  );
}
