import { DateTime } from "luxon";
import { z } from "zod";
import type { PuntoCarga } from "./estados";

/** Zona del negocio. UTC−6, sin horario de verano. */
export const ZONA_NEGOCIO = "America/Guatemala";

export const DIA_ESTADOS_CALENDARIO = [
  "SIN_CIERRE",
  "CERRADO",
  "REABIERTO",
] as const;
export type DiaEstadoCalendario = (typeof DIA_ESTADOS_CALENDARIO)[number];

/** Snapshot de calendario para el chrome del panel. Lo calcula el servidor. */
export const calendarioAhoraSchema = z.object({
  fechaOperacion: z.string().min(10),
  ventanaAbierta: z.boolean(),
  capturaAbierta: z.boolean(),
  diaEstado: z.enum(DIA_ESTADOS_CALENDARIO),
  versionHoja: z.number().int().nullable(),
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

/** Nombre del día en mayúsculas para el consolidado: "SÁBADO". */
export function nombreDiaOperacion(fecha: FechaCalendario): string {
  const dt = DateTime.fromISO(String(fecha), { zone: ZONA_NEGOCIO }).setLocale(
    "es-GT",
  );
  if (!dt.isValid) return String(fecha);
  return dt.toFormat("cccc").toLocaleUpperCase("es-GT");
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
  /**
   * Fecha de la ventana que acaba de cerrar. A las 00:00 del 21,
   * `getFechaOperacion` ya es el 22; esto sigue siendo el 21.
   */
  getFechaOperacionDeVentanaReciente(now: Date): FechaCalendario;
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
  /** Días de calendario GT entre dos instantes (antigüedad de factura). */
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

  const getFechaOperacionDeVentanaReciente = (
    now: Date,
  ): FechaCalendario => {
    if (isVentanaAbierta(now)) return getFechaOperacion(now);
    const dt = enZona(now);
    if (minutosDelDia(dt) < ventana.aperturaMinutos) {
      return getSiguienteDiaHabil(aFechaCalendario(dt.minus({ days: 1 })));
    }
    return getSiguienteDiaHabil(aFechaCalendario(dt));
  };

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
    getFechaOperacionDeVentanaReciente,
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

/**
 * Saludo del portal según hora de Guatemala.
 * Antes de las 18:00 → "tardes"; desde las 18:00 → "noches".
 * Lo decide el servidor; el browser no elige.
 */
export function saludoPortalDe(instant: Date): "tardes" | "noches" {
  const hour = DateTime.fromJSDate(instant, { zone: ZONA_NEGOCIO }).hour;
  return hour < 18 ? "tardes" : "noches";
}

export function fechaDeInstante(instant: Date): FechaCalendario {
  return aFechaCalendario(enZona(instant));
}

/** Inicio del día de calendario en America/Guatemala, como instante UTC. */
export function instanteDeFecha(fecha: FechaCalendario): Date {
  return parseFecha(fecha).toJSDate();
}

/** Suma (o resta) días de calendario en zona GT. El reloj no interviene. */
export function desplazarFecha(
  fecha: FechaCalendario,
  dias: number,
): FechaCalendario {
  const dt = parseFecha(fecha);
  return aFechaCalendario(dt.plus({ days: dias }));
}

/**
 * Lunes–domingo de la semana ISO que contiene `fecha`, en America/Guatemala.
 * Luxon weekday: 1 = lunes … 7 = domingo.
 */
export function rangoSemanaIsoGT(fecha: FechaCalendario): {
  desde: FechaCalendario;
  hasta: FechaCalendario;
} {
  const dt = parseFecha(fecha);
  const lunes = dt.minus({ days: dt.weekday - 1 });
  return {
    desde: aFechaCalendario(lunes),
    hasta: aFechaCalendario(lunes.plus({ days: 6 })),
  };
}
