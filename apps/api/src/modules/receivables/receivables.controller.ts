import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { envelopeOk } from "@misupertostada/shared";
import { RequierePermiso } from "../identity/permisos.guard";
import { CurrentActor } from "../identity/current-actor";
import type { Actor } from "../identity/actor";
import { CarteraService } from "./cartera.service";
import { FacturaService } from "./factura.service";
import { PagoService } from "./pago.service";

@Controller()
export class ReceivablesController {
  constructor(
    private readonly cartera: CarteraService,
    private readonly facturas: FacturaService,
    private readonly pagos: PagoService,
  ) {}

  @Get("cartera")
  async listar(
    @Query() query: Record<string, string | undefined>,
    @CurrentActor() actor: Actor,
  ) {
    return envelopeOk(await this.cartera.listar(actor, query));
  }

  @Get("cartera/resumen")
  async resumen(
    @Query() query: Record<string, string | undefined>,
    @CurrentActor() actor: Actor,
  ) {
    return envelopeOk(await this.cartera.resumen(actor, query));
  }

  @Get("cobranza/cuadre")
  async cuadre(
    @Query() query: Record<string, string | undefined>,
    @CurrentActor() actor: Actor,
  ) {
    return envelopeOk(await this.cartera.cuadre(actor, query));
  }

  @Get("clientes/:id/cuenta")
  async cuenta(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentActor() actor: Actor,
  ) {
    return envelopeOk(await this.cartera.cuenta(id, actor));
  }

  @Patch("facturas/:id/dte")
  @RequierePermiso("cobranza.capturar_dte")
  async dte(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() body: unknown,
    @CurrentActor() actor: Actor,
  ) {
    return envelopeOk(await this.facturas.capturarDte(id, body, actor));
  }

  @Post("pagos")
  @RequierePermiso("cobranza.registrar_pago")
  async pagar(@Body() body: unknown, @CurrentActor() actor: Actor) {
    return envelopeOk(await this.pagos.registrar(body, actor));
  }
}
