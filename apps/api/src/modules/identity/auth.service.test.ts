import { describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import { organizacion, permiso, usuario } from "@misupertostada/db";
import { permisosEfectivos, systemClock } from "@misupertostada/shared";
import { AuthService } from "./auth.service";
import { PasswordService } from "./password.service";
import { SessionService } from "./session.service";
import { UsuariosService } from "./usuarios.service";
import { AuditWriter } from "../shared/audit.writer";
import { DomainException } from "../shared/domain.exception";
import { openTestDb, postgresListo } from "../../test/db";
import type { Actor } from "./actor";
import type { SessionCookieConfig } from "./actor";

const listo = await postgresListo();
const cookie: SessionCookieConfig = {
  name: "session",
  ttlSeconds: 3600,
  secure: false,
};

async function fixture() {
  const { client, db } = openTestDb();
  const passwords = new PasswordService();
  const sessions = new SessionService(db, systemClock, cookie);
  const audit = new AuditWriter(db);
  const auth = new AuthService(db, systemClock, passwords, sessions, audit);
  const usuarios = new UsuariosService(db, passwords, sessions, audit);

  const [org] = await db
    .insert(organizacion)
    .values({ nombre: `org-${crypto.randomUUID()}` })
    .returning({ id: organizacion.id });

  const password = "clave-dev-local-10";
  const hash = await passwords.hash(password);
  const username = `jefe-${crypto.randomUUID().slice(0, 8)}`;
  const [jefe] = await db
    .insert(usuario)
    .values({
      organizacionId: org!.id,
      username,
      passwordHash: hash,
      rol: "ADMIN_JEFE",
      activo: true,
    })
    .returning({ id: usuario.id });

  return {
    client,
    db,
    auth,
    usuarios,
    sessions,
    passwords,
    orgId: org!.id,
    jefeId: jefe!.id,
    username,
    password,
  };
}

function actorJefe(f: Awaited<ReturnType<typeof fixture>>): Actor {
  return {
    usuarioId: f.jefeId,
    organizacionId: f.orgId,
    username: f.username,
    rol: "ADMIN_JEFE",
    permisos: permisosEfectivos("ADMIN_JEFE"),
    sesionId: crypto.randomUUID(),
    ip: "127.0.0.1",
    userAgent: "test",
  };
}

describe.skipIf(!listo)("AuthService", () => {
  test("login correcto emite token de sesión; el hash no es el token", async () => {
    const f = await fixture();
    try {
      const { actor, token } = await f.auth.login(
        { username: f.username, password: f.password },
        { ip: "127.0.0.1", userAgent: "test" },
      );
      expect(actor.rol).toBe("ADMIN_JEFE");
      expect(actor.permisos).toContain("precios.cambiar");
      expect(token.length).toBeGreaterThan(20);

      const resolved = await f.sessions.resolve(token);
      expect(resolved.usuarioId).toBe(f.jefeId);
    } finally {
      await f.client.end({ timeout: 1 });
    }
  });

  test("password mala, usuario inactivo y username desconocido fallan igual", async () => {
    const f = await fixture();
    try {
      const fail = (body: object) =>
        f.auth.login(body, { ip: "10.0.0.1", userAgent: "test" });

      await expect(
        fail({ username: f.username, password: "no-es" }),
      ).rejects.toBeInstanceOf(DomainException);

      await f.db
        .update(usuario)
        .set({ activo: false })
        .where(eq(usuario.id, f.jefeId));
      await expect(
        fail({ username: f.username, password: f.password }),
      ).rejects.toMatchObject({ code: "CREDENCIALES_INVALIDAS" });

      await expect(
        fail({ username: "nadie", password: f.password }),
      ).rejects.toMatchObject({ code: "CREDENCIALES_INVALIDAS" });
    } finally {
      await f.client.end({ timeout: 1 });
    }
  });

  test("logout invalida la cookie de inmediato", async () => {
    const f = await fixture();
    try {
      const { token } = await f.auth.login(
        { username: f.username, password: f.password },
        { ip: "127.0.0.1", userAgent: "test" },
      );
      const resolved = await f.sessions.resolve(token);
      await f.auth.logout(token, { ip: "127.0.0.1", userAgent: "test" }, {
        ...actorJefe(f),
        sesionId: resolved.sesionId,
      });
      await expect(f.sessions.resolve(token)).rejects.toMatchObject({
        code: "SESION_REQUERIDA",
      });
    } finally {
      await f.client.end({ timeout: 1 });
    }
  });
});

describe.skipIf(!listo)("UsuariosService", () => {
  test("ADMIN_JEFE delega precios.cambiar y no puede delegar ventana.reabrir", async () => {
    const f = await fixture();
    try {
      const jefe = actorJefe(f);
      const creado = await f.usuarios.crear(
        {
          username: `admin-${crypto.randomUUID().slice(0, 8)}`,
          password: "clave-dev-local-10",
          rol: "ADMIN",
        },
        jefe,
      );
      expect(creado.permisos).not.toContain("precios.cambiar");

      const [permRow] = await f.db
        .select()
        .from(permiso)
        .where(eq(permiso.codigo, "precios.cambiar"))
        .limit(1);
      if (!permRow) {
        await f.db.insert(permiso).values({
          codigo: "precios.cambiar",
          descripcion: "Cambiar precios por cliente",
        });
      }

      const conPrecio = await f.usuarios.delegar(
        creado.id,
        { codigo: "precios.cambiar", granted: true },
        jefe,
      );
      expect(conPrecio.permisos).toContain("precios.cambiar");

      await expect(
        f.usuarios.delegar(
          creado.id,
          { codigo: "ventana.reabrir", granted: true },
          jefe,
        ),
      ).rejects.toMatchObject({ code: "PERMISO_NO_DELEGABLE" });
    } finally {
      await f.client.end({ timeout: 1 });
    }
  });
});
