import { Body, Controller, Get, Header, Param, Post } from "@nestjs/common";
import { envelopeOk } from "@misupertostada/shared";
import { RequierePermiso } from "../identity/permisos.guard";
import { CurrentActor } from "../identity/current-actor";
import type { Actor } from "../identity/actor";
import { ImportService } from "./import.service";

@Controller("catalogo/import")
export class ImportController {
  constructor(private readonly imports: ImportService) {}

  @Get("plantillas/:tipo")
  @RequierePermiso("catalogo.escribir")
  @Header("Content-Type", "text/csv; charset=utf-8")
  plantilla(@Param("tipo") tipo: string) {
    const { csv } = this.imports.plantilla(tipo);
    return csv;
  }

  @Post("preview")
  @RequierePermiso("catalogo.escribir")
  async preview(@Body() body: unknown, @CurrentActor() actor: Actor) {
    return envelopeOk(await this.imports.preview(body, actor));
  }

  @Post("confirmar")
  @RequierePermiso("catalogo.escribir")
  async confirmar(@Body() body: unknown, @CurrentActor() actor: Actor) {
    return envelopeOk(await this.imports.confirmar(body, actor));
  }
}
