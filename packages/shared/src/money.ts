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
 * Convierte texto de quetzales a centavos enteros.
 * Acepta `12.50`, `12,50`, `Q 12.50`, `1,240.50` (como `formatearCentavos`)
 * y un punto/coma suelto al final. Nunca más de dos decimales. El float no entra al stack.
 */
export function quetzalesTextoACentavos(texto: string): number {
  const recortado = texto
    .trim()
    .replace(/^Q\s*/i, "")
    .replace(/[\s\u00A0\u202F]/g, "");
  if (recortado === "") {
    throw new Error("El precio está vacío");
  }
  let candidato = recortado;
  if (/^\d{1,3}(,\d{3})+(\.\d{1,2})?$/.test(candidato)) {
    candidato = candidato.replace(/,/g, "");
  } else if (/^\d+[.,]$/.test(candidato)) {
    candidato = candidato.slice(0, -1);
  } else if (/^\d+,\d{1,2}$/.test(candidato)) {
    candidato = candidato.replace(",", ".");
  }
  if (!/^\d+(\.\d{1,2})?$/.test(candidato)) {
    throw new Error(`Precio inválido: ${texto.trim()}`);
  }
  const [entero, dec = ""] = candidato.split(".");
  return Number(entero) * 100 + Number(dec.padEnd(2, "0"));
}

export function formatearCentavos(
  centavos: number,
  { simbolo = true, miles = true }: { simbolo?: boolean; miles?: boolean } = {},
): string {
  if (!Number.isInteger(centavos)) {
    throw new Error(
      `formatearCentavos: se esperaba un entero en centavos, recibido ${String(centavos)}`,
    );
  }
  const n = Math.abs(centavos);
  let entero = Math.floor(n / 100).toString();
  if (miles) {
    entero = entero.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }
  const dec = String(n % 100).padStart(2, "0");
  const signo = centavos < 0 ? "−" : "";
  return `${signo}${simbolo ? "Q " : ""}${entero}.${dec}`;
}
