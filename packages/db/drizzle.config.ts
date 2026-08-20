import { defineConfig } from "drizzle-kit";

/**
 * Migraciones siempre con generate + migrate. Nunca `push` contra producción.
 */
export default defineConfig({
  schema: "./src/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
});
