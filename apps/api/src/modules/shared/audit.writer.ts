import { Inject, Injectable } from "@nestjs/common";
import { auditLog } from "@misupertostada/db";
import { DRIZZLE } from "./tokens";
import type { AppDatabase } from "./database.module";

export type AuditInsert = {
  actorTipo: string;
  actorId: string;
  accion: string;
  entidad: string;
  entidadId: string;
  antes?: unknown;
  despues?: unknown;
  ip?: string | null;
  userAgent?: string | null;
};

/** Append-only. No hay update ni delete. */
@Injectable()
export class AuditWriter {
  constructor(@Inject(DRIZZLE) private readonly db: AppDatabase) {}

  async insert(entry: AuditInsert, tx: AppDatabase = this.db): Promise<void> {
    await tx.insert(auditLog).values({
      actorTipo: entry.actorTipo,
      actorId: entry.actorId,
      accion: entry.accion,
      entidad: entry.entidad,
      entidadId: entry.entidadId,
      antes: entry.antes ?? null,
      despues: entry.despues ?? null,
      ip: entry.ip ?? null,
      userAgent: entry.userAgent ?? null,
    });
  }
}
