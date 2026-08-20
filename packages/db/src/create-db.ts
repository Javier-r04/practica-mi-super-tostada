/**
 * Crea la base de DATABASE_URL si no existe.
 * Conecta a `postgres` (base de sistema) para poder hacer CREATE DATABASE.
 */
import { resolve } from "node:path";
import { config } from "dotenv";
import postgres from "postgres";

config({ path: resolve(import.meta.dir, "../../../.env") });
config({ path: resolve(process.cwd(), ".env") });
config({ path: resolve(process.cwd(), "../../.env") });

const url =
  process.env.DATABASE_URL ??
  "postgresql://postgres:postgres@localhost:5432/misupertostada";

const parsed = new URL(url);
const dbName = decodeURIComponent(parsed.pathname.replace(/^\//, "")).split(
  "?"
)[0];
if (!dbName) {
  throw new Error("DATABASE_URL no incluye el nombre de la base");
}

parsed.pathname = "/postgres";
const sql = postgres(parsed.toString(), { max: 1 });

try {
  const exists = await sql`
    select 1 from pg_database where datname = ${dbName}
  `;
  if (exists.length > 0) {
    console.log(`Base "${dbName}" ya existe.`);
  } else {
    await sql.unsafe(`CREATE DATABASE "${dbName.replaceAll('"', "")}"`);
    console.log(`Base "${dbName}" creada.`);
  }
} finally {
  await sql.end({ timeout: 2 });
}
