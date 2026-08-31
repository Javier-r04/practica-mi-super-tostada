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
import { AbonoService } from "./abono.service";

@Controller()
export class ReceivablesController {
  constructor(
    private readonly cartera: CarteraService,
    private readonly facturas: FacturaService,
    private readonly pagos: PagoService,
    private readonly abonos: AbonoService,
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

  @Get("abonos")
  async listarAbonos(
    @Query() query: Record<string, string | undefined>,
    @CurrentActor() actor: Actor,
  ) {
    return envelopeOk(await this.abonos.listar(actor, query));
  }

  @Post("abonos/:id/confirmar")
  @RequierePermiso("cobranza.confirmar_transferencia")
  async confirmarAbono(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentActor() actor: Actor,
  ) {
    return envelopeOk(await this.abonos.confirmar(id, actor));
  }

  @Post("abonos/:id/rechazar")
  @RequierePermiso("cobranza.confirmar_transferencia")
  async rechazarAbono(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() body: unknown,
    @CurrentActor() actor: Actor,
  ) {
    return envelopeOk(await this.abonos.rechazar(id, body, actor));
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
