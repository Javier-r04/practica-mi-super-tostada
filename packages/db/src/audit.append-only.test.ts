import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { config } from "dotenv";
import { resolve } from "node:path";
import { auditLog } from "./schema";

config({ path: resolve(process.cwd(), ".env") });
config({ path: resolve(process.cwd(), "../../.env") });

const sqlFile = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "../drizzle/0002_audit_append_only.sql"),
  "utf8",
);

describe("migración 0002 audit_log append-only", () => {
  test("el SQL crea triggers BEFORE UPDATE y DELETE con EXECUTE FUNCTION", () => {
    expect(sqlFile).toContain("EXECUTE FUNCTION audit_log_append_only");
    expect(sqlFile).toContain("BEFORE UPDATE ON audit_log");
    expect(sqlFile).toContain("BEFORE DELETE ON audit_log");
    expect(sqlFile).toContain("RAISE EXCEPTION 'audit_log es append-only'");
  });
});

const databaseUrl =
  process.env.DATABASE_URL ??
  "postgresql://postgres:postgres@localhost:5432/misupertostada";

async function postgresListo(): Promise<boolean> {
  const client = postgres(databaseUrl, { max: 1, connect_timeout: 2 });
  try {
    await client`select 1 from audit_log limit 1`;
    return true;
  } catch {
    return false;
  } finally {
    await client.end({ timeout: 1 });
  }
}

const listo = await postgresListo();

describe.skipIf(!listo)("audit_log en Postgres", () => {
  test("UPDATE y DELETE están bloqueados", async () => {
    const client = postgres(databaseUrl, { max: 1 });
    const db = drizzle(client);

    try {
      const [row] = await db
        .insert(auditLog)
        .values({
          actorTipo: "test",
          actorId: "audit-append-only",
          accion: "test.append_only",
          entidad: "test",
          entidadId: crypto.randomUUID(),
        })
        .returning({ id: auditLog.id });

      let updateMsg = "";
      try {
        await client.unsafe(
          `UPDATE audit_log SET accion = 'hack' WHERE id = '${row!.id}'`,
        );
      } catch (err) {
        updateMsg = err instanceof Error ? err.message : String(err);
      }
      expect(updateMsg).toMatch(/append-only/i);

      let deleteMsg = "";
      try {
        await client.unsafe(
          `DELETE FROM audit_log WHERE id = '${row!.id}'`,
        );
      } catch (err) {
        deleteMsg = err instanceof Error ? err.message : String(err);
      }
      expect(deleteMsg).toMatch(/append-only/i);
    } finally {
      await client.end({ timeout: 1 });
    }
  });
});
