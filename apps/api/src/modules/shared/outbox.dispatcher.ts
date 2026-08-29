import type { outbox } from "@misupertostada/db";

export type OutboxRow = typeof outbox.$inferSelect;

export const OUTBOX_DISPATCHER = Symbol("OUTBOX_DISPATCHER");

export interface OutboxDispatcher {
  /**
   * Tipos que este handler acepta, enumerados.
   *
   * Es la única fuente de verdad del filtro: `idsPendientes` lo baja a SQL en
   * vez de paginar el backlog entero para descartarlo en memoria.
   */
  tipos(): readonly string[];
  /** Idempotente por `row.id`. Un reintento no debe producir un segundo efecto. */
  dispatch(row: OutboxRow): Promise<void>;
}

export function puedeDespachar(
  dispatcher: OutboxDispatcher,
  tipo: string,
): boolean {
  return dispatcher.tipos().includes(tipo);
}

/** Varios módulos registran handlers. Shared no importa Messaging. */
export class OutboxDispatcherRegistry implements OutboxDispatcher {
  private readonly handlers: OutboxDispatcher[] = [];

  register(handler: OutboxDispatcher): void {
    this.handlers.push(handler);
  }

  tipos(): readonly string[] {
    return [...new Set(this.handlers.flatMap((h) => h.tipos()))];
  }

  async dispatch(row: OutboxRow): Promise<void> {
    const handler = this.handlers.find((h) => puedeDespachar(h, row.tipo));
    if (!handler) {
      throw new Error(`Ningún handler de outbox para ${row.tipo}`);
    }
    await handler.dispatch(row);
  }
}

export class NullOutboxDispatcher implements OutboxDispatcher {
  tipos(): readonly string[] {
    return [];
  }

  async dispatch(): Promise<void> {
    throw new Error("Ningún handler de outbox registrado");
  }
}
