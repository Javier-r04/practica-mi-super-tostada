"use client";

import { Card } from "@heroui/react";
import type { ReactNode } from "react";
import { Money } from "@/components/domain/money";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
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
    return (
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-[76px] w-full rounded-tarjeta" />
        ))}
      </div>
    );
  }

  return (
    <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Cifra etiqueta="Clientes activos" valor={resumen.activos} />
      <Cifra
        etiqueta="Con facturas pendientes"
        valor={resumen.conSaldo}
        tono={resumen.conSaldo > 0 ? "aviso" : "ok"}
      />
      <Cifra
        etiqueta="Saldo por cobrar"
        valor={<Money centavos={resumen.saldoCentavos} tone="pendiente" />}
      />
      <Cifra
        etiqueta="Al límite de crédito"
        nota="Alerta informativa"
        valor={resumen.excedidos}
        tono={resumen.excedidos > 0 ? "peligro" : "ok"}
      />
    </dl>
  );
}

function Cifra({
  etiqueta,
  valor,
  nota,
  tono = "neutro",
}: {
  etiqueta: string;
  valor: ReactNode;
  nota?: string;
  tono?: "neutro" | "ok" | "aviso" | "peligro";
}) {
  return (
    <Card className="gap-1 p-4">
      <dt className="mst-label text-[11px]">{etiqueta}</dt>
      <dd
        className={cn(
          "text-[22px] font-semibold leading-none tabular-nums",
          tono === "peligro"
            ? "text-peligro"
            : tono === "aviso"
              ? "text-aviso-700"
              : tono === "ok"
                ? "text-marca"
                : "text-tinta-900",
        )}
      >
        {valor}
      </dd>
      {nota && <p className="text-[11px] text-tinta-500">{nota}</p>}
    </Card>
  );
}
