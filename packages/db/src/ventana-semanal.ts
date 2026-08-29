import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { HORARIO_SEMANAL_DEFAULT, type VentanaDiaDto } from "@misupertostada/shared";
import * as schema from "./schema";
import { ventanaSemanal } from "./schema";

/**
 * El mismo tipo que `AppDatabase` en la API y que el `drizzle(client, {schema})`
 * del seed: los tres hablan postgres-js contra este esquema.
 */
type Sembrable = PostgresJsDatabase<typeof schema>;

/**
 * Siembra las 7 filas de `ventana_semanal` de una organización.
 *
 * `ventana_semanal` es la **única** fuente de horario: si a una organización le
 * faltan filas, el calendario la trata como semana apagada y el portal rechaza
 * todo. Por eso toda organización nueva —seed, seed-mega o fixture de test—
 * pasa por aquí.
 *
 * Idempotente: `ON CONFLICT DO NOTHING` sobre `(organizacion_id, weekday)`, así
 * que nunca pisa lo que el admin haya guardado en `/configuracion`.
 */
export async function sembrarVentanaSemanal(
  db: Sembrable,
  organizacionId: string,
  horario: readonly VentanaDiaDto[] = HORARIO_SEMANAL_DEFAULT,
): Promise<void> {
  await db
    .insert(ventanaSemanal)
    .values(
      horario.map((dia) => ({
        organizacionId,
        weekday: dia.weekday,
        activa: dia.activa,
        apertura: dia.apertura,
        cierre: dia.cierre,
        cruzaMedianoche: dia.cruzaMedianoche,
      })),
    )
    .onConflictDoNothing({
      target: [ventanaSemanal.organizacionId, ventanaSemanal.weekday],
    });
}
