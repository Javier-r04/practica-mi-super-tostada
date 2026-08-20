import {
  UNIDAD_CORTA,
  type UnidadMedida,
} from "@misupertostada/shared";
import { Money } from "@/components/domain/money";

export function PedidoItemRow({
  nombreMostrado,
  alias,
  unidadMedida,
  cantidad,
  precioUnitarioCentavos,
}: {
  nombreMostrado: string;
  alias?: string | null;
  unidadMedida: UnidadMedida;
  cantidad: number;
  precioUnitarioCentavos: number;
}) {
  const unidad = UNIDAD_CORTA[unidadMedida];
  const subtotal = cantidad * precioUnitarioCentavos;
  return (
    <div className="flex min-h-fila items-center gap-3 border-b border-[var(--border-subtle)] px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-tinta-900">
          {nombreMostrado}
        </p>
        <p className="text-[12px] tabular-nums text-tinta-500">
          {alias && alias !== nombreMostrado ? `«${alias}» · ` : null}
          {cantidad} {unidad} × <Money centavos={precioUnitarioCentavos} tone="muted" />
        </p>
      </div>
      <Money centavos={subtotal} />
    </div>
  );
}
