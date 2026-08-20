import { Inject, Injectable } from "@nestjs/common";
import { outbox } from "@misupertostada/db";
import { DRIZZLE } from "./tokens";
import type { AppDatabase } from "./database.module";

export type OutboxInsert = {
  tipo: string;
  destinatarioId: string;
  fechaOperacion: string;
  payload: unknown;
};

/**
 * Escribe el outbox en la transacción del caller.
 * El unique (tipo, destinatario_id, fecha_operacion) evita duplicados.
 */
@Injectable()
export class OutboxWriter {
  constructor(@Inject(DRIZZLE) private readonly db: AppDatabase) {}

  async insert(
    input: OutboxInsert,
    tx: AppDatabase = this.db,
  ): Promise<{ id: string } | null> {
    const rows = await tx
      .insert(outbox)
      .values({
        tipo: input.tipo,
        destinatarioId: input.destinatarioId,
        fechaOperacion: input.fechaOperacion,
        payload: input.payload,
      })
      .onConflictDoNothing()
      .returning({ id: outbox.id });
    return rows[0] ?? null;
  }
}
