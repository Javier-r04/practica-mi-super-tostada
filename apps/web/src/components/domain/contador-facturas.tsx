import { Money } from "@/components/domain/money";
import { cn } from "@/lib/utils";

export function ContadorFacturas({
  pendientes,
  limite,
  montoCentavos,
  etiqueta = "Facturas pendientes",
}: {
  pendientes: number;
  limite?: number | null;
  montoCentavos?: number | null;
  etiqueta?: string;
}) {
  const excedido = limite != null && pendientes >= limite;
  const cerca = limite != null && !excedido && pendientes >= limite - 1;
  const color = excedido
    ? "text-peligro"
    : cerca
      ? "text-aviso"
      : "text-marca";

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-tarjeta border bg-blanco px-4 py-3",
        excedido ? "border-peligro" : "border-[var(--border-subtle)]",
      )}
    >
      <span className={cn("font-display text-[28px] leading-none", color)}>
        {pendientes}
        {limite != null ? (
          <span className="text-[14px] text-tinta-500">/{limite}</span>
        ) : null}
      </span>
      <div className="grid gap-0.5">
        <span className="mst-label">
          {etiqueta}
        </span>
        {montoCentavos != null ? (
          <Money centavos={montoCentavos} tone={excedido ? "pendiente" : "default"} />
        ) : null}
        {excedido ? (
          <span className="text-[12px] font-semibold text-peligro">
            Límite de crédito excedido
          </span>
        ) : null}
      </div>
    </div>
  );
}
