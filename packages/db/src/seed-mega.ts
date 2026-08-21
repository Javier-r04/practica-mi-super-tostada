/**
 * Mega-seed de desarrollo: clientes, pedidos, cartera, ruta, WA, hojas.
 *
 * Uso:
 *   bun packages/db/src/seed-mega.ts           # clear + seed
 *   bun packages/db/src/seed-mega.ts --clear    # solo borrar
 *
 * Requiere el seed base (`bun run db:seed`) para org, productos y usuarios.
 */
import { resolve } from "node:path";
import { config } from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import { seed as seedBase } from "./seed";
import { clearMegaSeed } from "./seed-mega/clear";
import { runMegaSeed } from "./seed-mega/run";

config({ path: resolve(import.meta.dir, "../../../.env") });
config({ path: resolve(process.cwd(), ".env") });
config({ path: resolve(process.cwd(), "../../.env") });

async function main() {
  const url =
    process.env.DATABASE_URL ??
    "postgresql://postgres:postgres@localhost:5432/misupertostada";

  const onlyClear = process.argv.includes("--clear");
  const skipBase = process.argv.includes("--skip-base");

  if (!onlyClear && !skipBase) {
    console.log("[mega-seed] Aplicando seed base (idempotente)…");
    await seedBase(url);
  }

  const client = postgres(url, { max: 1 });
  const db = drizzle(client, { schema });

  try {
    console.log("[mega-seed] Limpiando datos [MEGA_SEED] previos…");
    const cleared = await clearMegaSeed(db);
    console.log(
      `[mega-seed] Borrados: ${cleared.clientes} clientes, ${cleared.pedidos} pedidos, ${cleared.hojas} hojas`,
    );

    if (onlyClear) {
      console.log("[mega-seed] Listo (solo clear).");
      return;
    }

    console.log("[mega-seed] Generando datos de prueba…");
    const stats = await runMegaSeed(db);
    console.log("[mega-seed] Listo:");
    console.log(`  fecha_operacion (hoy): ${stats.fechaOperacionHoy}`);
    console.log(`  clientes nuevos:      ${stats.clientesNuevos}`);
    console.log(`  pedidos:              ${stats.pedidos}`);
    console.log(`  facturas:             ${stats.facturas}`);
    console.log(`  pagos:                ${stats.pagos}`);
    console.log(`  conversaciones WA:    ${stats.conversaciones}`);
    console.log(`  mensajes:             ${stats.mensajes}`);
    console.log(`  hojas producción:     ${stats.hojas}`);
    console.log(
      "  Portal ejemplo: http://localhost:3000/p/mega-portal-el-portal-de-antigua",
    );
  } finally {
    await client.end();
  }
}

if (import.meta.main) {
  await main();
}
