import { config } from "dotenv";
import { resolve } from "node:path";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@misupertostada/db";
import type { AppDatabase } from "../modules/shared/database.module";

config({ path: resolve(process.cwd(), ".env") });
config({ path: resolve(process.cwd(), "../../.env") });

export function testDatabaseUrl(): string {
  return (
    process.env.DATABASE_URL ??
    "postgresql://postgres:postgres@localhost:5432/misupertostada"
  );
}

export async function postgresListo(): Promise<boolean> {
  const client = postgres(testDatabaseUrl(), { max: 1, connect_timeout: 2 });
  try {
    await client`select 1`;
    return true;
  } catch {
    return false;
  } finally {
    await client.end({ timeout: 1 });
  }
}

export function openTestDb(): {
  client: ReturnType<typeof postgres>;
  db: AppDatabase;
} {
  const client = postgres(testDatabaseUrl(), { max: 1 });
  const db = drizzle(client, { schema }) as AppDatabase;
  return { client, db };
}
