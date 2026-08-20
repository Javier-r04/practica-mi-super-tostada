import { Inject, Injectable } from "@nestjs/common";
import { eq } from "drizzle-orm";
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
    const rows = await this.db
      .select({ id: outbox.id, tipo: outbox.tipo, estado: outbox.estado })
      .from(outbox)
      .where(eq(outbox.estado, "PENDIENTE"))
      .limit(limit);

    return rows
      .filter((row) => this.dispatcher.canHandle(row.tipo))
      .map((row) => row.id);
  }
}
