import {
  Controller,
  Get,
  Post,
  Req,
  Res,
} from "@nestjs/common";
import type { Request, Response } from "express";
import { envelopeOk } from "@misupertostada/shared";
import { Public } from "../shared/public.decorator";
import { AuthService } from "./auth.service";
import { SessionService } from "./session.service";
import { CurrentActor } from "./current-actor";
import type { Actor } from "./actor";

function meta(req: Request): { ip: string | null; userAgent: string | null } {
  return {
    ip: req.ip ?? null,
    userAgent: req.headers["user-agent"] ?? null,
  };
}

@Controller("auth")
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly sessions: SessionService,
  ) {}

  @Public()
  @Post("login")
  async login(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { actor, token } = await this.auth.login(req.body, meta(req));
    res.cookie(this.sessions.cookieName(), token, this.sessions.cookieOptions());
    return envelopeOk({ usuario: actor });
  }

  @Post("logout")
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @CurrentActor() actor: Actor,
  ) {
    const raw = req.cookies?.[this.sessions.cookieName()] as string | undefined;
    await this.auth.logout(raw, meta(req), actor);
    res.clearCookie(this.sessions.cookieName(), this.sessions.cookieOptions());
    return envelopeOk({ ok: true as const });
  }

  @Get("me")
  me(@CurrentActor() actor: Actor) {
    return envelopeOk({ usuario: this.auth.toPublic(actor) });
  }
}
