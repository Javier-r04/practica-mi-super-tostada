import { Inject, Injectable } from "@nestjs/common";
import { eq } from "drizzle-orm";
import { cliente } from "@misupertostada/db";
import { MENSAJE_PORTAL_NO_ENCONTRADO } from "@misupertostada/shared";
import { DRIZZLE } from "../shared/tokens";
import type { AppDatabase } from "../shared/database.module";
import { DomainException } from "../shared/domain.exception";
import { hashPortalToken } from "../shared/portal-token";

export type ClientePortal = typeof cliente.$inferSelect;

const NO_ENCONTRADO = () =>
  new DomainException("NO_ENCONTRADO", MENSAJE_PORTAL_NO_ENCONTRADO, 404);

@Injectable()
export class PortalTokenService {
  constructor(@Inject(DRIZZLE) private readonly db: AppDatabase) {}

  async resolver(token: string): Promise<ClientePortal> {
    if (!token || token.length < 8) {
      throw NO_ENCONTRADO();
    }
    const [row] = await this.db
      .select()
      .from(cliente)
      .where(eq(cliente.tokenPortalHash, hashPortalToken(token)))
      .limit(1);
    if (!row || !row.activo) {
      throw NO_ENCONTRADO();
    }
    return row;
  }
}
