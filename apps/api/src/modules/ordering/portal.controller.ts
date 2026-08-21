import {
  Controller,
  Get,
  Header,
  Param,
  ParseUUIDPipe,
  Put,
  Query,
  Req,
  StreamableFile,
  UseGuards,
} from "@nestjs/common";
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

  @Get(":token/pedidos")
  async historial(
    @Req() req: Request,
    @CurrentPortalCliente() clienteRow: ClientePortal,
    @Query("limit") limitRaw?: string,
    @Query("offset") offsetRaw?: string,
  ) {
    const limit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined;
    const offset = offsetRaw ? Number.parseInt(offsetRaw, 10) : undefined;
    return envelopeOk(
      await this.portal.listarPedidos(clienteRow, meta(req), {
        limit: Number.isFinite(limit) ? limit : undefined,
        offset: Number.isFinite(offset) ? offset : undefined,
      }),
    );
  }

  @Get(":token/pedidos/:id")
  async pedidoDetalle(
    @Req() req: Request,
    @CurrentPortalCliente() clienteRow: ClientePortal,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return envelopeOk(
      await this.portal.obtenerPedido(clienteRow, id, meta(req)),
    );
  }

  @Get(":token/assets/:id")
  @Header("Cache-Control", "private, max-age=86400, immutable")
  async asset(
    @CurrentPortalCliente() clienteRow: ClientePortal,
    @Param("id", ParseUUIDPipe) id: string,
    @Query("v") variante: string | undefined,
  ) {
    const v =
      variante === "thumb" || variante === "card" ? variante : undefined;
    const { bytes, mime } = await this.portal.assetContent(
      clienteRow,
      id,
      v,
    );
    return new StreamableFile(bytes, {
      type: mime,
      disposition: "inline",
    });
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
