import { Module } from "@nestjs/common";
import { PedidoEvents } from "./pedido-events";
import { PedidoService } from "./pedido.service";
import { PedidosController } from "./pedidos.controller";
import { PortalController } from "./portal.controller";
import { PortalService } from "./portal.service";
import { PortalTokenGuard } from "./portal.guard";
import { PortalTokenService } from "./portal-token.service";
import { PortalRateLimit, portalRateLimitDefault } from "./portal-rate-limit";

@Module({
  controllers: [PortalController, PedidosController],
  providers: [
    PortalTokenService,
    { provide: PortalRateLimit, useFactory: portalRateLimitDefault },
    PortalTokenGuard,
    PedidoEvents,
    PedidoService,
    PortalService,
  ],
})
export class OrderingModule {}
