import { cn } from "@/lib/utils";

export function Wordmark({
  compact = false,
  onBrand = false,
  className,
}: {
  compact?: boolean;
  /** Indica uso sobre fondo de marca; el SVG se renderiza intacto (tiene su propio badge). */
  onBrand?: boolean;
  className?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- SVG local en /public; next/image no aporta optimización aquí.
    <img
      src="/logo.svg"
      alt="Mi Súper Tostada"
      className={cn(
        "w-auto shrink-0 object-contain object-center",
        !className && (compact ? "h-8" : "h-10"),
        className,
      )}
    />
  );
}
