import { DateTime } from "luxon";
import { z } from "zod";
import type { PuntoCarga } from "./estados";

/** Zona del negocio. UTC−6, sin horario de verano. */
export const ZONA_NEGOCIO = "America/Guatemala";

/** Snapshot de calendario para el chrome del panel. Lo calcula el servidor. */
export const calendarioAhoraSchema = z.object({
  fechaOperacion: z.string().min(10),
  ventanaAbierta: z.boolean(),
  esSabado: z.boolean(),
});
export type CalendarioAhora = z.infer<typeof calendarioAhoraSchema>;

/** Fecha larga en español de Guatemala: "jueves 20 de agosto". */
export function formatearFechaLarga(fecha: FechaCalendario): string {
  const dt = DateTime.fromISO(String(fecha), { zone: ZONA_NEGOCIO }).setLocale(
    "es-GT",
  );
  if (!dt.isValid) return String(fecha);
  const texto = dt.toFormat("cccc d 'de' LLLL");
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

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
  /** Instantáneo UTC del próximo cierre (exclusivo). */
  getCierreVentana(now: Date): Date;
  /** Instantáneo UTC de la próxima apertura. */
  getProximaApertura(now: Date): Date;
  /** Días de calendario en zona GT entre dos instantes (antigüedad de factura). */
  diasCalendarioEntre(desde: Date, hasta: Date): number;
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

  const aperturaDelDia = (dt: DateTime): DateTime =>
    dt.startOf("day").plus({ minutes: ventana.aperturaMinutos });

  const cierreTrasApertura = (apertura: DateTime): DateTime => {
    if (ventana.cierreMinutos === 0) {
      return apertura.startOf("day").plus({ days: 1 });
    }
    if (ventana.aperturaMinutos < ventana.cierreMinutos) {
      return apertura.startOf("day").plus({ minutes: ventana.cierreMinutos });
    }
    return apertura.startOf("day").plus({
      days: 1,
      minutes: ventana.cierreMinutos,
    });
  };

  const getProximaApertura = (now: Date): Date => {
    const dt = enZona(now);
    if (!isVentanaAbierta(now)) {
      const hoy = aperturaDelDia(dt);
      if (dt < hoy) return hoy.toJSDate();
      return aperturaDelDia(dt.plus({ days: 1 })).toJSDate();
    }
    return aperturaDelDia(dt.plus({ days: 1 })).toJSDate();
  };

  const getCierreVentana = (now: Date): Date => {
    const dt = enZona(now);
    if (isVentanaAbierta(now)) {
      if (ventana.cierreMinutos === 0) {
        return dt.startOf("day").plus({ days: 1 }).toJSDate();
      }
      if (ventana.aperturaMinutos < ventana.cierreMinutos) {
        return dt
          .startOf("day")
          .plus({ minutes: ventana.cierreMinutos })
          .toJSDate();
      }
      const minutos = minutosDelDia(dt);
      if (minutos >= ventana.aperturaMinutos) {
        return dt
          .startOf("day")
          .plus({ days: 1, minutes: ventana.cierreMinutos })
          .toJSDate();
      }
      return dt.startOf("day").plus({ minutes: ventana.cierreMinutos }).toJSDate();
    }
    const proxima = DateTime.fromJSDate(getProximaApertura(now), {
      zone: ZONA_NEGOCIO,
    });
    return cierreTrasApertura(proxima).toJSDate();
  };

  const diasCalendarioEntre = (desde: Date, hasta: Date): number => {
    const a = enZona(desde).startOf("day");
    const b = enZona(hasta).startOf("day");
    return Math.round(b.diff(a, "days").days);
  };

  return {
    isVentanaAbierta,
    getFechaOperacion,
    getSiguienteDiaHabil,
    isDiaNoLaborable,
    isSabado,
    puntoCargaEfectivo,
    getCierreVentana,
    getProximaApertura,
    diasCalendarioEntre,
  };
}

export function instanteAIso(instant: Date): string {
  return (
    DateTime.fromJSDate(instant, { zone: ZONA_NEGOCIO }).toISO() ??
    instant.toISOString()
  );
}

export function horaEnZona(instant: Date): string {
  return DateTime.fromJSDate(instant, { zone: ZONA_NEGOCIO }).toFormat("HH:mm");
}

export function fechaDeInstante(instant: Date): FechaCalendario {
  return aFechaCalendario(enZona(instant));
}
