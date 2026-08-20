import { describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import { outbox } from "@misupertostada/db";
import { OutboxProcessor } from "./outbox.processor";
import type { OutboxDispatcher, OutboxRow } from "./outbox.dispatcher";
import { openTestDb, postgresListo } from "../../test/db";

class RecordingDispatcher implements OutboxDispatcher {
  calls: string[] = [];
  unique = new Set<string>();

  canHandle(tipo: string): boolean {
    return tipo.startsWith("test.");
  }

  async dispatch(row: OutboxRow): Promise<void> {
    this.calls.push(row.id);
    this.unique.add(row.id);
  }
}

const listo = await postgresListo();

describe.skipIf(!listo)("OutboxProcessor", () => {
  test("reinicio tras despachar y antes de marcar ENVIADO no duplica el efecto", async () => {
    const { client, db } = openTestDb();
    const dispatcher = new RecordingDispatcher();
    let crash = true;
    const processor = new OutboxProcessor(db, dispatcher);
    processor.afterDispatch = async () => {
      if (crash) {
        crash = false;
        throw new Error("reinicio");
      }
    };

    const [inserted] = await db
      .insert(outbox)
      .values({
        tipo: "test.reinicio",
        destinatarioId: crypto.randomUUID(),
        fechaOperacion: "2026-08-21",
        payload: { n: 1 },
      })
      .returning({ id: outbox.id });
    const id = inserted!.id;

    try {
      await expect(processor.processRow(id)).rejects.toThrow("reinicio");

      const [mid] = await db.select().from(outbox).where(eq(outbox.id, id));
      expect(mid?.estado).toBe("PENDIENTE");
      expect(dispatcher.calls.length).toBe(1);
      expect(dispatcher.unique.size).toBe(1);

      const result = await processor.processRow(id);
      expect(result).toBe("enviado");
      expect(dispatcher.calls.length).toBe(2);
      expect(dispatcher.unique.size).toBe(1);

      const [done] = await db.select().from(outbox).where(eq(outbox.id, id));
      expect(done?.estado).toBe("ENVIADO");
    } finally {
      await client.end({ timeout: 1 });
    }
  });

  test("si el proceso muere antes de despachar, el mensaje no se pierde", async () => {
    const { client, db } = openTestDb();
    const dispatcher = new RecordingDispatcher();
    const processor = new OutboxProcessor(db, dispatcher);

    const [inserted] = await db
      .insert(outbox)
      .values({
        tipo: "test.no-perdida",
        destinatarioId: crypto.randomUUID(),
        fechaOperacion: "2026-08-22",
        payload: { n: 1 },
      })
      .returning({ id: outbox.id });
    const id = inserted!.id;

    try {
      const pending = await processor.idsPendientes();
      expect(pending).toContain(id);

      const result = await processor.processRow(id);
      expect(result).toBe("enviado");
      expect(dispatcher.calls).toEqual([id]);
    } finally {
      await client.end({ timeout: 1 });
    }
  });
});
