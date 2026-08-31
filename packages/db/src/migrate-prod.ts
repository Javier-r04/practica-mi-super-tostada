/**
 * Aplica migraciones Drizzle contra DATABASE_URL.
 * Pensado para el contenedor de la API (Node/Bun). No lee `.env` de desarrollo:
 * la URL tiene que venir del entorno del compose.
 */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error("DATABASE_URL es obligatorio para migrar");
}

const here = dirname(fileURLToPath(import.meta.url));
const client = postgres(url, { max: 1 });

try {
  await migrate(drizzle(client), {
    migrationsFolder: resolve(here, "../drizzle"),
  });
  console.log("Migraciones aplicadas.");
} finally {
  await client.end({ timeout: 5 });
}
