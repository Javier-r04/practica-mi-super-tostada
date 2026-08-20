import { createParamDecorator, type ExecutionContext } from "@nestjs/common";
import type { Actor } from "./actor";
import type { RequestWithActor } from "./session.guard";

export const CurrentActor = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): Actor | undefined => {
    const req = ctx.switchToHttp().getRequest<RequestWithActor>();
    return req.actor;
  },
);
