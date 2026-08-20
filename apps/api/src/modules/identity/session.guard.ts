import {
  CanActivate,
  ExecutionContext,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Request } from "express";
import { IS_PUBLIC } from "../shared/public.decorator";
import { SessionService } from "./session.service";
import type { Actor } from "./actor";

export type RequestWithActor = Request & { actor?: Actor };

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly sessions: SessionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const req = context.switchToHttp().getRequest<RequestWithActor>();
    const raw = req.cookies?.[this.sessions.cookieName()] as string | undefined;
    req.actor = await this.sessions.resolve(raw);
    return true;
  }
}
