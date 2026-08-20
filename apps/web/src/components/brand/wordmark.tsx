export function Wordmark({
  compact = false,
  onBrand = false,
}: {
  compact?: boolean;
  onBrand?: boolean;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <span
        aria-hidden
        className={
          onBrand
            ? "grid size-9 shrink-0 place-items-center rounded-campo bg-acento text-[11px] font-semibold tracking-[0.04em] text-marca-prof"
            : "grid size-9 shrink-0 place-items-center rounded-campo bg-marca text-[11px] font-semibold tracking-[0.04em] text-blanco"
        }
      >
        MST
      </span>
      {!compact && (
        <span className="min-w-0 leading-tight">
          <span
            className={
              onBrand
                ? "block text-sm font-semibold text-blanco"
                : "block text-sm font-semibold text-tinta-900"
            }
          >
            Mi Súper Tostada
          </span>
          <span
            className={
              onBrand
                ? "block text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--green-200)]"
                : "block text-[12px] font-semibold uppercase tracking-[0.08em] text-tinta-500"
            }
          >
            Pedidos y cobranza
          </span>
        </span>
      )}
    </div>
  );
}
