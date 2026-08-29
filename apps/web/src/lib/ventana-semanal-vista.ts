import {
  WEEKDAY_ETIQUETA,
  haySolapeVentanaSemanal,
  ventanaSemanalSchema,
  type VentanaDiaDto,
  type WeekdayIso,
} from "@misupertostada/shared";

const SIGUIENTE: Record<WeekdayIso, WeekdayIso> = {
  1: 2,
  2: 3,
  3: 4,
  4: 5,
  5: 6,
  6: 7,
  7: 1,
};

function minutos(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + (m || 0);
}

function cruza(dia: VentanaDiaDto): boolean {
  const a = minutos(dia.apertura);
  const c = minutos(dia.cierre);
  return dia.cruzaMedianoche || c === 0 || c <= a;
}

export function etiquetaCierre(dia: VentanaDiaDto): string {
  const hora = dia.cierre.slice(0, 5);
  if (cruza(dia)) {
    const next = WEEKDAY_ETIQUETA[SIGUIENTE[dia.weekday as WeekdayIso]].toLowerCase();
    return `cierra el ${next} a las ${hora}`;
  }
  return `cierra a las ${hora}`;
}

export function etiquetaFilaVentana(dia: VentanaDiaDto): string {
  const nombre = WEEKDAY_ETIQUETA[dia.weekday as WeekdayIso];
  if (!dia.activa) return `${nombre} · inactivo`;
  return `${nombre} abre ${dia.apertura.slice(0, 5)} · ${etiquetaCierre(dia)}`;
}

export function errorVentanaSemanal(dias: VentanaDiaDto[]): string | null {
  const parsed = ventanaSemanalSchema.safeParse({ dias });
  if (parsed.success) return null;
  return parsed.error.issues[0]?.message ?? "Horario inválido";
}

export function haySolapeUi(dias: VentanaDiaDto[]): boolean {
  return haySolapeVentanaSemanal(dias);
}
