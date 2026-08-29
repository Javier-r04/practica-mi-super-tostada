import { describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import { outbox } from "@misupertostada/db";
import { OutboxProcessor } from "./outbox.processor";
import type { OutboxDispatcher, OutboxRow } from "./outbox.dispatcher";
import { openTestDb, postgresListo } from "../../test/db";

/**
 * Dispatcher acotado a UN tipo irrepetible por corrida.
 *
 * La BD de test es compartida y el outbox es append-only: filas de corridas
 * anteriores siguen ahí en PENDIENTE. Un dispatcher que acepte todo `test.*`
 * hace que `idsPendientes` devuelva la basura vieja y el test dependa de que
 * alguien haya truncado la tabla.
 */
class RecordingDispatcher implements OutboxDispatcher {
  calls: string[] = [];
  unique = new Set<string>();

  constructor(readonly tipo: string) {}

  tipos(): readonly string[] {
    return [this.tipo];
  }

  async dispatch(row: OutboxRow): Promise<void> {
    this.calls.push(row.id);
    this.unique.add(row.id);
  }
}

/** Tipo único por corrida: aísla el test de las filas ya acumuladas. */
function tipoUnico(nombre: string): string {
  return `test.${nombre}.${crypto.randomUUID()}`;
}

const listo = await postgresListo();

describe.skipIf(!listo)("OutboxProcessor", () => {
  test("reinicio tras despachar y antes de marcar ENVIADO no duplica el efecto", async () => {
    const { client, db } = openTestDb();
    const tipo = tipoUnico("reinicio");
    const dispatcher = new RecordingDispatcher(tipo);
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
        tipo,
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
    const tipo = tipoUnico("no-perdida");
    const dispatcher = new RecordingDispatcher(tipo);
    const processor = new OutboxProcessor(db, dispatcher);

    const [inserted] = await db
      .insert(outbox)
      .values({
        tipo,
        destinatarioId: crypto.randomUUID(),
        fechaOperacion: "2026-08-22",
        payload: { n: 1 },
      })
      .returning({ id: outbox.id });
    const id = inserted!.id;

    try {
      // Con el dispatcher acotado, la pendiente es exactamente esta fila.
      expect(await processor.idsPendientes()).toEqual([id]);

      const result = await processor.processRow(id);
      expect(result).toBe("enviado");
      expect(dispatcher.calls).toEqual([id]);
    } finally {
      await client.end({ timeout: 1 });
    }
  });
});
