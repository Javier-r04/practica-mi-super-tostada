import { Inject, Injectable } from "@nestjs/common";
import { and, asc, eq, inArray } from "drizzle-orm";
import { outbox } from "@misupertostada/db";
import { DRIZZLE } from "./tokens";
import type { AppDatabase } from "./database.module";
import {
  OUTBOX_DISPATCHER,
  puedeDespachar,
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
    if (!puedeDespachar(this.dispatcher, row.tipo)) return "sin_handler";

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

  /**
   * Las pendientes más antiguas que ALGÚN handler sabe despachar.
   *
   * El filtro por tipo va en el `WHERE`: paginar el backlog para descartarlo
   * en memoria costaba una barrida completa cada vez que los tipos pendientes
   * no tenían handler —y esas filas se quedan en PENDIENTE para siempre, así
   * que el backlog solo crece.
   */
  async idsPendientes(limit = 50): Promise<string[]> {
    const tipos = this.dispatcher.tipos();
    if (tipos.length === 0) return [];

    const rows = await this.db
      .select({ id: outbox.id })
      .from(outbox)
      .where(
        and(eq(outbox.estado, "PENDIENTE"), inArray(outbox.tipo, [...tipos])),
      )
      .orderBy(asc(outbox.createdAt))
      .limit(limit);
    return rows.map((r) => r.id);
  }
}
