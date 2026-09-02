import { Controller, Get } from "@nestjs/common";
import {
  calendarioAhoraSchema,
  capturaAbierta,
  envelopeOk,
  timestampsVentana,
  type CalendarioAhora,
} from "@misupertostada/shared";
import { BusinessCalendarService } from "./calendar.service";
import { CurrentActor } from "../identity/current-actor";
import type { Actor } from "../identity/actor";

@Controller("calendario")
export class CalendarioController {
  constructor(private readonly calendar: BusinessCalendarService) {}

  /**
   * Único origen de verdad de «qué día es» para el panel.
   *
   * Devuelve los tres ejes por separado a propósito: antes exponía un solo
   * `fechaOperacion` (el de captura) y cada pantalla lo interpretaba como
   * «hoy», lo que hacía que `/pedidos` abriera en una operación vacía a las
   * 08:00 y que `/hoy` perdiera el reparto a las 15:00.
   *
   * Los timestamps de countdown salen de `timestampsVentana`, la misma
   * función que usa el portal: navbar y `/p/{token}` no pueden contradecirse.
   */
  @Get("ahora")
  async ahora(@CurrentActor() actor: Actor) {
    const cal = await this.calendar.load(actor.organizacionId);
    const ejes = await this.calendar.ejes(actor.organizacionId);
    const now = this.calendar.now();
    const horario = cal.getHorarioReferencia(now);
    const { cierraAt, proximaAperturaAt } = timestampsVentana({
      ventanaAbierta: ejes.ventanaAbierta,
      estadoCaptura: ejes.estadoCaptura,
      cierraDate: cal.getCierreVentana(now),
      proximaAperturaDesde: (from) => cal.getProximaApertura(from),
      now,
    });

    const payload: CalendarioAhora = calendarioAhoraSchema.parse({
      fechaOperacionCaptura: ejes.captura,
      fechaEntregaCaptura: ejes.entregaCaptura,
      fechaOperacionEnCurso: ejes.enCurso,
      fechaEntregaEnCurso: ejes.entregaEnCurso,
      hoyCivil: ejes.hoyCivil,
      mismaOperacion: ejes.mismaOperacion,
      ventanaAbierta: ejes.ventanaAbierta,
      // Un día REABIERTO acepta captura desde el panel aunque el reloj diga
      // cerrado. La regla vive en `capturaAbierta` para que el portal no la
      // reinvente: navbar y portal leen el mismo bit.
      capturaAbierta: capturaAbierta(ejes.ventanaAbierta, ejes.estadoCaptura),
      diaEstado: ejes.estadoCaptura,
      diaEstadoEnCurso: ejes.estadoEnCurso,
      versionHoja: ejes.versionHojaCaptura,
      esSabado: cal.isSabado(ejes.captura),
      horarioApertura: horario?.apertura ?? null,
      horarioCierre: horario?.cierre ?? null,
      cierraAt,
      proximaAperturaAt,
    });
    return envelopeOk(payload);
  }
}
