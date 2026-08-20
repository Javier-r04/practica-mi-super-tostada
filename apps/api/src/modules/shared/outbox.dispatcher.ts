import type { outbox } from "@misupertostada/db";

export type OutboxRow = typeof outbox.$inferSelect;

export const OUTBOX_DISPATCHER = Symbol("OUTBOX_DISPATCHER");

export interface OutboxDispatcher {
  canHandle(tipo: string): boolean;
  /** Idempotente por `row.id`. Un reintento no debe producir un segundo efecto. */
  dispatch(row: OutboxRow): Promise<void>;
}

/** Varios módulos registran handlers. Shared no importa Messaging. */
export class OutboxDispatcherRegistry implements OutboxDispatcher {
  private readonly handlers: OutboxDispatcher[] = [];

  register(handler: OutboxDispatcher): void {
    this.handlers.push(handler);
  }

  canHandle(tipo: string): boolean {
    return this.handlers.some((h) => h.canHandle(tipo));
  }

  async dispatch(row: OutboxRow): Promise<void> {
    const handler = this.handlers.find((h) => h.canHandle(row.tipo));
    if (!handler) {
      throw new Error(`Ningún handler de outbox para ${row.tipo}`);
    }
    await handler.dispatch(row);
  }
}

export class NullOutboxDispatcher implements OutboxDispatcher {
  canHandle(): boolean {
    return false;
  }

  async dispatch(): Promise<void> {
    throw new Error("Ningún handler de outbox registrado");
  }
}
