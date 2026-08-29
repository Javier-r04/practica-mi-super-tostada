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

/**
 * ¿Se puede escribir en la operación de captura ahora mismo?
 *
 * Regla única para panel y portal. El reloj no manda solo: un día REABIERTO
 * acepta captura aunque su ventana ya venciera —eso es exactamente lo que
 * significa reabrirlo— y `exigirDiaNoCerrado` solo bloquea CERRADO. Cuando el
 * portal evaluaba `isVentanaAbierta` a secas, el cliente seguía viendo
 * «ventana cerrada» después de que el admin reabriera el día, contradiciendo
 * lo que el propio API le habría dejado guardar.
 */
export function capturaAbierta(
  ventanaAbierta: boolean,
  estado: DiaEstadoCalendario,
): boolean {
  if (estado === "REABIERTO") return true;
  return ventanaAbierta && estado !== "CERRADO";
}

/**
 * Snapshot de calendario para el chrome del panel. Lo calcula el servidor.
 *
 * Hay **tres** ejes de fecha y no son intercambiables. Cada pantalla debe
 * anclarse al que corresponde a su trabajo:
 *
 * - **Captura** (`fechaOperacionCaptura`): la ventana en la que se escribe
 *   ahora. Es la que valida el portal y a la que se suman pedidos nuevos.
 * - **En curso** (`fechaOperacionEnCurso`): la operación que ya cerró y se
 *   está produciendo / repartiendo / cobrando hoy. Es la que ve `/hoy`,
 *   `/produccion` y el cierre.
 * - **Día de calendario** (`hoyCivil`): el día de calendario en Guatemala. Es el eje de
 *   la caja (`pago.fecha`), la antigüedad de factura y el tablero.
 *
 * Entre las 15:00 y las 03:00 los tres pueden ser distintos. Nunca uses uno
 * como sustituto de otro «porque casi siempre coinciden».
 */
export const calendarioAhoraSchema = z.object({
  /** Ventana que se puede escribir ahora (o la próxima si está cerrada). */
  fechaOperacionCaptura: z.string().min(10),
  /** Día de reparto de la operación en captura. */
  fechaEntregaCaptura: z.string().min(10),
  /** Operación que se reparte y se cobra hoy. */
  fechaOperacionEnCurso: z.string().min(10),
  /** Día de reparto de la operación en curso. Normalmente `hoyCivil`. */
  fechaEntregaEnCurso: z.string().min(10),
  /** Día de calendario en America/Guatemala. */
  hoyCivil: z.string().min(10),
  /** `true` cuando captura y en curso son la misma operación. */
  mismaOperacion: z.boolean(),
  ventanaAbierta: z.boolean(),
  capturaAbierta: z.boolean(),
  /** Estado de la operación **en captura**. */
  diaEstado: z.enum(DIA_ESTADOS_CALENDARIO),
  /** Estado de la operación **en curso**. */
  diaEstadoEnCurso: z.enum(DIA_ESTADOS_CALENDARIO),
  versionHoja: z.number().int().nullable(),
  /** Sábado de la operación en captura: la carga sale toda de planta. */
  esSabado: z.boolean(),
  /**
   * Horario de referencia del día. `null` cuando `ventana_semanal` no tiene
   * filas: no hay horario que mostrar y el panel pide configurarlo, en vez de
   * inventar uno que compita con el del admin.
   */
  horarioApertura: z.string().regex(/^\d{2}:\d{2}$/).nullable(),
  horarioCierre: z.string().regex(/^\d{2}:\d{2}$/).nullable(),
  cierraAt: z.string().nullable().optional(),
  proximaAperturaAt: z.string().nullable().optional(),
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

/** Luxon: 1 = lunes … 7 = domingo. */
export type WeekdayIso = 1 | 2 | 3 | 4 | 5 | 6 | 7;

/** Horario de un weekday. `null` en el mapa = esa noche el portal no abre. */
export type VentanaDia = {
  aperturaMinutos: number;
  cierreMinutos: number;
  /** El cierre es del día de calendario siguiente. */
  cruzaMedianoche: boolean;
};

export type VentanasPorDia = Partial<Record<WeekdayIso, VentanaDia | null>>;

export type BusinessCalendar = {
  isVentanaAbierta(now: Date): boolean;
  getFechaOperacion(now: Date): FechaCalendario;
  /**
   * Fecha de la ventana que acaba de cerrar. A las 00:00 del 21,
   * `getFechaOperacion` ya es el 21; esto sigue siendo el 20.
   */
  getFechaOperacionDeVentanaReciente(now: Date): FechaCalendario;
  getSiguienteDiaHabil(from: Date | FechaCalendario): FechaCalendario;
  /**
   * Día de reparto de una operación: el siguiente día activo después del día
   * en que abrió la ventana. Salta feriados y weekdays sin ventana.
   */
  getFechaEntrega(fechaOperacion: Date | FechaCalendario): FechaCalendario;
  /**
   * Operación **en curso** en un día dado: la que se reparte ese día.
   * Inversa de `getFechaEntrega`. A diferencia de
   * `getFechaOperacionDeVentanaReciente`, no depende de si hay una ventana
   * abierta, así que no salta de operación cuando abre la siguiente a las
   * 15:00: sigue siendo la que Tony está repartiendo.
   *
   * Si ese día no se reparte (domingo, feriado), devuelve la última operación
   * que ya se repartió.
   */
  getOperacionQueEntregaEn(fecha: Date | FechaCalendario): FechaCalendario;
  isDiaNoLaborable(fecha: Date | FechaCalendario): boolean;
  isSabado(fecha: Date | FechaCalendario): boolean;
  puntoCargaEfectivo(
    punto: PuntoCarga,
    fecha: Date | FechaCalendario,
  ): PuntoCarga;
  /** Instantáneo UTC del próximo cierre (exclusivo). `null` sin ventana configurada. */
  getCierreVentana(now: Date): Date | null;
  /**
   * Instante en que cerró (o cerrará) la ventana de **una operación concreta**.
   * A diferencia de `getCierreVentana`, no depende de `now`: sirve para
   * preguntar por operaciones viejas, que es lo que necesita el barrido de
   * cierres atrasados. `null` si ese día no tenía ventana (feriado o weekday
   * apagado), en cuyo caso no hay nada que cerrar.
   */
  getFinVentanaDeOperacion(fechaOperacion: Date | FechaCalendario): Date | null;
  /**
   * Instante a partir del cual el cron puede volver a cerrar un día reabierto.
   *
   * Es **el cierre de su propia ventana** —un día reabierto termina cuando
   * termina cualquier otro—, nunca antes de `MARGEN_MINIMO_REAPERTURA_MINUTOS`
   * desde la reapertura, para que una corrección en curso no se cierre debajo.
   *
   * El ancla no puede ser la próxima apertura de ventana: la entrega de una
   * operación cae al día siguiente y esa apertura son las 15:00 de ese mismo
   * día, o sea después de que Alex produjo y Tony salió. Llegaría siempre
   * tarde. El cierre de la ventana propia es el último instante que todavía
   * deja la hoja lista antes de la madrugada de producción.
   */
  getLimiteDeReapertura(
    fechaOperacion: Date | FechaCalendario,
    reabiertoAt: Date,
  ): Date;
  /** Instantáneo UTC de la próxima apertura. `null` sin ventana configurada. */
  getProximaApertura(now: Date): Date | null;
  /** Horario del día de calendario (o el próximo día con ventana). `null` si la semana está apagada. */
  getHorarioReferencia(now: Date): { apertura: string; cierre: string } | null;
  /** Días de calendario GT entre dos instantes (antigüedad de factura). */
  diasCalendarioEntre(desde: Date, hasta: Date): number;
};

/** Tope de barrido al buscar días activos. Evita colgarse con la semana apagada. */
const DIAS_BUSQUEDA = 14;

/**
 * Gracia mínima de una reapertura antes de que el cron pueda volver a cerrarla.
 *
 * El ancla real es el cierre de la ventana del día, pero sola da una gracia que
 * depende del azar: reabrir a las 02:50 con la ventana cerrando a las 03:00
 * dejaría diez minutos para corregir. Este piso hace que la gracia nunca sea
 * menor a una corrección razonable.
 */
export const MARGEN_MINIMO_REAPERTURA_MINUTOS = 60;

/**
 * Solo se usa cuando `createBusinessCalendar` recibe `{ventana}` o nada, que en
 * la práctica es la entrada de los tests unitarios. La fuente de verdad en
 * producción es `ventana_semanal`; el horario de fábrica en TypeScript vive en
 * `HORARIO_SEMANAL_DEFAULT` (`./configuracion`), que no se importa aquí para no
 * cerrar el ciclo de módulos.
 */
const VENTANA_DEFAULT: VentanaHoraria = {
  aperturaMinutos: 15 * 60,
  cierreMinutos: 3 * 60,
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

function asWeekday(n: number): WeekdayIso {
  return (n === 7 ? 7 : n) as WeekdayIso;
}

function cruzaDe(ventana: VentanaHoraria): boolean {
  return (
    ventana.cierreMinutos === 0 ||
    ventana.cierreMinutos <= ventana.aperturaMinutos
  );
}

function mapaDesdeVentana(
  ventana: VentanaHoraria,
): Record<WeekdayIso, VentanaDia | null> {
  const dia: VentanaDia = {
    aperturaMinutos: ventana.aperturaMinutos,
    cierreMinutos: ventana.cierreMinutos,
    cruzaMedianoche: cruzaDe(ventana),
  };
  return {
    1: dia,
    2: dia,
    3: dia,
    4: dia,
    5: dia,
    6: dia,
    7: null,
  };
}

function mapaDesdePorDia(
  porDia: VentanasPorDia,
): Record<WeekdayIso, VentanaDia | null> {
  return {
    1: porDia[1] ?? null,
    2: porDia[2] ?? null,
    3: porDia[3] ?? null,
    4: porDia[4] ?? null,
    5: porDia[5] ?? null,
    6: porDia[6] ?? null,
    7: porDia[7] ?? null,
  };
}

type IntervaloVentana = {
  start: DateTime;
  end: DateTime;
  fechaApertura: FechaCalendario;
};

export function minutosAHhmm(minutos: number): string {
  const h = Math.floor(minutos / 60) % 24;
  const m = minutos % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function createBusinessCalendar(opts?: {
  diasNoLaborables?: Iterable<string>;
  ventana?: VentanaHoraria;
  ventanasPorDia?: VentanasPorDia;
  /**
   * Si el horario se adelantó a mitad del día, no reabrir el intervalo
   * cuyo inicio ya pasó. Solo «reabrir día» acepta pedidos fuera de reloj.
   */
  noAbrirHasta?: Date;
}): BusinessCalendar {
  const feriados = new Set(opts?.diasNoLaborables ?? []);
  const mapa = opts?.ventanasPorDia
    ? mapaDesdePorDia(opts.ventanasPorDia)
    : mapaDesdeVentana(opts?.ventana ?? VENTANA_DEFAULT);

  const isSabado = (fecha: Date | FechaCalendario): boolean =>
    parseFecha(fecha).weekday === 6;

  /** Sin ventana configurada ese weekday, o feriado. Domingo es solo un caso más. */
  const isDiaNoLaborable = (fecha: Date | FechaCalendario): boolean => {
    const dt = parseFecha(fecha);
    if (mapa[asWeekday(dt.weekday)] == null) return true;
    return feriados.has(aFechaCalendario(dt));
  };

  /** Avanza hasta el primer día activo. Acotado: la semana puede estar toda apagada. */
  const avanzarADiaHabil = (desde: DateTime): DateTime => {
    let cursor = desde;
    for (let i = 0; i < DIAS_BUSQUEDA; i++) {
      if (!isDiaNoLaborable(aFechaCalendario(cursor))) return cursor;
      cursor = cursor.plus({ days: 1 });
    }
    return desde;
  };

  const getSiguienteDiaHabil = (
    from: Date | FechaCalendario,
  ): FechaCalendario =>
    aFechaCalendario(avanzarADiaHabil(parseFecha(from).plus({ days: 1 })));

  const getFechaEntrega = (
    fechaOperacion: Date | FechaCalendario,
  ): FechaCalendario => getSiguienteDiaHabil(fechaOperacion);

  const getOperacionQueEntregaEn = (
    fecha: Date | FechaCalendario,
  ): FechaCalendario => {
    const dia = parseFecha(fecha);
    const iso = aFechaCalendario(dia);
    for (let i = 1; i <= DIAS_BUSQUEDA; i++) {
      const cand = aFechaCalendario(dia.minus({ days: i }));
      if (isDiaNoLaborable(cand)) continue;
      const entrega = getFechaEntrega(cand);
      // `<` cubre el caso en que `fecha` no es día de reparto: la última que ya salió.
      if (entrega <= iso) return cand;
    }
    return aFechaCalendario(dia.minus({ days: 1 }));
  };

  const intervaloDelDia = (dia: DateTime): IntervaloVentana | null => {
    const iso = aFechaCalendario(dia);
    if (feriados.has(iso)) return null;
    const cfg = mapa[asWeekday(dia.weekday)];
    if (!cfg) return null;
    const start = dia.startOf("day").plus({ minutes: cfg.aperturaMinutos });
    const cruza =
      cfg.cruzaMedianoche ||
      cfg.cierreMinutos === 0 ||
      cfg.cierreMinutos <= cfg.aperturaMinutos;
    const end = cruza
      ? dia.startOf("day").plus({ days: 1, minutes: cfg.cierreMinutos })
      : dia.startOf("day").plus({ minutes: cfg.cierreMinutos });
    return {
      start,
      end,
      fechaApertura: aFechaCalendario(dia),
    };
  };

  const vigente = (now: Date): IntervaloVentana | null => {
    const dt = enZona(now);
    const hoy = dt.startOf("day");
    const tope = opts?.noAbrirHasta
      ? DateTime.fromJSDate(opts.noAbrirHasta, { zone: ZONA_NEGOCIO })
      : null;
    for (const dia of [hoy.minus({ days: 1 }), hoy]) {
      const iv = intervaloDelDia(dia);
      if (iv && dt >= iv.start && dt < iv.end) {
        if (tope && dt < tope) return null;
        return iv;
      }
    }
    return null;
  };

  const isVentanaAbierta = (now: Date): boolean => vigente(now) != null;

  /**
   * Día de operación = dueño de la ventana abierta (el día que abrió),
   * no el día de calendario de la madrugada. Si no hay ventana, el día de calendario hábil.
   */
  const getFechaOperacion = (now: Date): FechaCalendario => {
    const abierta = vigente(now);
    if (abierta) return abierta.fechaApertura;
    return aFechaCalendario(avanzarADiaHabil(enZona(now).startOf("day")));
  };

  const getFechaOperacionDeVentanaReciente = (
    now: Date,
  ): FechaCalendario => {
    if (isVentanaAbierta(now)) return getFechaOperacion(now);
    const dt = enZona(now);
    for (let i = 0; i < DIAS_BUSQUEDA; i++) {
      const dia = dt.startOf("day").minus({ days: i });
      const iv = intervaloDelDia(dia);
      if (iv && dt >= iv.end) {
        return iv.fechaApertura;
      }
    }
    return getFechaOperacion(now);
  };

  const puntoCargaEfectivo = (
    punto: PuntoCarga,
    fecha: Date | FechaCalendario,
  ): PuntoCarga => (isSabado(fecha) ? "PLANTA" : punto);

  const getProximaApertura = (now: Date): Date | null => {
    const dt = enZona(now);
    for (let i = 0; i < DIAS_BUSQUEDA; i++) {
      const dia = dt.startOf("day").plus({ days: i });
      const iv = intervaloDelDia(dia);
      if (!iv) continue;
      if (feriados.has(iv.fechaApertura)) continue;
      if (dt < iv.start) return iv.start.toJSDate();
    }
    // Semana entera apagada: no hay próxima apertura que prometer.
    return null;
  };

  const getHorarioReferencia = (
    now: Date,
  ): { apertura: string; cierre: string } | null => {
    const abierta = vigente(now);
    // Dentro de la madrugada de una ventana que cruza, el horario vigente es el
    // del día que abrió, no el del día de calendario de hoy.
    const dt = abierta ? parseFecha(abierta.fechaApertura) : enZona(now);
    for (let i = 0; i < 7; i++) {
      const dia = dt.startOf("day").plus({ days: i });
      const cfg = mapa[asWeekday(dia.weekday)];
      if (!cfg) continue;
      return {
        apertura: minutosAHhmm(cfg.aperturaMinutos),
        cierre: minutosAHhmm(cfg.cierreMinutos),
      };
    }
    return null;
  };

  const getCierreVentana = (now: Date): Date | null => {
    const abierta = vigente(now);
    if (abierta) return abierta.end.toJSDate();
    const siguiente = getProximaApertura(now);
    if (!siguiente) return null;
    const proxima = DateTime.fromJSDate(siguiente, { zone: ZONA_NEGOCIO });
    const iv = intervaloDelDia(proxima.startOf("day"));
    return iv ? iv.end.toJSDate() : null;
  };

  const getFinVentanaDeOperacion = (
    fechaOperacion: Date | FechaCalendario,
  ): Date | null => {
    const iv = intervaloDelDia(parseFecha(fechaOperacion));
    return iv ? iv.end.toJSDate() : null;
  };

  const getLimiteDeReapertura = (
    fechaOperacion: Date | FechaCalendario,
    reabiertoAt: Date,
  ): Date => {
    const piso = DateTime.fromJSDate(reabiertoAt, { zone: ZONA_NEGOCIO })
      .plus({ minutes: MARGEN_MINIMO_REAPERTURA_MINUTOS })
      .toJSDate();
    // Un día sin ventana (feriado, weekday apagado) no tiene cierre propio del
    // que colgarse: manda solo el piso.
    const fin = getFinVentanaDeOperacion(fechaOperacion);
    if (!fin) return piso;
    return fin.getTime() >= piso.getTime() ? fin : piso;
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
    getFechaEntrega,
    getOperacionQueEntregaEn,
    isDiaNoLaborable,
    isSabado,
    puntoCargaEfectivo,
    getCierreVentana,
    getFinVentanaDeOperacion,
    getLimiteDeReapertura,
    getProximaApertura,
    getHorarioReferencia,
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
