import { Module } from "@nestjs/common";
import { PedidoService } from "./pedido.service";
import { PedidosController } from "./pedidos.controller";
import { PortalController } from "./portal.controller";
import { PortalService } from "./portal.service";
import { PortalTokenGuard } from "./portal.guard";
import { PortalTokenService } from "./portal-token.service";
import { PortalRateLimit, portalRateLimitDefault } from "./portal-rate-limit";
import { ReceivablesModule } from "../receivables/receivables.module";

@Module({
  imports: [ReceivablesModule],
  controllers: [PortalController, PedidosController],
  providers: [
    PortalTokenService,
    { provide: PortalRateLimit, useFactory: portalRateLimitDefault },
    PortalTokenGuard,
    PedidoService,
    PortalService,
  ],
})
export class OrderingModule {}
