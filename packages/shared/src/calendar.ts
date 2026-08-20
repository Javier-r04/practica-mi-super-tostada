import { DateTime } from "luxon";
import type { PuntoCarga } from "./estados";

/** Zona del negocio. UTC−6, sin horario de verano. */
export const ZONA_NEGOCIO = "America/Guatemala";

export type FechaCalendario = `${number}-${number}-${number}` | string;

export type VentanaHoraria = {
  /** Minutos desde medianoche en zona GT. Default 15:00 → 900. */
  aperturaMinutos: number;
  /** Minutos desde medianoche; 0 = cierra a medianoche (exclusivo). */
  cierreMinutos: number;
};

export type BusinessCalendar = {
  isVentanaAbierta(now: Date): boolean;
  getFechaOperacion(now: Date): FechaCalendario;
  getSiguienteDiaHabil(from: Date | FechaCalendario): FechaCalendario;
  isDiaNoLaborable(fecha: Date | FechaCalendario): boolean;
  isSabado(fecha: Date | FechaCalendario): boolean;
  puntoCargaEfectivo(
    punto: PuntoCarga,
    fecha: Date | FechaCalendario,
  ): PuntoCarga;
};

const VENTANA_DEFAULT: VentanaHoraria = {
  aperturaMinutos: 15 * 60,
  cierreMinutos: 0,
};

function enZona(now: Date): DateTime {
  return DateTime.fromJSDate(now, { zone: ZONA_NEGOCIO });
}

function aFechaCalendario(dt: DateTime): FechaCalendario {
  return dt.toISODate() ?? "invalid";
}

function parseFecha(
  fecha: Date | FechaCalendario,
): DateTime {
  if (fecha instanceof Date) {
    return enZona(fecha).startOf("day");
  }
  const dt = DateTime.fromISO(fecha, { zone: ZONA_NEGOCIO });
  if (!dt.isValid) {
    throw new Error(`Fecha de calendario inválida: ${fecha}`);
  }
  return dt.startOf("day");
}

export function ventanaDesdeHoras(
  apertura: string,
  cierre: string,
): VentanaHoraria {
  return {
    aperturaMinutos: parseMinutos(apertura),
    cierreMinutos: parseMinutos(cierre),
  };
}

function parseMinutos(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + (m || 0);
}

function minutosDelDia(dt: DateTime): number {
  return dt.hour * 60 + dt.minute;
}

export function createBusinessCalendar(opts?: {
  diasNoLaborables?: Iterable<string>;
  ventana?: VentanaHoraria;
}): BusinessCalendar {
  const feriados = new Set(opts?.diasNoLaborables ?? []);
  const ventana = opts?.ventana ?? VENTANA_DEFAULT;

  const isSabado = (fecha: Date | FechaCalendario): boolean =>
    parseFecha(fecha).weekday === 6;

  const isDiaNoLaborable = (fecha: Date | FechaCalendario): boolean => {
    const dt = parseFecha(fecha);
    if (dt.weekday === 7) return true;
    const iso = aFechaCalendario(dt);
    return feriados.has(iso);
  };

  const getSiguienteDiaHabil = (
    from: Date | FechaCalendario,
  ): FechaCalendario => {
    let cursor = parseFecha(from).plus({ days: 1 });
    while (isDiaNoLaborable(aFechaCalendario(cursor))) {
      cursor = cursor.plus({ days: 1 });
    }
    return aFechaCalendario(cursor);
  };

  const isVentanaAbierta = (now: Date): boolean => {
    const minutos = minutosDelDia(enZona(now));
    if (ventana.cierreMinutos === 0) {
      return minutos >= ventana.aperturaMinutos;
    }
    if (ventana.aperturaMinutos < ventana.cierreMinutos) {
      return (
        minutos >= ventana.aperturaMinutos && minutos < ventana.cierreMinutos
      );
    }
    return (
      minutos >= ventana.aperturaMinutos || minutos < ventana.cierreMinutos
    );
  };

  const getFechaOperacion = (now: Date): FechaCalendario =>
    getSiguienteDiaHabil(aFechaCalendario(enZona(now)));

  const puntoCargaEfectivo = (
    punto: PuntoCarga,
    fecha: Date | FechaCalendario,
  ): PuntoCarga => (isSabado(fecha) ? "PLANTA" : punto);

  return {
    isVentanaAbierta,
    getFechaOperacion,
    getSiguienteDiaHabil,
    isDiaNoLaborable,
    isSabado,
    puntoCargaEfectivo,
  };
}
