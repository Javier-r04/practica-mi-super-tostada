import { Module } from "@nestjs/common";
import { PedidoService } from "./pedido.service";
import { PortalController } from "./portal.controller";
import { PortalService } from "./portal.service";
import { PortalTokenGuard } from "./portal.guard";
import { PortalTokenService } from "./portal-token.service";
import { PortalRateLimit, portalRateLimitDefault } from "./portal-rate-limit";

@Module({
  controllers: [PortalController],
  providers: [
    PortalTokenService,
    { provide: PortalRateLimit, useFactory: portalRateLimitDefault },
    PortalTokenGuard,
    PedidoService,
    PortalService,
  ],
})
export class OrderingModule {}
