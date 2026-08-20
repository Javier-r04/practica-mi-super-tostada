import { Controller, Get } from "@nestjs/common";
import {
  calendarioAhoraSchema,
  envelopeOk,
  type CalendarioAhora,
} from "@misupertostada/shared";
import { BusinessCalendarService } from "./calendar.service";

@Controller("calendario")
export class CalendarioController {
  constructor(private readonly calendar: BusinessCalendarService) {}

  @Get("ahora")
  async ahora() {
    const cal = await this.calendar.load();
    const now = this.calendar.now();
    const fechaOperacion = cal.getFechaOperacion(now);
    const payload: CalendarioAhora = calendarioAhoraSchema.parse({
      fechaOperacion,
      ventanaAbierta: cal.isVentanaAbierta(now),
      esSabado: cal.isSabado(fechaOperacion),
    });
    return envelopeOk(payload);
  }
}
