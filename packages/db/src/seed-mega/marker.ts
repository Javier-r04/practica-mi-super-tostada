/** Marcador en notas / textos para poder borrar el mega-seed sin tocar el seed base. */
export const MEGA_SEED_MARKER = "[MEGA_SEED]";

export function conMarcador(texto: string | null | undefined): string {
  const base = (texto ?? "").trim();
  if (!base) return MEGA_SEED_MARKER;
  if (base.includes(MEGA_SEED_MARKER)) return base;
  return `${MEGA_SEED_MARKER} ${base}`;
}

export function esMegaSeed(texto: string | null | undefined): boolean {
  return (texto ?? "").includes(MEGA_SEED_MARKER);
}
