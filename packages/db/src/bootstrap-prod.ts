/**
 * Idempotente. Corre en cada arranque del contenedor `api`:
 * organización, ventana semanal, permisos, y el primer ADMIN_JEFE si no hay usuarios.
 *
 * No siembra catálogo ni clientes: eso es `SEED_ON_BOOT=true` (una vez).
 */
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as argon2 from "argon2";
import { PERMISO_DESCRIPCION, PERMISOS } from "@misupertostada/shared";
import * as schema from "./schema";
import { sembrarVentanaSemanal } from "./ventana-semanal";

const ORG_ID = "00000000-0000-4000-a000-000000000001";

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error("DATABASE_URL es obligatorio para el bootstrap");
}

const username = process.env.BOOTSTRAP_ADMIN_USERNAME;
const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;

const client = postgres(url, { max: 1 });
const db = drizzle(client, { schema });

try {
  await db
    .insert(schema.organizacion)
    .values({ id: ORG_ID, nombre: "Mi Súper Tostada" })
    .onConflictDoNothing({ target: schema.organizacion.id });

  await sembrarVentanaSemanal(db, ORG_ID);

  await db
    .insert(schema.permiso)
    .values(
      PERMISOS.map((codigo) => ({
        codigo,
        descripcion: PERMISO_DESCRIPCION[codigo],
      })),
    )
    .onConflictDoNothing();

  if (username && password) {
    const existing = await db.select({ id: schema.usuario.id }).from(schema.usuario).limit(1);
    if (existing.length === 0) {
      const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
      await db.insert(schema.usuario).values({
        organizacionId: ORG_ID,
        username,
        passwordHash,
        rol: "ADMIN_JEFE",
      });
      console.log(`ADMIN_JEFE "${username}" creado.`);
    }
  }
} finally {
  await client.end({ timeout: 5 });
}
