import { Inject, Injectable } from "@nestjs/common";
import { and, eq } from "drizzle-orm";
import { permiso, usuario, usuarioPermiso } from "@misupertostada/db";
import {
  actorPublicoSchema,
  activarUsuarioRequestSchema,
  cambiarRolRequestSchema,
  crearUsuarioRequestSchema,
  delegarPermisoRequestSchema,
  puedeDelegar,
  permisosEfectivos,
  resetPasswordRequestSchema,
  type ActorPublico,
} from "@misupertostada/shared";
import { DRIZZLE } from "../shared/tokens";
import type { AppDatabase } from "../shared/database.module";
import { AuditWriter } from "../shared/audit.writer";
import { DomainException } from "../shared/domain.exception";
import { parseBody } from "../shared/zod-body";
import { PasswordService } from "./password.service";
import { SessionService } from "./session.service";
import type { Actor } from "./actor";

@Injectable()
export class UsuariosService {
  constructor(
    @Inject(DRIZZLE) private readonly db: AppDatabase,
    private readonly passwords: PasswordService,
    private readonly sessions: SessionService,
    private readonly audit: AuditWriter,
  ) {}

  async listar(organizacionId: string): Promise<ActorPublico[]> {
    const rows = await this.db
      .select()
      .from(usuario)
      .where(eq(usuario.organizacionId, organizacionId));
    const result: ActorPublico[] = [];
    for (const row of rows) {
      const extras = await this.sessions.extras(row.id);
      result.push(this.publico(row, extras));
    }
    return result;
  }

  async crear(body: unknown, actor: Actor): Promise<ActorPublico> {
    const input = parseBody(crearUsuarioRequestSchema, body);
    if (input.rol === "ADMIN_JEFE" && actor.rol !== "ADMIN_JEFE") {
      throw new DomainException(
        "PERMISO_DENEGADO",
        "No puede crear un administrador jefe",
        403,
      );
    }

    const passwordHash = await this.passwords.hash(input.password);
    let created: { id: string } | undefined;
    try {
      const [row] = await this.db
        .insert(usuario)
        .values({
          organizacionId: actor.organizacionId,
          username: input.username,
          passwordHash,
          rol: input.rol,
          activo: true,
        })
        .returning({ id: usuario.id });
      created = row;
    } catch {
      throw new DomainException(
        "USERNAME_EN_USO",
        "Ya existe una cuenta con ese usuario",
        409,
      );
    }
    if (!created) {
      throw new DomainException("USERNAME_EN_USO", "Ya existe una cuenta con ese usuario", 409);
    }

    await this.audit.insert({
      actorTipo: "usuario",
      actorId: actor.usuarioId,
      accion: "usuarios.crear",
      entidad: "usuario",
      entidadId: created.id,
      despues: { username: input.username, rol: input.rol },
      ip: actor.ip,
      userAgent: actor.userAgent,
    });

    return this.publico(
      {
        id: created.id,
        username: input.username,
        rol: input.rol,
        organizacionId: actor.organizacionId,
        activo: true,
      },
      [],
    );
  }

  async delegar(
    usuarioId: string,
    body: unknown,
    actor: Actor,
  ): Promise<ActorPublico> {
    const input = parseBody(delegarPermisoRequestSchema, body);
    if (!puedeDelegar(actor.rol, input.codigo)) {
      throw new DomainException(
        "PERMISO_NO_DELEGABLE",
        "Ese permiso no se puede delegar",
        403,
      );
    }

    const [target] = await this.db
      .select()
      .from(usuario)
      .where(eq(usuario.id, usuarioId))
      .limit(1);
    if (!target) {
      throw new DomainException("NO_ENCONTRADO", "Usuario no encontrado", 404);
    }

    const [perm] = await this.db
      .select()
      .from(permiso)
      .where(eq(permiso.codigo, input.codigo))
      .limit(1);
    if (!perm) {
      throw new DomainException("NO_ENCONTRADO", "Permiso no encontrado", 404);
    }

    const extrasAntes = await this.sessions.extras(usuarioId);

    if (input.granted) {
      await this.db
        .insert(usuarioPermiso)
        .values({
          usuarioId,
          permisoId: perm.id,
          grantedBy: actor.usuarioId,
        })
        .onConflictDoNothing();
    } else {
      // Quita el grant; no es una entidad de negocio (pedido/pago/cliente).
      await this.db
        .delete(usuarioPermiso)
        .where(
          and(
            eq(usuarioPermiso.usuarioId, usuarioId),
            eq(usuarioPermiso.permisoId, perm.id),
          ),
        );
    }

    const extrasDespues = await this.sessions.extras(usuarioId);
    await this.audit.insert({
      actorTipo: "usuario",
      actorId: actor.usuarioId,
      accion: input.granted ? "permisos.otorgar" : "permisos.revocar",
      entidad: "usuario",
      entidadId: usuarioId,
      antes: { permisos: extrasAntes },
      despues: { permisos: extrasDespues, codigo: input.codigo },
      ip: actor.ip,
      userAgent: actor.userAgent,
    });

    return this.publico(target, extrasDespues);
  }

  async desactivar(usuarioId: string, actor: Actor): Promise<void> {
    if (usuarioId === actor.usuarioId) {
      throw new DomainException(
        "VALIDACION",
        "No puede desactivar su propia cuenta",
        400,
      );
    }
    const [target] = await this.db
      .select()
      .from(usuario)
      .where(eq(usuario.id, usuarioId))
      .limit(1);
    if (!target) {
      throw new DomainException("NO_ENCONTRADO", "Usuario no encontrado", 404);
    }
    await this.asegurarNoUltimoJefe(target, "desactivar");
    await this.db
      .update(usuario)
      .set({ activo: false })
      .where(eq(usuario.id, usuarioId));
    await this.audit.insert({
      actorTipo: "usuario",
      actorId: actor.usuarioId,
      accion: "usuarios.desactivar",
      entidad: "usuario",
      entidadId: usuarioId,
      antes: { activo: target.activo },
      despues: { activo: false },
      ip: actor.ip,
      userAgent: actor.userAgent,
    });
  }

  async activar(usuarioId: string, body: unknown, actor: Actor): Promise<ActorPublico> {
    const input = parseBody(activarUsuarioRequestSchema, body);
    const [target] = await this.db
      .select()
      .from(usuario)
      .where(eq(usuario.id, usuarioId))
      .limit(1);
    if (!target) {
      throw new DomainException("NO_ENCONTRADO", "Usuario no encontrado", 404);
    }
    if (!input.activo) {
      if (usuarioId === actor.usuarioId) {
        throw new DomainException(
          "VALIDACION",
          "No puede desactivar su propia cuenta",
          400,
        );
      }
      await this.asegurarNoUltimoJefe(target, "desactivar");
    }
    await this.db
      .update(usuario)
      .set({ activo: input.activo })
      .where(eq(usuario.id, usuarioId));
    await this.audit.insert({
      actorTipo: "usuario",
      actorId: actor.usuarioId,
      accion: input.activo ? "usuarios.activar" : "usuarios.desactivar",
      entidad: "usuario",
      entidadId: usuarioId,
      antes: { activo: target.activo },
      despues: { activo: input.activo },
      ip: actor.ip,
      userAgent: actor.userAgent,
    });
    const extras = await this.sessions.extras(usuarioId);
    return this.publico({ ...target, activo: input.activo }, extras);
  }

  async resetPassword(
    usuarioId: string,
    body: unknown,
    actor: Actor,
  ): Promise<void> {
    const input = parseBody(resetPasswordRequestSchema, body);
    const [target] = await this.db
      .select()
      .from(usuario)
      .where(eq(usuario.id, usuarioId))
      .limit(1);
    if (!target) {
      throw new DomainException("NO_ENCONTRADO", "Usuario no encontrado", 404);
    }
    const passwordHash = await this.passwords.hash(input.password);
    await this.db
      .update(usuario)
      .set({ passwordHash })
      .where(eq(usuario.id, usuarioId));
    await this.audit.insert({
      actorTipo: "usuario",
      actorId: actor.usuarioId,
      accion: "usuarios.reset_password",
      entidad: "usuario",
      entidadId: usuarioId,
      ip: actor.ip,
      userAgent: actor.userAgent,
    });
  }

  async cambiarRol(
    usuarioId: string,
    body: unknown,
    actor: Actor,
  ): Promise<ActorPublico> {
    const input = parseBody(cambiarRolRequestSchema, body);
    const [target] = await this.db
      .select()
      .from(usuario)
      .where(eq(usuario.id, usuarioId))
      .limit(1);
    if (!target) {
      throw new DomainException("NO_ENCONTRADO", "Usuario no encontrado", 404);
    }
    if (target.rol === "ADMIN_JEFE" && input.rol !== "ADMIN_JEFE") {
      await this.asegurarNoUltimoJefe(target, "degradar");
    }
    await this.db
      .update(usuario)
      .set({ rol: input.rol })
      .where(eq(usuario.id, usuarioId));
    await this.audit.insert({
      actorTipo: "usuario",
      actorId: actor.usuarioId,
      accion: "usuarios.cambiar_rol",
      entidad: "usuario",
      entidadId: usuarioId,
      antes: { rol: target.rol },
      despues: { rol: input.rol },
      ip: actor.ip,
      userAgent: actor.userAgent,
    });
    const extras = await this.sessions.extras(usuarioId);
    return this.publico({ ...target, rol: input.rol }, extras);
  }

  private publico(
    row: {
      id: string;
      username: string;
      rol: ActorPublico["rol"];
      organizacionId: string;
      activo: boolean;
    },
    extras: Parameters<typeof permisosEfectivos>[1],
  ): ActorPublico {
    return actorPublicoSchema.parse({
      id: row.id,
      username: row.username,
      rol: row.rol,
      permisos: permisosEfectivos(row.rol, extras),
      organizacionId: row.organizacionId,
      activo: row.activo,
    });
  }

  private async asegurarNoUltimoJefe(
    target: { id: string; rol: string; activo: boolean; organizacionId: string },
    accion: "desactivar" | "degradar",
  ): Promise<void> {
    if (target.rol !== "ADMIN_JEFE" || !target.activo) return;
    const jefes = await this.db
      .select({ id: usuario.id })
      .from(usuario)
      .where(
        and(
          eq(usuario.rol, "ADMIN_JEFE"),
          eq(usuario.activo, true),
          eq(usuario.organizacionId, target.organizacionId),
        ),
      );
    if (jefes.length <= 1) {
      throw new DomainException(
        "ULTIMO_ADMIN_JEFE",
        accion === "degradar"
          ? "No puede quitar el rol al último administrador jefe"
          : "No puede desactivar al último administrador jefe",
        400,
      );
    }
  }
}
