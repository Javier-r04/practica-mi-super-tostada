import { Inject, Injectable } from "@nestjs/common";
import { eq } from "drizzle-orm";
import { organizacion, ventanaSemanal } from "@misupertostada/db";
import {
  HORARIO_SEMANAL_DEFAULT,
  ventanaSemanalSchema,
  type VentanaSemanal,
} from "@misupertostada/shared";
import { DRIZZLE } from "./tokens";
import type { AppDatabase } from "./database.module";
import { AuditWriter } from "./audit.writer";
import { parseBody } from "./zod-body";
import type { Actor } from "../identity/actor";
import { BusinessCalendarService } from "./calendar.service";

function hhmm(t: string): string {
  return t.slice(0, 5);
}

@Injectable()
export class ConfiguracionService {
  constructor(
    @Inject(DRIZZLE) private readonly db: AppDatabase,
    private readonly audit: AuditWriter,
    private readonly calendar: BusinessCalendarService,
  ) {}

  /**
   * Horario guardado de la organización.
   *
   * Con las 7 filas devuelve lo guardado. Con menos —una instalación a la que
   * nunca se le sembró la ventana— devuelve `HORARIO_SEMANAL_DEFAULT` como
   * **borrador del formulario**, no como horario vigente: el calendario sigue
   * viendo la semana apagada hasta que el admin pulse Guardar. Así hay una sola
   * fuente de verdad y a la vez `/configuracion` es usable.
   */
  async leerVentana(organizacionId: string): Promise<VentanaSemanal> {
    const rows = await this.db
      .select()
      .from(ventanaSemanal)
      .where(eq(ventanaSemanal.organizacionId, organizacionId));
    if (rows.length === 7) {
      return ventanaSemanalSchema.parse({
        dias: [...rows]
          .sort((a, b) => a.weekday - b.weekday)
          .map((r) => ({
            weekday: r.weekday,
            activa: r.activa,
            apertura: hhmm(r.apertura),
            cierre: hhmm(r.cierre),
            cruzaMedianoche: r.cruzaMedianoche,
          })),
      });
    }
    return ventanaSemanalSchema.parse({ dias: HORARIO_SEMANAL_DEFAULT });
  }

  async guardarVentana(
    body: unknown,
    actor: Actor,
  ): Promise<VentanaSemanal> {
    const input = parseBody(ventanaSemanalSchema, body);
    const antes = await this.leerVentana(actor.organizacionId);
    const now = this.calendar.now();
    const abiertaAntes = (
      await this.calendar.load(actor.organizacionId)
    ).isVentanaAbierta(now);
    await this.db.transaction(async (tx) => {
      for (const dia of input.dias) {
        await tx
          .insert(ventanaSemanal)
          .values({
            organizacionId: actor.organizacionId,
            weekday: dia.weekday,
            activa: dia.activa,
            apertura: dia.apertura,
            cierre: dia.cierre,
            cruzaMedianoche: dia.cruzaMedianoche,
          })
          .onConflictDoUpdate({
            target: [ventanaSemanal.organizacionId, ventanaSemanal.weekday],
            set: {
              activa: dia.activa,
              apertura: dia.apertura,
              cierre: dia.cierre,
              cruzaMedianoche: dia.cruzaMedianoche,
            },
          });
      }
    });
    const calNuevo = await this.calendar.load(actor.organizacionId, {
      ignorarSupresion: true,
    });
    const habriaAbierta = calNuevo.isVentanaAbierta(now);
    const noAbrirHasta =
      !abiertaAntes && habriaAbierta ? calNuevo.getCierreVentana(now) : null;
    await this.db
      .update(organizacion)
      .set({ ventanaNoAbrirHasta: noAbrirHasta })
      .where(eq(organizacion.id, actor.organizacionId));
    const despues = await this.leerVentana(actor.organizacionId);
    await this.audit.insert({
      actorTipo: "usuario",
      actorId: actor.usuarioId,
      accion: "ventana.configurar",
      entidad: "ventana_semanal",
      entidadId: actor.organizacionId,
      antes,
      despues,
      ip: actor.ip,
      userAgent: actor.userAgent,
    });
    return despues;
  }
}
