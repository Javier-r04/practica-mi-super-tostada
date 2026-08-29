import { fechaDeInstante } from "@misupertostada/shared";

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

/** Date local a medianoche de calendario (para react-day-picker). */
export function dateCivilDesdeIso(iso: string): Date | null {
  const p = partesFecha(iso);
  if (!p) return null;
  return new Date(p.y, p.m - 1, p.d);
}

export function isoCivilDesdeDate(d: Date): string {
  return aFechaIso(d.getFullYear(), d.getMonth() + 1, d.getDate());
}

/** Día de calendario en America/Guatemala (no el de la zona del navegador). */
export function hoyCivilIso(now = new Date()): string {
  return fechaDeInstante(now);
}

/** Lunes = 0 … domingo = 6. Usa UTC de calendario para evitar desfase de zona. */
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

/** Lunes de la semana de calendario que contiene `iso`. */
export function inicioSemana(iso: string): string {
  const p = partesFecha(iso);
  if (!p) return iso;
  const offset = diaSemanaLunes0(iso);
  const utc = Date.UTC(p.y, p.m - 1, p.d - offset);
  const d = new Date(utc);
  return aFechaIso(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
}

/** Día 1 o 16 según la quincena de calendario de `iso`. */
export function inicioQuincena(iso: string): string {
  const p = partesFecha(iso);
  if (!p) return iso;
  return aFechaIso(p.y, p.m, p.d <= 15 ? 1 : 16);
}

/** Primer día del mes de calendario de `iso`. */
export function inicioMes(iso: string): string {
  const p = partesFecha(iso);
  if (!p) return iso;
  return aFechaIso(p.y, p.m, 1);
}

/** Domingo de la semana de calendario que contiene `iso`. */
export function finSemana(iso: string): string {
  const start = inicioSemana(iso);
  const p = partesFecha(start);
  if (!p) return iso;
  const utc = Date.UTC(p.y, p.m - 1, p.d + 6);
  const d = new Date(utc);
  return aFechaIso(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
}

/** Día 15 o último del mes según la quincena de calendario de `iso`. */
export function finQuincena(iso: string): string {
  const p = partesFecha(iso);
  if (!p) return iso;
  if (p.d <= 15) return aFechaIso(p.y, p.m, 15);
  return aFechaIso(p.y, p.m, diasEnMes(p.y, p.m));
}

/** Último día del mes de calendario de `iso`. */
export function finMes(iso: string): string {
  const p = partesFecha(iso);
  if (!p) return iso;
  return aFechaIso(p.y, p.m, diasEnMes(p.y, p.m));
}

/** Normaliza un par inclusivo (desde ≤ hasta). */
export function ordenarRango(
  a: string,
  b: string,
): { desde: string; hasta: string } {
  return a <= b ? { desde: a, hasta: b } : { desde: b, hasta: a };
}

export function diaEnRango(
  iso: string,
  desde: string,
  hasta: string,
): boolean {
  return iso >= desde && iso <= hasta;
}

/**
 * Día a mostrar al aplicar un atajo multi-día en un DateField de un solo valor.
 * Prefiere la primera ancla dentro del rango; si ninguna cae adentro, recorta.
 */
export function fechaPreferidaEnRango(
  desde: string,
  hasta: string,
  ...anclas: Array<string | undefined | null>
): string {
  for (const a of anclas) {
    if (a && diaEnRango(a, desde, hasta)) return a;
  }
  for (const a of anclas) {
    if (!a || !esFechaIso(a)) continue;
    if (a < desde) return desde;
    if (a > hasta) return hasta;
  }
  return hasta;
}

/**
 * Atajo o rango en un DateField de un solo valor: un día, no un periodo.
 */
export function isoDeCampoUnValor(
  rango: { desde: string; hasta: string },
  ...anclas: Array<string | undefined | null>
): string {
  return fechaPreferidaEnRango(rango.desde, rango.hasta, ...anclas);
}

const MESES_CORTO = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sep",
  "oct",
  "nov",
  "dic",
] as const;

/** Etiqueta corta de un día: "21 ago". */
export function etiquetaDiaCorto(iso: string): string {
  const p = partesFecha(iso);
  if (!p) return iso;
  return `${p.d} ${MESES_CORTO[p.m - 1] ?? p.m}`;
}

/**
 * Etiqueta de un día con su día de semana: "Vi 22 ago".
 * Para el chrome, donde saber *qué* día de la semana es cuesta más que el número.
 */
export function etiquetaDiaSemanaCorto(iso: string): string {
  const p = partesFecha(iso);
  if (!p) return iso;
  return `${DIAS_CORTO[diaSemanaLunes0(iso)]} ${etiquetaDiaCorto(iso)}`;
}

/**
 * Resumen de rango para el popover del calendario.
 * Mismo mes: "17 – 23 ago". Cruza mes/año: "28 dic – 3 ene".
 */
export function etiquetaRangoCorto(desde: string, hasta: string): string {
  const a = partesFecha(desde);
  const b = partesFecha(hasta);
  if (!a || !b) return `${desde} – ${hasta}`;
  if (desde === hasta) return etiquetaDiaCorto(desde);
  const mesA = MESES_CORTO[a.m - 1] ?? a.m;
  const mesB = MESES_CORTO[b.m - 1] ?? b.m;
  if (a.y === b.y && a.m === b.m) {
    return `${a.d} – ${b.d} ${mesA}`;
  }
  if (a.y === b.y) {
    return `${a.d} ${mesA} – ${b.d} ${mesB}`;
  }
  return `${a.d} ${mesA} ${a.y} – ${b.d} ${mesB} ${b.y}`;
}

export type BorradorRango = {
  desde: string | null;
  hasta: string | null;
};

/**
 * Avance del borrador en modo Personalizado (2 clics).
 * Sin inicio o con rango completo → nuevo inicio.
 * Con solo inicio → completa el fin (ordenado).
 */
export function avanzarBorradorRango(
  borrador: BorradorRango,
  iso: string,
): BorradorRango {
  if (!borrador.desde || borrador.hasta) {
    return { desde: iso, hasta: null };
  }
  const ordenado = ordenarRango(borrador.desde, iso);
  return { desde: ordenado.desde, hasta: ordenado.hasta };
}

/** Texto del preview mientras se elige el rango personalizado. */
export function etiquetaBorradorRango(borrador: BorradorRango): string {
  if (!borrador.desde) return "Elige la fecha de inicio";
  if (!borrador.hasta) {
    return `${etiquetaDiaCorto(borrador.desde)} → elige el fin`;
  }
  return etiquetaRangoCorto(borrador.desde, borrador.hasta);
}

/** Rango listo para aplicar tras elegir inicio y fin. */
export function confirmarBorradorRango(
  borrador: BorradorRango,
): { desde: string; hasta: string } | null {
  if (!borrador.desde || !borrador.hasta) return null;
  return ordenarRango(borrador.desde, borrador.hasta);
}

/**
 * Un clic en modo Personalizado (rango).
 * 1er clic → solo borrador. 2º clic → borrador completo + rango listo para aplicar.
 * No exige botón Listo: el segundo día confirma.
 */
export function clicPersonalizadoRango(
  borrador: BorradorRango | null,
  iso: string,
): {
  borrador: BorradorRango;
  rangoListo: { desde: string; hasta: string } | null;
} {
  const next = avanzarBorradorRango(
    borrador ?? { desde: null, hasta: null },
    iso,
  );
  return { borrador: next, rangoListo: confirmarBorradorRango(next) };
}

/**
 * `hoy` = la operación en curso (la que se reparte hoy).
 * `noche` = la operación en captura (la ventana que está abriendo).
 * Los dos coinciden buena parte del día y se separan entre las 03:00 y las
 * 15:00; por eso son atajos distintos y no uno solo llamado «hoy».
 */
export type PresetCalendario =
  | "hoy"
  | "noche"
  | "semana"
  | "quincena"
  | "mes"
  | "personalizado";

export const PRESETS_CALENDARIO: PresetCalendario[] = [
  "hoy",
  "semana",
  "quincena",
  "mes",
  "personalizado",
];

/** Atajos de las pantallas de operación, donde «esta noche» es accionable. */
export const PRESETS_OPERACION: PresetCalendario[] = [
  "hoy",
  "noche",
  "semana",
  "quincena",
  "mes",
  "personalizado",
];

export function rangoUiDePreset(
  id: PresetCalendario,
  ancla: string,
  now?: Date,
): { desde: string; hasta: string } | null {
  if (id === "personalizado") return null;
  // `noche` depende de la operación en captura, que solo conoce el llamador.
  if (id === "noche") return null;
  if (id === "hoy") {
    const hoy = hoyCivilIso(now);
    return { desde: hoy, hasta: hoy };
  }
  if (id === "semana") {
    return { desde: inicioSemana(ancla), hasta: finSemana(ancla) };
  }
  if (id === "quincena") {
    return { desde: inicioQuincena(ancla), hasta: finQuincena(ancla) };
  }
  return { desde: inicioMes(ancla), hasta: finMes(ancla) };
}

/** Mapea el atajo del popover al periodo del tablero. */
export function periodoDePresetCalendario(
  id: PresetCalendario,
): "hoy" | "semana" | "quincena" | "mes" | "rango" {
  if (id === "personalizado") return "rango";
  // El tablero no tiene periodo «noche»: es un día suelto.
  if (id === "noche") return "rango";
  return id;
}

/** Texto del trigger: rango si hay dos extremos, si no el ISO. */
export function etiquetaTriggerFecha(
  value: string,
  rangeEnd?: string,
): string {
  if (value && rangeEnd) return etiquetaRangoCorto(value, rangeEnd);
  return value;
}
