/**
 * Cada cuánto refrescar el estado de la ventana (panel y portal).
 *
 * El reloj abre y cierra solo: no hay evento SSE a las 15:00. El navbar ya
 * preguntaba cada minuto; el portal no, así que una pestaña abierta a las
 * 10:00 seguía diciendo «cerrada» cuando el panel ya mostraba abierta.
 * Esta función es la regla única: sondeo cada minuto, y en el último minuto
 * apunta al instante exacto (+ un colchón para que el reloj del servidor
 * haya cruzado el umbral).
 */
export const INTERVALO_VENTANA_MAX_MS = 60_000;
export const INTERVALO_VENTANA_MIN_MS = 250;
export const INTERVALO_VENTANA_BUFFER_MS = 400;

export function intervaloRefetchVentana(input: {
  cierraAt?: string | null;
  proximaAperturaAt?: string | null;
  now?: number;
}): number {
  const now = input.now ?? Date.now();
  let next = INTERVALO_VENTANA_MAX_MS;
  for (const iso of [input.cierraAt, input.proximaAperturaAt]) {
    if (!iso) continue;
    const at = Date.parse(iso);
    if (Number.isNaN(at)) continue;
    const delay = at - now + INTERVALO_VENTANA_BUFFER_MS;
    if (delay <= 0) {
      next = Math.min(next, INTERVALO_VENTANA_MIN_MS);
      continue;
    }
    next = Math.min(next, delay);
  }
  return Math.max(next, INTERVALO_VENTANA_MIN_MS);
}
