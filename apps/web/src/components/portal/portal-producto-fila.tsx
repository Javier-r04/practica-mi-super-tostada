"use client";

import type { ReactNode } from "react";
import { Star } from "lucide-react";
import {
  UNIDAD_CORTA,
  type PortalProducto,
} from "@misupertostada/shared";
import { Money } from "@/components/domain/money";
import { QuantityStepper } from "@/components/ui/quantity-stepper";

export function PortalProductoFila({
  producto,
  cantidad,
  onChange,
  bloqueado,
}: {
  producto: PortalProducto;
  cantidad: number;
  onChange: (cantidad: number) => void;
  bloqueado: boolean;
}) {
  const unidad = UNIDAD_CORTA[producto.unidadMedida];
  const disabled = bloqueado || !producto.pedible;
  return (
    <div className="flex items-center gap-3 border-b border-[var(--border-subtle)] px-4 py-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-sm font-semibold capitalize text-tinta-900">
            {producto.alias}
          </span>
          {producto.favorito ? (
            <Star
              size={13}
              className="shrink-0 text-[var(--gold-500)]"
              fill="currentColor"
              aria-label="Favorito"
            />
          ) : null}
        </div>
        <p className="text-[12px] text-tinta-500">
          {producto.alias !== producto.nombreCanonico
            ? `${producto.nombreCanonico} · `
            : null}
          {producto.pedible ? (
            <>
              <Money centavos={producto.precioCentavos} tone="muted" /> / {unidad}
            </>
          ) : (
            "Sin precio — avise a la fábrica"
          )}
        </p>
      </div>
      <QuantityStepper
        value={cantidad}
        onChange={onChange}
        unidad={unidad}
        disabled={disabled}
      />
    </div>
  );
}

export function PortalSeccion({
  titulo,
  children,
}: {
  titulo: string;
  children: ReactNode;
}) {
  return (
    <section className="grid gap-2">
      <h2 className="px-4 mst-label">
        {titulo}
      </h2>
      <div className="border-y border-[var(--border-subtle)] bg-blanco">
        {children}
      </div>
    </section>
  );
}
