import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from "@nestjs/common";
import { envelopeOk } from "@misupertostada/shared";
import { RequierePermiso } from "./permisos.guard";
import { UsuariosService } from "./usuarios.service";
import { CurrentActor } from "./current-actor";
import type { Actor } from "./actor";

@Controller("usuarios")
export class UsuariosController {
  constructor(private readonly usuarios: UsuariosService) {}

  @Get()
  @RequierePermiso("usuarios.gestionar")
  async listar(@CurrentActor() actor: Actor) {
    return envelopeOk(await this.usuarios.listar(actor.organizacionId));
  }

  @Post()
  @RequierePermiso("usuarios.gestionar")
  async crear(@Body() body: unknown, @CurrentActor() actor: Actor) {
    return envelopeOk(await this.usuarios.crear(body, actor));
  }

  @Patch(":id/permisos")
  @RequierePermiso("permisos.delegar")
  async delegar(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() body: unknown,
    @CurrentActor() actor: Actor,
  ) {
    return envelopeOk(await this.usuarios.delegar(id, body, actor));
  }

  @Patch(":id/desactivar")
  @RequierePermiso("usuarios.gestionar")
  async desactivar(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentActor() actor: Actor,
  ) {
    await this.usuarios.desactivar(id, actor);
    return envelopeOk({ ok: true as const });
  }

  @Patch(":id/activar")
  @RequierePermiso("usuarios.gestionar")
  async activar(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() body: unknown,
    @CurrentActor() actor: Actor,
  ) {
    return envelopeOk(await this.usuarios.activar(id, body, actor));
  }

  @Patch(":id/password")
  @RequierePermiso("usuarios.gestionar")
  async password(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() body: unknown,
    @CurrentActor() actor: Actor,
  ) {
    await this.usuarios.resetPassword(id, body, actor);
    return envelopeOk({ ok: true as const });
  }

  @Patch(":id/rol")
  @RequierePermiso("usuarios.gestionar")
  async rol(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() body: unknown,
    @CurrentActor() actor: Actor,
  ) {
    return envelopeOk(await this.usuarios.cambiarRol(id, body, actor));
  }
}
