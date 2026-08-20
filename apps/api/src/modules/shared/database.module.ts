import { Global, Inject, Module, type OnModuleDestroy } from "@nestjs/common";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type { Sql } from "postgres";
import * as schema from "@misupertostada/db";
import { loadEnv } from "../../config/env";
import { DRIZZLE, POSTGRES_CLIENT } from "./tokens";

export type AppDatabase = PostgresJsDatabase<typeof schema>;

@Global()
@Module({
  providers: [
    {
      provide: POSTGRES_CLIENT,
      useFactory: async (): Promise<Sql> => {
        const env = loadEnv();
        const postgres = (await import("postgres")).default;
        return postgres(env.DATABASE_URL, { max: 10 });
      },
    },
    {
      provide: DRIZZLE,
      inject: [POSTGRES_CLIENT],
      useFactory: (client: Sql): AppDatabase =>
        drizzle(client, { schema }),
    },
  ],
  exports: [DRIZZLE, POSTGRES_CLIENT],
})
export class DatabaseModule implements OnModuleDestroy {
  constructor(@Inject(POSTGRES_CLIENT) private readonly client: Sql) {}

  async onModuleDestroy(): Promise<void> {
    await this.client.end({ timeout: 5 });
  }
}
