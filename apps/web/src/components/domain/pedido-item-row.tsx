"use client";

import {
  UNIDAD_CORTA,
  type PuntoCarga,
  type UnidadMedida,
} from "@misupertostada/shared";
import { Money } from "@/components/domain/money";
import { EstadoBadge } from "@/components/domain/estado-badge";
import { ProductoThumb } from "@/components/catalog/producto-thumb";
import { Tag } from "@/components/ui/badge";
import { QuantityStepper } from "@/components/ui/quantity-stepper";
import { cn } from "@/lib/utils";

export function PedidoItemRow({
  nombreMostrado,
  alias,
  unidadMedida,
  cantidad,
  precioUnitarioCentavos,
  puntoCarga,
  notaProduccion,
  fotoAssetId,
  fotoSrcPath,
  editable = false,
  onChangeCantidad,
}: {
  nombreMostrado: string;
  alias?: string | null;
  unidadMedida: UnidadMedida;
  cantidad: number;
  precioUnitarioCentavos: number;
  puntoCarga?: PuntoCarga;
  notaProduccion?: string | null;
  fotoAssetId?: string | null;
  /** Path API del portal (`/p/{token}/assets/{id}`). */
  fotoSrcPath?: string;
  editable?: boolean;
  onChangeCantidad?: (cantidad: number) => void;
}) {
  const unidad = UNIDAD_CORTA[unidadMedida];
  const subtotal = cantidad * precioUnitarioCentavos;
  return (
    /* Un solo renglón también en el teléfono. En `flex-col` el subtotal caía
       solo a la izquierda de un `justify-between` sin compañero, y cada ítem
       ocupaba dos líneas justo en la pantalla que decide el pedido. Solo el
       modo editable —que mete un stepper de 44 px— se parte en dos. */
    <div
      className={cn(
        "flex min-w-0 gap-3 border-b border-[var(--border-subtle)] px-4 py-3",
        editable
          ? "flex-col sm:flex-row sm:items-center"
          : "flex-row items-center",
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <ProductoThumb
          nombre={nombreMostrado}
          fotoAssetId={fotoAssetId}
          srcPath={fotoSrcPath}
          size="sm"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-tinta-900">
            {nombreMostrado}
          </p>
          <p className="min-w-0 truncate text-[12px] tabular-nums text-tinta-500">
            {alias && alias !== nombreMostrado ? `«${alias}» · ` : null}
            {editable ? null : (
              <>
                {cantidad} {unidad} ×{" "}
                <Money centavos={precioUnitarioCentavos} tone="muted" truncate />
              </>
            )}
            {editable ? (
              <>
                <Money centavos={precioUnitarioCentavos} tone="muted" truncate /> /{" "}
                {unidad}
              </>
            ) : null}
          </p>
          {(puntoCarga || notaProduccion) && (
            <div className="mt-1 flex flex-wrap gap-1.5">
              {puntoCarga ? <EstadoBadge estado={puntoCarga} size="sm" /> : null}
              {notaProduccion ? <Tag>{notaProduccion}</Tag> : null}
            </div>
          )}
        </div>
      </div>
      <div
        className={cn(
          "flex min-w-0 items-center gap-3",
          editable ? "justify-between sm:shrink-0" : "shrink-0 justify-end",
        )}
      >
        {editable && onChangeCantidad ? (
          <QuantityStepper
            value={cantidad}
            onChange={onChangeCantidad}
            min={1}
            unidad={unidad}
          />
        ) : null}
        <Money centavos={subtotal} truncate className="shrink-0 tabular-nums" />
      </div>
    </div>
  );
}
