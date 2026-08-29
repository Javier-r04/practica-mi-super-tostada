import { Inject, Injectable } from "@nestjs/common";
import { eq } from "drizzle-orm";
import { usuario } from "@misupertostada/db";
import {
  actorPublicoSchema,
  loginRequestSchema,
  type ActorPublico,
} from "@misupertostada/shared";
import { CLOCK, DRIZZLE } from "../shared/tokens";
import type { Clock } from "@misupertostada/shared";
import type { AppDatabase } from "../shared/database.module";
import { AuditWriter } from "../shared/audit.writer";
import { DomainException } from "../shared/domain.exception";
import { parseBody } from "../shared/zod-body";
import { PasswordService } from "./password.service";
import { SessionService } from "./session.service";
import { LoginRateLimiter } from "./rate-limiter";
import type { Actor } from "./actor";

const CREDENCIALES_MSG = "Usuario o contraseña incorrectos";

@Injectable()
export class AuthService {
  private readonly limiter = new LoginRateLimiter();

  constructor(
    @Inject(DRIZZLE) private readonly db: AppDatabase,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly passwords: PasswordService,
    private readonly sessions: SessionService,
    private readonly audit: AuditWriter,
  ) {}

  toPublic(actor: Actor): ActorPublico {
    return actorPublicoSchema.parse({
      id: actor.usuarioId,
      username: actor.username,
      rol: actor.rol,
      permisos: actor.permisos,
      organizacionId: actor.organizacionId,
      activo: true,
    });
  }

  async login(
    body: unknown,
    meta: { ip: string | null; userAgent: string | null },
  ): Promise<{ actor: ActorPublico; token: string }> {
    const input = parseBody(loginRequestSchema, body);
    const rateKey = `${meta.ip ?? "unknown"}:${input.username}`;
    if (!this.limiter.consume(rateKey, this.clock.now())) {
      throw new DomainException(
        "RATE_LIMIT",
        "Demasiados intentos. Espere unos minutos",
        429,
      );
    }

    const [row] = await this.db
      .select()
      .from(usuario)
      .where(eq(usuario.username, input.username))
      .limit(1);

    const hash = row?.passwordHash;
    const ok =
      !!row &&
      row.activo &&
      !!hash &&
      (await this.passwords.verify(hash, input.password));

    if (!ok) {
      await this.audit.insert({
        actorTipo: "anonimo",
        actorId: meta.ip ?? "unknown",
        accion: "auth.login_fallido",
        entidad: "usuario",
        entidadId: input.username,
        ip: meta.ip,
        userAgent: meta.userAgent,
      });
      throw new DomainException("CREDENCIALES_INVALIDAS", CREDENCIALES_MSG, 401);
    }

    this.limiter.reset(rateKey);
    const { raw } = await this.sessions.create(row.id, meta);
    await this.audit.insert({
      actorTipo: "usuario",
      actorId: row.id,
      accion: "auth.login",
      entidad: "sesion",
      entidadId: row.id,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    const actor = await this.sessions.resolve(raw);
    return { actor: this.toPublic(actor), token: raw };
  }

  async logout(
    raw: string | undefined,
    meta: { ip: string | null; userAgent: string | null },
    actor: Actor | null,
  ): Promise<void> {
    await this.sessions.revoke(raw);
    if (actor) {
      await this.audit.insert({
        actorTipo: "usuario",
        actorId: actor.usuarioId,
        accion: "auth.logout",
        entidad: "sesion",
        entidadId: actor.sesionId,
        ip: meta.ip,
        userAgent: meta.userAgent,
      });
    }
  }
}
