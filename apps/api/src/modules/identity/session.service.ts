import { createHash, randomBytes } from "node:crypto";
import {
  Inject,
  Injectable,
} from "@nestjs/common";
import { and, eq, gt } from "drizzle-orm";
import { permiso, sesion, usuario, usuarioPermiso } from "@misupertostada/db";
import {
  esPermisoCodigo,
  permisosEfectivos,
  type PermisoCodigo,
} from "@misupertostada/shared";
import { CLOCK, DRIZZLE } from "../shared/tokens";
import type { AppDatabase } from "../shared/database.module";
import type { Clock } from "@misupertostada/shared";
import { DomainException } from "../shared/domain.exception";
import {
  SESSION_COOKIE_CONFIG,
  type Actor,
  type SessionCookieConfig,
} from "./actor";

export function hashSessionToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

export function newSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

@Injectable()
export class SessionService {
  constructor(
    @Inject(DRIZZLE) private readonly db: AppDatabase,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(SESSION_COOKIE_CONFIG) private readonly cookie: SessionCookieConfig,
  ) {}

  cookieOptions(): {
    httpOnly: true;
    sameSite: "lax";
    secure: boolean;
    path: "/";
    maxAge: number;
  } {
    return {
      httpOnly: true,
      sameSite: "lax",
      secure: this.cookie.secure,
      path: "/",
      maxAge: this.cookie.ttlSeconds,
    };
  }

  cookieName(): string {
    return this.cookie.name;
  }

  async create(
    usuarioId: string,
    meta: { ip: string | null; userAgent: string | null },
  ): Promise<{ raw: string; expiresAt: Date }> {
    const raw = newSessionToken();
    const expiresAt = new Date(
      this.clock.now().getTime() + this.cookie.ttlSeconds * 1000,
    );
    await this.db.insert(sesion).values({
      usuarioId,
      tokenHash: hashSessionToken(raw),
      expiresAt,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
    return { raw, expiresAt };
  }

  async resolve(raw: string | undefined): Promise<Actor> {
    if (!raw) {
      throw new DomainException("SESION_REQUERIDA", "Inicie sesión", 401);
    }
    const [row] = await this.db
      .select({
        sesionId: sesion.id,
        expiresAt: sesion.expiresAt,
        ip: sesion.ip,
        userAgent: sesion.userAgent,
        usuarioId: usuario.id,
        organizacionId: usuario.organizacionId,
        username: usuario.username,
        rol: usuario.rol,
        activo: usuario.activo,
      })
      .from(sesion)
      .innerJoin(usuario, eq(usuario.id, sesion.usuarioId))
      .where(
        and(
          eq(sesion.tokenHash, hashSessionToken(raw)),
          gt(sesion.expiresAt, this.clock.now()),
        ),
      )
      .limit(1);

    if (!row || !row.activo) {
      throw new DomainException("SESION_REQUERIDA", "Inicie sesión", 401);
    }

    const extras = await this.extras(row.usuarioId);
    return {
      usuarioId: row.usuarioId,
      organizacionId: row.organizacionId,
      username: row.username,
      rol: row.rol,
      permisos: permisosEfectivos(row.rol, extras),
      sesionId: row.sesionId,
      ip: row.ip,
      userAgent: row.userAgent,
    };
  }

  async revoke(raw: string | undefined): Promise<void> {
    if (!raw) return;
    await this.db
      .update(sesion)
      .set({ expiresAt: this.clock.now() })
      .where(eq(sesion.tokenHash, hashSessionToken(raw)));
  }

  async extras(usuarioId: string): Promise<PermisoCodigo[]> {
    const rows = await this.db
      .select({ codigo: permiso.codigo })
      .from(usuarioPermiso)
      .innerJoin(permiso, eq(permiso.id, usuarioPermiso.permisoId))
      .where(eq(usuarioPermiso.usuarioId, usuarioId));
    return rows
      .map((r) => r.codigo)
      .filter(esPermisoCodigo);
  }
}
