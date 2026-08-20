import { Controller, Get } from "@nestjs/common";
import {
  calendarioAhoraSchema,
  envelopeOk,
  type CalendarioAhora,
} from "@misupertostada/shared";
import { BusinessCalendarService } from "./calendar.service";
import { leerEstadoDia } from "./dia-operacion";
import { CurrentActor } from "../identity/current-actor";
import type { Actor } from "../identity/actor";
import { DRIZZLE } from "./tokens";
import { Inject } from "@nestjs/common";
import type { AppDatabase } from "./database.module";

@Controller("calendario")
export class CalendarioController {
  constructor(
    private readonly calendar: BusinessCalendarService,
    @Inject(DRIZZLE) private readonly db: AppDatabase,
  ) {}

  @Get("ahora")
  async ahora(@CurrentActor() actor: Actor) {
    const cal = await this.calendar.load();
    const now = this.calendar.now();
    const ventanaAbierta = cal.isVentanaAbierta(now);
    let fechaOperacion = cal.getFechaOperacion(now);
    let dia = await leerEstadoDia(this.db, actor.organizacionId, fechaOperacion);
    if (!ventanaAbierta) {
      const reciente = cal.getFechaOperacionDeVentanaReciente(now);
      const diaReciente = await leerEstadoDia(
        this.db,
        actor.organizacionId,
        reciente,
      );
      if (diaReciente.diaEstado === "REABIERTO") {
        fechaOperacion = reciente;
        dia = diaReciente;
      }
    }
    const capturaAbierta = ventanaAbierta && dia.diaEstado !== "CERRADO";
    const payload: CalendarioAhora = calendarioAhoraSchema.parse({
      fechaOperacion,
      ventanaAbierta,
      capturaAbierta,
      diaEstado: dia.diaEstado,
      versionHoja: dia.versionHoja,
      esSabado: cal.isSabado(fechaOperacion),
    });
    return envelopeOk(payload);
  }
}
