import { cn } from "@/lib/utils";

export function Wordmark({
  compact = false,
  className,
}: {
  compact?: boolean;
  /** Indica uso sobre fondo de marca; el SVG se renderiza intacto (tiene su propio badge). */
  onBrand?: boolean;
  className?: string;
}) {
  // El SVG declara width/height=500. Sin altura CSS explícita, Safari (y a
  // veces Chrome en móvil) lo pinta a tamaño intrínseco y rompe el header.
  // La altura por defecto SIEMPRE aplica; `className` la puede sobrescribir
  // vía twMerge (p. ej. h-20 en el panel, h-44 en login). Antes, cualquier
  // className truthy —incluso "shrink-0"— anulaba h-8/h-10.
  const altoPx = compact ? 32 : 40;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- SVG local en /public; next/image no aporta optimización aquí.
    <img
      src="/logo.svg"
      alt="Mi Súper Tostada"
      width={altoPx}
      height={altoPx}
      decoding="sync"
      fetchPriority="high"
      className={cn(
        "h-10 w-auto max-h-full shrink-0 object-contain object-center",
        compact && "h-8",
        className,
      )}
    />
  );
}
