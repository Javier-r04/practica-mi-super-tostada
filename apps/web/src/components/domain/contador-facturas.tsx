import Link from "next/link";
import { Money } from "@/components/domain/money";
import { cn } from "@/lib/utils";

export function ContadorFacturas({
  pendientes,
  limite,
  montoCentavos,
  etiqueta = "Facturas pendientes",
  href,
  /** Portal: resalta sin revelar el límite interno del cliente. */
  destacado = false,
}: {
  pendientes: number;
  limite?: number | null;
  montoCentavos?: number | null;
  etiqueta?: string;
  /** Si existe, el contador es un enlace (p. ej. ficha del cliente). */
  href?: string;
  destacado?: boolean;
}) {
  const excedido = limite != null && pendientes >= limite;
  const cerca = limite != null && !excedido && pendientes >= limite - 1;
  const alertaSuave = destacado && !excedido;
  const color = excedido
    ? "text-peligro"
    : alertaSuave || cerca
      ? "text-aviso"
      : "text-marca";

  const shellClass = cn(
    "flex min-h-fila min-w-0 items-center gap-3 rounded-tarjeta border bg-blanco px-4 py-3",
    excedido ? "border-peligro" : "border-[var(--border-subtle)]",
    href &&
      "text-inherit no-underline transition-[background-color] duration-control ease-out hover:bg-tinta-50 hover:text-inherit hover:no-underline focus-visible:outline-none focus-visible:shadow-foco",
  );

  const body = (
    <>
      <span
        className={cn(
          "shrink-0 font-display text-xl leading-none tabular-nums sm:text-2xl",
          color,
        )}
      >
        {pendientes}
        {limite != null ? (
          <span className="text-sm text-tinta-500">/{limite}</span>
        ) : null}
      </span>
      <div className="min-w-0 flex-1 grid gap-0.5">
        <span className="mst-label truncate">{etiqueta}</span>
        {montoCentavos != null ? (
          <Money
            centavos={montoCentavos}
            tone={excedido ? "pendiente" : "default"}
            truncate
          />
        ) : null}
        {excedido ? (
          <span className="text-xs font-semibold text-peligro line-clamp-2">
            Límite de crédito excedido
          </span>
        ) : null}
      </div>
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        aria-label={`Ficha de ${etiqueta}`}
        className={shellClass}
      >
        {body}
      </Link>
    );
  }

  return <div className={shellClass}>{body}</div>;
}
