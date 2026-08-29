import { describe, expect, test } from "bun:test";
import { drizzle } from "drizzle-orm/postgres-js";
import { and, eq, sql } from "drizzle-orm";
import postgres from "postgres";
import { outbox, testDatabaseUrl } from "@misupertostada/db";
import { OutboxWriter } from "./outbox.writer";

const databaseUrl = testDatabaseUrl();

async function outboxListo(): Promise<boolean> {
  const client = postgres(databaseUrl, { max: 1, connect_timeout: 2 });
  try {
    await client`select 1 from outbox limit 1`;
    return true;
  } catch {
    return false;
  } finally {
    await client.end({ timeout: 1 });
  }
}

const listo = await outboxListo();

describe.skipIf(!listo)("OutboxWriter", () => {
  test("el segundo insert idéntico no crea fila (unique de idempotencia)", async () => {
    const client = postgres(databaseUrl!, { max: 1 });
    const db = drizzle(client);
    const writer = new OutboxWriter(db);

    const destinatarioId = crypto.randomUUID();
    const input = {
      tipo: "test.idempotencia",
      destinatarioId,
      fechaOperacion: "2026-08-21",
      payload: { n: 1 },
    };

    try {
      const first = await writer.insert(input);
      const second = await writer.insert(input);

      expect(first).not.toBeNull();
      expect(second).toBeNull();

      const rows = await db
        .select({ n: sql<number>`count(*)::int` })
        .from(outbox)
        .where(
          and(
            eq(outbox.tipo, input.tipo),
            eq(outbox.destinatarioId, input.destinatarioId),
            eq(outbox.fechaOperacion, input.fechaOperacion),
          ),
        );
      expect(rows[0]?.n).toBe(1);
    } finally {
      await client.end();
    }
  });
});
