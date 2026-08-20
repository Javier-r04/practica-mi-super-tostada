import { z } from "zod";

/** El dinero vive en centavos enteros. El formateo a texto es solo presentación. */
export const centavosSchema = z.number().int();

/**
 * Redondeo bancario (half-even / IEEE 754 roundTiesToEven).
 * Criterio para totales cuando entre un factor no entero.
 * `montoFacturaCentavos` no lo usa: cantidad × precio snapshot ya son enteros.
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

/**
 * Convierte texto de quetzales (`12.50`, `Q 12.50`, `12,50`) a centavos enteros.
 * No acepta miles ni más de dos decimales. El float no entra al stack.
 */
export function quetzalesTextoACentavos(texto: string): number {
  const recortado = texto.trim().replace(/^Q\s*/i, "");
  if (recortado === "") {
    throw new Error("El precio está vacío");
  }
  const normalizado = recortado.includes(".")
    ? recortado
    : recortado.replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(normalizado)) {
    throw new Error(`Precio inválido: ${texto.trim()}`);
  }
  const [entero, dec = ""] = normalizado.split(".");
  return Number(entero) * 100 + Number(dec.padEnd(2, "0"));
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
