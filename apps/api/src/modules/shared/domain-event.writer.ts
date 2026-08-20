import { Inject, Injectable } from "@nestjs/common";
import { domainEvents } from "@misupertostada/db";
import { DRIZZLE } from "./tokens";
import type { AppDatabase } from "./database.module";

@Injectable()
export class DomainEventWriter {
  constructor(@Inject(DRIZZLE) private readonly db: AppDatabase) {}

  async insert(
    tipo: string,
    payload: unknown,
    tx: AppDatabase = this.db,
  ): Promise<void> {
    await tx.insert(domainEvents).values({ tipo, payload });
  }
}
