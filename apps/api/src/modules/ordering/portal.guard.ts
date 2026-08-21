import {
  CanActivate,
  createParamDecorator,
  ExecutionContext,
  Inject,
  Injectable,
} from "@nestjs/common";
import type { Request } from "express";
import type { Clock } from "@misupertostada/shared";
import { CLOCK } from "../shared/tokens";
import { hashPortalToken } from "../shared/portal-token";
import { PortalTokenService, type ClientePortal } from "./portal-token.service";
import { PortalRateLimit } from "./portal-rate-limit";
import { DomainException } from "../shared/domain.exception";
import { MENSAJE_PORTAL_NO_ENCONTRADO } from "@misupertostada/shared";

export type RequestWithPortal = Request & { clientePortal?: ClientePortal };

export const CurrentPortalCliente = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): ClientePortal => {
    const req = ctx.switchToHttp().getRequest<RequestWithPortal>();
    if (!req.clientePortal) {
      throw new DomainException(
        "NO_ENCONTRADO",
        MENSAJE_PORTAL_NO_ENCONTRADO,
        404,
      );
    }
    return req.clientePortal;
  },
);

@Injectable()
export class PortalTokenGuard implements CanActivate {
  constructor(
    private readonly tokens: PortalTokenService,
    private readonly rate: PortalRateLimit,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<RequestWithPortal>();
    const token = String(req.params.token ?? "");
    const ip = req.ip ?? "unknown";
    const hash = hashPortalToken(token);
    const now = this.clock.now();
    const path = req.path ?? req.url ?? "";
    if (path.includes("/assets/")) {
      this.rate.consumeAsset(ip, hash, now);
    } else {
      this.rate.consume(ip, hash, now);
    }
    req.clientePortal = await this.tokens.resolver(token);
    return true;
  }
}
