import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
} from "@nestjs/common";
import { envelopeOk } from "@misupertostada/shared";
import { RequierePermiso } from "../identity/permisos.guard";
import { CurrentActor } from "../identity/current-actor";
import type { Actor } from "../identity/actor";
import { ProductosService } from "./productos.service";

@Controller("productos")
export class ProductosController {
  constructor(private readonly productos: ProductosService) {}

  @Get()
  async listar(@CurrentActor() actor: Actor) {
    return envelopeOk(await this.productos.listar(actor));
  }

  @Post()
  @RequierePermiso("catalogo.escribir")
  async crear(@Body() body: unknown, @CurrentActor() actor: Actor) {
    return envelopeOk(await this.productos.crear(body, actor));
  }

  @Put("orden")
  @RequierePermiso("catalogo.escribir")
  async reordenar(@Body() body: unknown, @CurrentActor() actor: Actor) {
    return envelopeOk(await this.productos.reordenar(body, actor));
  }

  @Patch(":id/desactivar")
  @RequierePermiso("catalogo.escribir")
  async desactivar(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentActor() actor: Actor,
  ) {
    return envelopeOk(await this.productos.desactivar(id, actor));
  }

  @Patch(":id/activar")
  @RequierePermiso("catalogo.escribir")
  async activar(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentActor() actor: Actor,
  ) {
    return envelopeOk(await this.productos.activar(id, actor));
  }

  @Patch(":id")
  @RequierePermiso("catalogo.escribir")
  async editar(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() body: unknown,
    @CurrentActor() actor: Actor,
  ) {
    return envelopeOk(await this.productos.editar(id, body, actor));
  }
}
