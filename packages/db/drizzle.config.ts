import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "drizzle-kit";

const here = dirname(fileURLToPath(import.meta.url));

/**
 * Migraciones siempre con generate + migrate. Nunca `push` contra producción.
 */
export default defineConfig({
  schema: join(here, "src/schema.ts"),
  out: join(here, "drizzle"),
  dialect: "postgresql",
  dbCredentials: {
    url:
      process.env.DATABASE_URL ??
      "postgresql://postgres:postgres@localhost:5432/misupertostada",
  },
});
