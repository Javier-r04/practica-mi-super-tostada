import { Controller, Get, Put, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import { envelopeOk } from "@misupertostada/shared";
import { Public } from "../shared/public.decorator";
import { CurrentPortalCliente, PortalTokenGuard } from "./portal.guard";
import type { ClientePortal } from "./portal-token.service";
import { PortalService } from "./portal.service";
import { PedidoService } from "./pedido.service";

function meta(req: Request): { ip: string | null; userAgent: string | null } {
  return {
    ip: req.ip ?? null,
    userAgent: req.headers["user-agent"] ?? null,
  };
}

@Public()
@UseGuards(PortalTokenGuard)
@Controller("p")
export class PortalController {
  constructor(
    private readonly portal: PortalService,
    private readonly pedidos: PedidoService,
  ) {}

  @Get(":token/cuenta")
  async cuenta(@CurrentPortalCliente() clienteRow: ClientePortal) {
    return envelopeOk(await this.portal.cuentaDe(clienteRow));
  }

  @Put(":token/pedido")
  async pedido(
    @Req() req: Request,
    @CurrentPortalCliente() clienteRow: ClientePortal,
  ) {
    return envelopeOk(
      await this.pedidos.upsertPortal(clienteRow, req.body, meta(req)),
    );
  }

  @Get(":token")
  async sesion(
    @Req() req: Request,
    @CurrentPortalCliente() clienteRow: ClientePortal,
  ) {
    return envelopeOk(await this.portal.abrirSesion(clienteRow, meta(req)));
  }
}
