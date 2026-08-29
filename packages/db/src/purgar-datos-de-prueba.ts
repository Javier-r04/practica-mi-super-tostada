/**
 * Barre las organizaciones que dejan los e2e y todo lo que cuelga de ellas.
 *
 * Los e2e se aíslan por UUID en el nombre de la organización: no truncan ni
 * envuelven en transacción, así que cada corrida deja su organización entera
 * en la base. En agosto de 2026 la base de desarrollo tenía 31 003
 * organizaciones activas, 31 002 de ellas basura de tests, y el cron de cierre
 * (`CierreService.cerrarSiToca`) las recorría todas cada minuto.
 *
 *   bun run db:purge:test-data          # sobre DATABASE_URL
 *   bun run db:purge:test-data --dry    # solo cuenta, no borra
 */
import { resolve } from "node:path";
import { config } from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import {
  idsDeOrgsDePrueba,
  purgarOrgs,
  purgarOutboxHuerfano,
} from "./purga";

config({ path: resolve(import.meta.dir, "../../../.env") });

const url =
  process.env.DATABASE_URL ??
  "postgresql://postgres:postgres@localhost:5432/misupertostada";
const dry = process.argv.includes("--dry");

const client = postgres(url, { max: 1 });
const db = drizzle(client);

try {
  const ids = await idsDeOrgsDePrueba(db);
  console.log(`Organizaciones de prueba encontradas: ${ids.length}`);
  if (dry) {
    console.log("--dry: no se borró nada.");
  } else if (ids.length > 0) {
    const borradas = await purgarOrgs(db, ids);
    await purgarOutboxHuerfano(db);
    console.log(`Borradas: ${borradas}`);
  }
  const [fila] = await client`select count(*)::int as count from organizacion`;
  console.log(`Organizaciones restantes: ${fila?.count ?? "?"}`);
} finally {
  await client.end({ timeout: 5 });
}
