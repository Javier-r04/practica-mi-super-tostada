import { and, desc, eq, sql } from "drizzle-orm";
import { diaOperacion, hojaProduccion } from "@misupertostada/db";
import type { DiaEstadoCalendario } from "@misupertostada/shared";
import type { AppDatabase } from "./database.module";

/**
 * Serializa captura y cierre del mismo (org, fecha).
 * Cubre el caso SIN_CIERRE, cuando aún no hay fila en dia_operacion.
 */
export async function bloquearDiaOperacion(
  tx: AppDatabase,
  organizacionId: string,
  fechaOperacion: string,
): Promise<void> {
  const clave = `${organizacionId}:${fechaOperacion}`;
  await tx.execute(
    sql`SELECT pg_advisory_xact_lock(hashtextextended(${clave}, 0))`,
  );
}

export async function leerEstadoDia(
  db: AppDatabase,
  organizacionId: string,
  fechaOperacion: string,
): Promise<{
  diaEstado: DiaEstadoCalendario;
  versionHoja: number | null;
  motivoReapertura: string | null;
}> {
  const [dia] = await db
    .select()
    .from(diaOperacion)
    .where(
      and(
        eq(diaOperacion.organizacionId, organizacionId),
        eq(diaOperacion.fechaOperacion, fechaOperacion),
      ),
    )
    .limit(1);

  const [hoja] = await db
    .select({ version: hojaProduccion.version })
    .from(hojaProduccion)
    .where(
      and(
        eq(hojaProduccion.organizacionId, organizacionId),
        eq(hojaProduccion.fechaOperacion, fechaOperacion),
      ),
    )
    .orderBy(desc(hojaProduccion.version))
    .limit(1);

  const diaEstado: DiaEstadoCalendario =
    dia?.estado === "CERRADO"
      ? "CERRADO"
      : dia?.estado === "REABIERTO"
        ? "REABIERTO"
        : "SIN_CIERRE";

  return {
    diaEstado,
    versionHoja: hoja?.version ?? null,
    motivoReapertura: dia?.motivoReapertura ?? null,
  };
}
