import { config } from "dotenv";
import { resolve } from "node:path";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@misupertostada/db";
import {
  idsDeOrgsDePrueba,
  organizacion,
  purgarOrgs,
  sembrarVentanaSemanal,
  testDatabaseUrl as urlDeTest,
} from "@misupertostada/db";
import type { AppDatabase } from "../modules/shared/database.module";

config({ path: resolve(process.cwd(), ".env") });
config({ path: resolve(process.cwd(), "../../.env") });

export { urlDeTest as testDatabaseUrl };

/**
 * Borra las organizaciones que dejaron los tests. Lo llama el `afterAll` global
 * de `preload.ts` al terminar la corrida.
 *
 * Barre **por patrón de nombre**, no por una lista en memoria: bun carga el
 * preload en su propio grafo de módulos, así que no comparte estado con los
 * archivos de test. Sobre una base dedicada a tests eso además recupera lo que
 * dejaron corridas anteriores que murieron a medias.
 *
 * Es silencioso a propósito: una limpieza fallida no debe tumbar una suite
 * verde, solo avisar.
 */
export async function purgarOrgsDeLaCorrida(): Promise<void> {
  const { client, db } = openTestDb();
  try {
    const ids = await idsDeOrgsDePrueba(db);
    if (ids.length > 0) await purgarOrgs(db, ids);
  } catch (err) {
    console.warn("[test] no se pudieron purgar las orgs de prueba:", err);
  } finally {
    await client.end({ timeout: 5 });
  }
}

export async function postgresListo(): Promise<boolean> {
  const client = postgres(urlDeTest(), { max: 1, connect_timeout: 2 });
  try {
    await client`select 1`;
    return true;
  } catch {
    // Sin este aviso, una base de test inexistente salta TODOS los e2e por
    // `describe.skipIf` y la suite se ve verde sin haber probado nada.
    console.warn(
      `[test] sin base de datos de test (${urlDeTest()}). Los e2e se saltan. Crearla: bun run db:test:setup`,
    );
    return false;
  } finally {
    await client.end({ timeout: 1 });
  }
}

export function openTestDb(): {
  client: ReturnType<typeof postgres>;
  db: AppDatabase;
} {
  const client = postgres(urlDeTest(), { max: 1 });
  const db = drizzle(client, { schema }) as AppDatabase;
  return { client, db };
}

/**
 * Organización de prueba, ya sembrada.
 *
 * `ventana_semanal` es la única fuente de horario: una organización sin sus 7
 * filas tiene la semana apagada y el portal rechaza todo. Los fixtures que
 * insertaban la fila a mano dependían del fallback de columnas que ya no
 * existe, así que la siembra va aquí y no se puede olvidar.
 *
 * El nombre lleva un UUID porque el aislamiento entre tests depende solo de
 * eso: `openTestDb()` no trunca ni envuelve en transacción.
 */
export async function crearOrgDePrueba(
  db: AppDatabase,
  prefijo: string,
): Promise<{ id: string }> {
  const [org] = await db
    .insert(organizacion)
    .values({ nombre: `${prefijo}${crypto.randomUUID()}` })
    .returning({ id: organizacion.id });
  await sembrarVentanaSemanal(db, org!.id);
  return { id: org!.id };
}
