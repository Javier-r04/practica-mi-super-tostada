import { Inject, Injectable } from "@nestjs/common";
import { asc, eq } from "drizzle-orm";
import { outbox } from "@misupertostada/db";
import { DRIZZLE } from "./tokens";
import type { AppDatabase } from "./database.module";
import {
  OUTBOX_DISPATCHER,
  type OutboxDispatcher,
} from "./outbox.dispatcher";

export const OUTBOX_MAX_INTENTOS = 8;

type ProcessResult =
  | "enviado"
  | "error"
  | "fallo"
  | "sin_handler"
  | "no_encontrado"
  | "ya_enviado";

/**
 * Drena una fila del outbox. El despacho es at-least-once;
 * el dispatcher debe ser idempotente por `outbox.id`.
 */
@Injectable()
export class OutboxProcessor {
  afterDispatch?: () => Promise<void>;

  constructor(
    @Inject(DRIZZLE) private readonly db: AppDatabase,
    @Inject(OUTBOX_DISPATCHER) private readonly dispatcher: OutboxDispatcher,
  ) {}

  async processRow(id: string): Promise<ProcessResult> {
    const [row] = await this.db
      .select()
      .from(outbox)
      .where(eq(outbox.id, id))
      .limit(1);

    if (!row) return "no_encontrado";
    if (row.estado === "ENVIADO") return "ya_enviado";
    if (row.estado === "ERROR") return "error";
    if (!this.dispatcher.canHandle(row.tipo)) return "sin_handler";

    try {
      await this.dispatcher.dispatch(row);
    } catch {
      const intentos = row.intentos + 1;
      const estado = intentos >= OUTBOX_MAX_INTENTOS ? "ERROR" : "PENDIENTE";
      await this.db
        .update(outbox)
        .set({ estado, intentos })
        .where(eq(outbox.id, id));
      return estado === "ERROR" ? "error" : "fallo";
    }

    await this.afterDispatch?.();

    await this.db
      .update(outbox)
      .set({ estado: "ENVIADO" })
      .where(eq(outbox.id, id));
    return "enviado";
  }

  async idsPendientes(limit = 50): Promise<string[]> {
    const ids: string[] = [];
    let offset = 0;
    const batchSize = 100;
    while (ids.length < limit) {
      const rows = await this.db
        .select({ id: outbox.id, tipo: outbox.tipo })
        .from(outbox)
        .where(eq(outbox.estado, "PENDIENTE"))
        .orderBy(asc(outbox.createdAt))
        .limit(batchSize)
        .offset(offset);
      if (rows.length === 0) break;
      offset += rows.length;
      for (const row of rows) {
        if (!this.dispatcher.canHandle(row.tipo)) continue;
        ids.push(row.id);
        if (ids.length >= limit) break;
      }
    }
    return ids;
  }
}
