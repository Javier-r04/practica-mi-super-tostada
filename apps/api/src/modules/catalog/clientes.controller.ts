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
import { ClientesService } from "./clientes.service";
import { ClienteProductoService } from "./cliente-producto.service";

@Controller("clientes")
export class ClientesController {
  constructor(
    private readonly clientes: ClientesService,
    private readonly clienteProducto: ClienteProductoService,
  ) {}

  @Get()
  async listar(@CurrentActor() actor: Actor) {
    return envelopeOk(await this.clientes.listar(actor));
  }

  @Post()
  @RequierePermiso("catalogo.escribir")
  async crear(@Body() body: unknown, @CurrentActor() actor: Actor) {
    return envelopeOk(await this.clientes.crear(body, actor));
  }

  @Get(":id/productos")
  async listarProductos(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentActor() actor: Actor,
  ) {
    return envelopeOk(await this.clienteProducto.listar(id, actor));
  }

  @Put(":id/productos/orden")
  @RequierePermiso("catalogo.escribir")
  async reordenarProductos(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() body: unknown,
    @CurrentActor() actor: Actor,
  ) {
    return envelopeOk(await this.clienteProducto.reordenar(id, body, actor));
  }

  @Put(":id/productos/:productoId")
  @RequierePermiso("catalogo.escribir")
  async upsertProducto(
    @Param("id", ParseUUIDPipe) id: string,
    @Param("productoId", ParseUUIDPipe) productoId: string,
    @Body() body: unknown,
    @CurrentActor() actor: Actor,
  ) {
    return envelopeOk(
      await this.clienteProducto.upsert(id, productoId, body, actor),
    );
  }

  @Get(":id")
  async obtener(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentActor() actor: Actor,
  ) {
    return envelopeOk(await this.clientes.obtener(id, actor));
  }

  @Patch(":id/desactivar")
  @RequierePermiso("catalogo.escribir")
  async desactivar(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentActor() actor: Actor,
  ) {
    return envelopeOk(await this.clientes.desactivar(id, actor));
  }

  @Patch(":id/activar")
  @RequierePermiso("catalogo.escribir")
  async activar(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentActor() actor: Actor,
  ) {
    return envelopeOk(await this.clientes.activar(id, actor));
  }

  @Post(":id/token-portal")
  @RequierePermiso("catalogo.escribir")
  async rotarToken(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentActor() actor: Actor,
  ) {
    return envelopeOk(await this.clientes.rotarTokenPortal(id, actor));
  }

  @Patch(":id")
  @RequierePermiso("catalogo.escribir")
  async editar(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() body: unknown,
    @CurrentActor() actor: Actor,
  ) {
    return envelopeOk(await this.clientes.editar(id, body, actor));
  }
}
