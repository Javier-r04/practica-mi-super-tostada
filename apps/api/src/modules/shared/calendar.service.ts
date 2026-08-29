import { Inject, Injectable } from "@nestjs/common";
import {
  createBusinessCalendar,
  fechaDeInstante,
  systemClock,
  ventanaDesdeHoras,
  type BusinessCalendar,
  type Clock,
  type DiaEstadoCalendario,
  type VentanaDia,
  type VentanasPorDia,
  type WeekdayIso,
} from "@misupertostada/shared";
import { diaNoLaborable, organizacion, ventanaSemanal } from "@misupertostada/db";
import { eq } from "drizzle-orm";
import { CLOCK, DRIZZLE } from "./tokens";
import { leerEstadoDia } from "./dia-operacion";
import type { AppDatabase } from "./database.module";

/**
 * Los tres ejes de fecha del negocio, resueltos de una sola vez.
 *
 * Existe para que ninguna pantalla vuelva a improvisar «hoy»: cada consumidor
 * pide el eje que le toca. Ver el docblock de `calendarioAhoraSchema`.
 */
export type EjesOperacion = {
  /** Ventana que se puede escribir ahora (o la próxima). */
  captura: string;
  entregaCaptura: string;
  estadoCaptura: DiaEstadoCalendario;
  versionHojaCaptura: number | null;
  /** Operación que se reparte y se cobra hoy. No salta a las 15:00. */
  enCurso: string;
  entregaEnCurso: string;
  estadoEnCurso: DiaEstadoCalendario;
  /** Día de calendario en America/Guatemala. */
  hoyCivil: string;
  mismaOperacion: boolean;
  ventanaAbierta: boolean;
  /**
   * Operación cuyo trabajo está activo ahora: capturar mientras la ventana
   * está abierta, repartir cuando cerró. Es el default de las pantallas de
   * operación y el espejo de `fechaDefectoHoy` en la web: una sola regla.
   */
  fechaFoco: string;
};

function asWeekday(n: number): WeekdayIso {
  return n as WeekdayIso;
}

function filaAVentana(row: {
  activa: boolean;
  apertura: string;
  cierre: string;
  cruzaMedianoche: boolean;
}): VentanaDia | null {
  if (!row.activa) return null;
  const base = ventanaDesdeHoras(row.apertura, row.cierre);
  return {
    aperturaMinutos: base.aperturaMinutos,
    cierreMinutos: base.cierreMinutos,
    cruzaMedianoche: row.cruzaMedianoche,
  };
}

@Injectable()
export class BusinessCalendarService {
  constructor(
    @Inject(DRIZZLE) private readonly db: AppDatabase,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  now(): Date {
    return this.clock.now();
  }

  /**
   * Resuelve captura / en curso / día de calendario para una organización.
   *
   * La captura respeta «reabrir día»: con la ventana cerrada pero el día
   * reabierto, se sigue capturando sobre esa operación. El eje en curso es
   * puramente de calendario (la operación cuyo reparto cae hoy), así que no
   * depende del reloj de la ventana.
   */
  async ejes(organizacionId: string): Promise<EjesOperacion> {
    const cal = await this.load(organizacionId);
    const now = this.now();
    const ventanaAbierta = cal.isVentanaAbierta(now);
    const hoyCivil = fechaDeInstante(now);

    let captura = cal.getFechaOperacion(now);
    let estado = await leerEstadoDia(this.db, organizacionId, captura);
    if (!ventanaAbierta) {
      const reciente = cal.getFechaOperacionDeVentanaReciente(now);
      const estadoReciente = await leerEstadoDia(
        this.db,
        organizacionId,
        reciente,
      );
      if (estadoReciente.diaEstado === "REABIERTO") {
        captura = reciente;
        estado = estadoReciente;
      }
    }

    const enCurso = cal.getOperacionQueEntregaEn(hoyCivil);
    const estadoEnCurso =
      enCurso === captura
        ? estado
        : await leerEstadoDia(this.db, organizacionId, enCurso);

    return {
      captura,
      entregaCaptura: cal.getFechaEntrega(captura),
      estadoCaptura: estado.diaEstado,
      versionHojaCaptura: estado.versionHoja,
      enCurso,
      entregaEnCurso: cal.getFechaEntrega(enCurso),
      estadoEnCurso: estadoEnCurso.diaEstado,
      hoyCivil,
      mismaOperacion: captura === enCurso,
      ventanaAbierta,
      fechaFoco: ventanaAbierta ? captura : enCurso,
    };
  }

  async load(
    organizacionId?: string,
    opts?: { ignorarSupresion?: boolean },
  ): Promise<BusinessCalendar> {
    const [org] = organizacionId
      ? await this.db
          .select()
          .from(organizacion)
          .where(eq(organizacion.id, organizacionId))
          .limit(1)
      : await this.db.select().from(organizacion).limit(1);
    const feriados = org
      ? await this.db
          .select({ fecha: diaNoLaborable.fecha })
          .from(diaNoLaborable)
          .where(eq(diaNoLaborable.organizacionId, org.id))
      : [];
    const semanal = org
      ? await this.db
          .select()
          .from(ventanaSemanal)
          .where(eq(ventanaSemanal.organizacionId, org.id))
      : [];

    const noAbrirHasta =
      opts?.ignorarSupresion || !org?.ventanaNoAbrirHasta
        ? undefined
        : org.ventanaNoAbrirHasta;

    /*
     * `ventana_semanal` es la única fuente de horario. Sin filas —solo posible
     * si alguien las borra a mano— el mapa queda vacío y `createBusinessCalendar`
     * apaga los siete días: ventana cerrada y `getHorarioReferencia()` nulo.
     * Es honesto, y no inventa un horario que compita con el del admin.
     */
    const ventanasPorDia: VentanasPorDia = {};
    for (const row of semanal) {
      ventanasPorDia[asWeekday(row.weekday)] = filaAVentana(row);
    }
    return createBusinessCalendar({
      diasNoLaborables: feriados.map((f) => f.fecha),
      ventanasPorDia,
      noAbrirHasta,
    });
  }
}

export const clockProvider = {
  provide: CLOCK,
  useValue: systemClock,
};
