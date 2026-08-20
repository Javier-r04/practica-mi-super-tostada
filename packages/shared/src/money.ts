import { z } from "zod";

/** El dinero vive en centavos enteros. El formateo a texto es solo presentación. */
export const centavosSchema = z.number().int();

export function formatearCentavos(
  centavos: number,
  { simbolo = true }: { simbolo?: boolean } = {},
): string {
  const n = Math.abs(Math.round(Number(centavos) || 0));
  const entero = Math.floor(n / 100)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const dec = String(n % 100).padStart(2, "0");
  const signo = Number(centavos) < 0 ? "−" : "";
  return `${signo}${simbolo ? "Q " : ""}${entero}.${dec}`;
}
