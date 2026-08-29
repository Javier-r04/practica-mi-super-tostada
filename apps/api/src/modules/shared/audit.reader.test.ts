import { describe, expect, test } from "bun:test";
import { organizacion, usuario } from "@misupertostada/db";
import { AuditReader, redactarAuditJson } from "./audit.reader";
import { AuditWriter } from "./audit.writer";
import {
  crearOrgDePrueba,
  openTestDb,
  postgresListo,
} from "../../test/db";

const listo = await postgresListo();

describe("redactarAuditJson", () => {
  test("no deja el payload crudo de token", () => {
    expect(
      redactarAuditJson({
        tokenPortal: "secreto",
        username: "carla",
        nested: { passwordHash: "x" },
      }),
    ).toEqual({
      tokenPortal: "[redactado]",
      username: "carla",
      nested: { passwordHash: "[redactado]" },
    });
  });
});

describe.skipIf(!listo)("AuditReader", () => {
  test("pagina, filtra por acción y no busca en el JSON sensible", async () => {
    const { client, db } = openTestDb();
    const writer = new AuditWriter(db);
    const reader = new AuditReader(db);
    try {
      const org = await crearOrgDePrueba(db, "org-audit-");
      const [u] = await db
        .insert(usuario)
        .values({
          organizacionId: org!.id,
          username: `lector-${crypto.randomUUID().slice(0, 8)}`,
          rol: "ADMIN_JEFE",
          activo: true,
        })
        .returning({ id: usuario.id });

      await writer.insert({
        actorTipo: "usuario",
        actorId: u!.id,
        accion: "usuarios.crear",
        entidad: "usuario",
        entidadId: u!.id,
        despues: { tokenPortal: "no-debe-verse", username: "x" },
      });
      await writer.insert({
        actorTipo: "usuario",
        actorId: u!.id,
        accion: "auth.login",
        entidad: "sesion",
        entidadId: u!.id,
      });

      const pagina = await reader.listar({ limit: 1, offset: 0 });
      expect(pagina.items.length).toBe(1);
      expect(pagina.total).toBeGreaterThanOrEqual(2);

      const filtrado = await reader.listar({ accion: "usuarios.crear", limit: 20 });
      expect(filtrado.items.every((i) => i.accion.includes("usuarios.crear"))).toBe(
        true,
      );
      const conToken = filtrado.items.find((i) => i.entidadId === u!.id);
      expect(JSON.stringify(conToken?.despues)).not.toContain("no-debe-verse");
      expect(JSON.stringify(conToken?.despues)).toContain("[redactado]");

      const porToken = await reader.listar({ q: "no-debe-verse", limit: 20 });
      expect(porToken.items.some((i) => i.entidadId === u!.id)).toBe(false);
    } finally {
      await client.end({ timeout: 1 });
    }
  });
});
