/**
 * Crea la base de datos de test si no existe.
 *
 * Es la hermana de `create-db.ts`, pero sobre `testDatabaseUrl()`: los tests no
 * deben tocar la base de desarrollo. Ver `test-url.ts` para el porqué.
 */
import { resolve } from "node:path";
import { config } from "dotenv";
import postgres from "postgres";
import { testDatabaseUrl } from "./test-url";

config({ path: resolve(import.meta.dir, "../../../.env") });
config({ path: resolve(process.cwd(), ".env") });
config({ path: resolve(process.cwd(), "../../.env") });

const url = testDatabaseUrl();
const parsed = new URL(url);
const dbName = decodeURIComponent(parsed.pathname.replace(/^\//, "")).split(
  "?",
)[0];
if (!dbName) {
  throw new Error("La URL de test no incluye el nombre de la base");
}

parsed.pathname = "/postgres";
const sql = postgres(parsed.toString(), { max: 1 });

try {
  const exists = await sql`select 1 from pg_database where datname = ${dbName}`;
  if (exists.length > 0) {
    console.log(`Base de test "${dbName}" ya existe.`);
  } else {
    await sql.unsafe(`CREATE DATABASE "${dbName.replaceAll('"', "")}"`);
    console.log(`Base de test "${dbName}" creada.`);
  }
} finally {
  await sql.end({ timeout: 2 });
}
