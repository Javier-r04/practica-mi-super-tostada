import type { outbox } from "@misupertostada/db";

export type OutboxRow = typeof outbox.$inferSelect;

export const OUTBOX_DISPATCHER = Symbol("OUTBOX_DISPATCHER");

export interface OutboxDispatcher {
  canHandle(tipo: string): boolean;
  /** Idempotente por `row.id`. Un reintento no debe producir un segundo efecto. */
  dispatch(row: OutboxRow): Promise<void>;
}

export class NullOutboxDispatcher implements OutboxDispatcher {
  canHandle(): boolean {
    return false;
  }

  async dispatch(): Promise<void> {
    throw new Error("Ningún handler de outbox registrado");
  }
}
