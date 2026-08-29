import { Body, Controller, Get, Put } from "@nestjs/common";
import { envelopeOk } from "@misupertostada/shared";
import { RequierePermiso } from "../identity/permisos.guard";
import { CurrentActor } from "../identity/current-actor";
import type { Actor } from "../identity/actor";
import { ConfiguracionService } from "./configuracion.service";

@Controller("configuracion")
export class ConfiguracionController {
  constructor(private readonly cfg: ConfiguracionService) {}

  @Get("ventana")
  @RequierePermiso("ventana.configurar")
  async leer(@CurrentActor() actor: Actor) {
    return envelopeOk(await this.cfg.leerVentana(actor.organizacionId));
  }

  @Put("ventana")
  @RequierePermiso("ventana.configurar")
  async guardar(@Body() body: unknown, @CurrentActor() actor: Actor) {
    return envelopeOk(await this.cfg.guardarVentana(body, actor));
  }
}
