/**
 * Aplica las migraciones a la base de test.
 *
 * Va por el migrador de drizzle-orm y no por `drizzle-kit migrate` a propósito:
 * `drizzle.config.ts` lee `DATABASE_URL`, y bun carga `.env` por su cuenta, así
 * que pasar la URL por variable de entorno a un proceso hijo no es fiable. Aquí
 * la URL es un argumento, no un ambiente.
 */
import { resolve } from "node:path";
import { config } from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { testDatabaseUrl } from "./test-url";

config({ path: resolve(import.meta.dir, "../../../.env") });
config({ path: resolve(process.cwd(), ".env") });

const url = testDatabaseUrl();
const client = postgres(url, { max: 1 });

try {
  await migrate(drizzle(client), {
    migrationsFolder: resolve(import.meta.dir, "../drizzle"),
  });
  console.log(`Migraciones aplicadas a ${new URL(url).pathname.slice(1)}.`);
} finally {
  await client.end({ timeout: 5 });
}
