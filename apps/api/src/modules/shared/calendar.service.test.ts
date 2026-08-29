import { describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import { organizacion, ventanaSemanal } from "@misupertostada/db";
import { fixedClock, ZONA_NEGOCIO } from "@misupertostada/shared";
import { DateTime } from "luxon";
import { BusinessCalendarService } from "./calendar.service";
import { crearOrgDePrueba, openTestDb, postgresListo } from "../../test/db";

const listo = await postgresListo();

function instanteGT(isoLocal: string): Date {
  const dt = DateTime.fromISO(isoLocal, { zone: ZONA_NEGOCIO });
  if (!dt.isValid) throw new Error(`instante inválido: ${isoLocal}`);
  return dt.toJSDate();
}

describe.skipIf(!listo)("BusinessCalendarService: fuente única de horario", () => {
  test("con las filas sembradas, la madrugada pertenece a la ventana anterior", async () => {
    const { client, db } = openTestDb();
    try {
      const org = await crearOrgDePrueba(db, "org-cal-ok-");
      const cal = await new BusinessCalendarService(
        db,
        fixedClock(instanteGT("2026-08-25T01:30:00")),
      ).load(org.id);
      const now = instanteGT("2026-08-25T01:30:00");

      expect(cal.isVentanaAbierta(now)).toBe(true);
      expect(cal.getFechaOperacion(now)).toBe("2026-08-24");
      expect(cal.getHorarioReferencia(now)).toEqual({
        apertura: "15:00",
        cierre: "03:00",
      });
    } finally {
      await client.end({ timeout: 1 });
    }
  });

  test("sin filas en ventana_semanal la semana queda apagada, sin inventar horario", async () => {
    // Solo pasa si alguien las borra a mano. La respuesta correcta es «no hay
    // ventana», no un 15:00 fabricado que compita con lo que guarde el admin.
    const { client, db } = openTestDb();
    try {
      const org = await crearOrgDePrueba(db, "org-cal-vacia-");
      await db
        .delete(ventanaSemanal)
        .where(eq(ventanaSemanal.organizacionId, org.id));

      const servicio = new BusinessCalendarService(
        db,
        fixedClock(instanteGT("2026-08-24T20:00:00")),
      );
      const cal = await servicio.load(org.id);

      for (const hora of ["01:30", "10:00", "16:00", "20:00", "23:59"]) {
        expect(cal.isVentanaAbierta(instanteGT(`2026-08-24T${hora}:00`))).toBe(
          false,
        );
      }
      expect(cal.getHorarioReferencia(instanteGT("2026-08-24T20:00:00"))).toBe(
        null,
      );
      expect(cal.getProximaApertura(instanteGT("2026-08-24T20:00:00"))).toBe(
        null,
      );
      expect(cal.getCierreVentana(instanteGT("2026-08-24T20:00:00"))).toBe(
        null,
      );
    } finally {
      await client.end({ timeout: 1 });
    }
  });

  test("cada organización resuelve su propio horario", async () => {
    const { client, db } = openTestDb();
    try {
      const a = await crearOrgDePrueba(db, "org-cal-a-");
      const b = await crearOrgDePrueba(db, "org-cal-b-");
      await db
        .update(ventanaSemanal)
        .set({ cierre: "00:00" })
        .where(eq(ventanaSemanal.organizacionId, b.id));

      const now = instanteGT("2026-08-25T01:30:00");
      const servicio = new BusinessCalendarService(db, fixedClock(now));
      expect((await servicio.load(a.id)).isVentanaAbierta(now)).toBe(true);
      expect((await servicio.load(b.id)).isVentanaAbierta(now)).toBe(false);

      await db.delete(ventanaSemanal).where(eq(ventanaSemanal.organizacionId, a.id));
      await db.delete(ventanaSemanal).where(eq(ventanaSemanal.organizacionId, b.id));
      await db.delete(organizacion).where(eq(organizacion.id, a.id));
      await db.delete(organizacion).where(eq(organizacion.id, b.id));
    } finally {
      await client.end({ timeout: 1 });
    }
  });
});
