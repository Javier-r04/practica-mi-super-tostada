/** Teléfono o tablet táctil; no laptop de escritorio con ratón. */
export function detectarEsMobile(): boolean {
  if (typeof window === "undefined") return false;

  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const fine = window.matchMedia("(pointer: fine)").matches;

  // Pantalla táctil sin puntero fino (típico teléfono).
  if (coarse && !fine) return true;

  const ua = navigator.userAgent;
  if (/Android|iPhone|iPad|iPod|Mobile/i.test(ua)) {
    return navigator.maxTouchPoints > 0;
  }

  return false;
}
