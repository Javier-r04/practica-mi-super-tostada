import { Controller, Get, Inject } from "@nestjs/common";
import { envelopeOk } from "@misupertostada/shared";
import type { Sql } from "postgres";
import { POSTGRES_CLIENT } from "../modules/shared/tokens";

@Controller("health")
export class HealthController {
  constructor(@Inject(POSTGRES_CLIENT) private readonly sql: Sql) {}

  @Get()
  async check() {
    let db: "ok" | "down" = "down";
    try {
      await this.sql`select 1`;
      db = "ok";
    } catch {
      db = "down";
    }
    return envelopeOk({ status: "ok" as const, db });
  }
}
