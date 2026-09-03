import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  Req,
  Sse,
  StreamableFile,
  UseGuards,
} from "@nestjs/common";
import type { Request } from "express";
import {
  envelopeOk,
  PORTAL_FACTURA_FILTROS,
} from "@misupertostada/shared";
import { Public } from "../shared/public.decorator";
import { CurrentPortalCliente, PortalTokenGuard } from "./portal.guard";
import type { ClientePortal } from "./portal-token.service";
import { PortalService } from "./portal.service";
import { PedidoService } from "./pedido.service";
import { PedidoEvents } from "./pedido-events";
import { visibleParaCliente, type EventoPortal } from "./portal-stream";
import { Observable } from "rxjs";
import { filter } from "rxjs/operators";

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
    private readonly events: PedidoEvents,
  ) {}

  @Get(":token/cuenta")
  async cuenta(@CurrentPortalCliente() clienteRow: ClientePortal) {
    return envelopeOk(await this.portal.cuentaDe(clienteRow));
  }

  @Post(":token/abonos")
  async reportarAbono(
    @Req() req: Request,
    @CurrentPortalCliente() clienteRow: ClientePortal,
    @Body() body: unknown,
  ) {
    return envelopeOk(
      await this.portal.reportarAbono(clienteRow, body, meta(req)),
    );
  }

  @Post(":token/abonos/assets/presign")
  async presignAbono(@Body() body: unknown) {
    return envelopeOk(await this.portal.presignAbonoAsset(body));
  }

  @Post(":token/abonos/assets/confirm")
  async confirmAbono(@Body() body: unknown) {
    return envelopeOk(await this.portal.confirmAbonoAsset(body));
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

  @Get(":token/facturas")
  async facturas(
    @Req() req: Request,
    @CurrentPortalCliente() clienteRow: ClientePortal,
    @Query("estado") estadoRaw?: string,
    @Query("limit") limitRaw?: string,
    @Query("offset") offsetRaw?: string,
  ) {
    const limit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined;
    const offset = offsetRaw ? Number.parseInt(offsetRaw, 10) : undefined;
    const filtro = PORTAL_FACTURA_FILTROS.find((f) => f === estadoRaw);
    return envelopeOk(
      await this.portal.listarFacturas(clienteRow, meta(req), {
        filtro,
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

  @Get(":token/assets/:id/url")
  async assetUrl(
    @Req() req: Request,
    @CurrentPortalCliente() clienteRow: ClientePortal,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    const apiBase = `${req.protocol}://${req.get("host")}`;
    return envelopeOk(
      await this.portal.assetViewUrl(clienteRow, id, apiBase),
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

  @Delete(":token/pedido")
  async anularPedido(
    @Req() req: Request,
    @CurrentPortalCliente() clienteRow: ClientePortal,
  ) {
    await this.pedidos.anularPortal(clienteRow, meta(req));
    return envelopeOk(null);
  }

  @Get(":token")
  async sesion(
    @Req() req: Request,
    @CurrentPortalCliente() clienteRow: ClientePortal,
  ) {
    return envelopeOk(await this.portal.abrirSesion(clienteRow, meta(req)));
  }

  /**
   * SSE del portal sobre el mismo bus del panel.
   *
   * Filtra a lo que el cliente puede ver: los eventos de operación —cerrar y
   * **reabrir** el día, y la hoja— que cambian si su ventana está abierta, y
   * los suyos propios. Sin `dia.reabierto` aquí, una reapertura hecha en el
   * panel no llegaba al portal hasta que el cliente recargara.
   */
  @Sse(":token/stream")
  @Header("Cache-Control", "no-cache, no-transform")
  @Header("X-Accel-Buffering", "no")
  @Header("Connection", "keep-alive")
  stream(
    @CurrentPortalCliente() clienteRow: ClientePortal,
  ): Observable<{ data: EventoPortal }> {
    return this.events
      .stream(clienteRow.organizacionId)
      .pipe(filter(({ data }) => visibleParaCliente(data, clienteRow.id)));
  }
}
