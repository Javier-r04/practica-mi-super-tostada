import { z } from "zod";

/** El dinero vive en centavos enteros. El formateo a texto es solo presentación. */
export const centavosSchema = z.number().int();

/**
 * Redondeo bancario (half-even / IEEE 754 roundTiesToEven).
 * Criterio para totales: el empate a .5 va al entero par, para no sesgar
 * siempre hacia arriba al calcular montos.
 */
export function redondearBancario(valor: number): number {
  if (!Number.isFinite(valor)) {
    throw new Error(`redondearBancario: valor no finito (${String(valor)})`);
  }
  const signo = valor < 0 ? -1 : 1;
  const abs = Math.abs(valor);
  const entero = Math.floor(abs);
  const frac = abs - entero;
  if (frac > 0.5) return signo * (entero + 1);
  if (frac < 0.5) return signo * entero;
  return signo * (entero % 2 === 0 ? entero : entero + 1);
}

export function formatearCentavos(
  centavos: number,
  { simbolo = true }: { simbolo?: boolean } = {},
): string {
  if (!Number.isInteger(centavos)) {
    throw new Error(
      `formatearCentavos: se esperaba un entero en centavos, recibido ${String(centavos)}`,
    );
  }
  const n = Math.abs(centavos);
  const entero = Math.floor(n / 100)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const dec = String(n % 100).padStart(2, "0");
  const signo = centavos < 0 ? "−" : "";
  return `${signo}${simbolo ? "Q " : ""}${entero}.${dec}`;
}
