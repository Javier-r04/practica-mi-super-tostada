/**
 * Utilidades de fecha solo para UI (calendario / campos).
 * No sustituyen BusinessCalendar: no deciden ventana ni fecha_operacion.
 */

const DIAS_CORTO = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sá", "Do"] as const;
const MESES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
] as const;

export function esFechaIso(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function partesFecha(iso: string): { y: number; m: number; d: number } | null {
  if (!esFechaIso(iso)) return null;
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return null;
  return { y, m, d };
}

export function aFechaIso(y: number, m: number, d: number): string {
  return `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/** Lunes = 0 … domingo = 6. Usa UTC civil para evitar desfase de zona. */
export function diaSemanaLunes0(iso: string): number {
  const p = partesFecha(iso);
  if (!p) return 0;
  const js = new Date(Date.UTC(p.y, p.m - 1, p.d)).getUTCDay();
  return (js + 6) % 7;
}

export function diasEnMes(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

export function etiquetaMesAno(y: number, m: number): string {
  return `${MESES[m - 1] ?? m} ${y}`;
}

export function etiquetasDiasCorto(): readonly string[] {
  return DIAS_CORTO;
}

export function mesAnterior(y: number, m: number): { y: number; m: number } {
  if (m === 1) return { y: y - 1, m: 12 };
  return { y, m: m - 1 };
}

export function mesSiguiente(y: number, m: number): { y: number; m: number } {
  if (m === 12) return { y: y + 1, m: 1 };
  return { y, m: m + 1 };
}

/** Celdas del mes: null = hueco antes del día 1. */
export function celdasMes(y: number, m: number): (string | null)[] {
  const total = diasEnMes(y, m);
  const offset = diaSemanaLunes0(aFechaIso(y, m, 1));
  const cells: (string | null)[] = Array.from({ length: offset }, () => null);
  for (let d = 1; d <= total; d += 1) {
    cells.push(aFechaIso(y, m, d));
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}
