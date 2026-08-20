import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { DateTime } from "luxon";
import {
  ZONA_NEGOCIO,
  createBusinessCalendar,
} from "./calendar";

const calendar = createBusinessCalendar({
  diasNoLaborables: ["2026-09-15"],
});

function instanteGT(isoLocal: string): Date {
  const dt = DateTime.fromISO(isoLocal, { zone: ZONA_NEGOCIO });
  if (!dt.isValid) {
    throw new Error(`instante inválido: ${isoLocal}`);
  }
  return dt.toJSDate();
}

describe("BusinessCalendar", () => {
  test("la zona del negocio es America/Guatemala", () => {
    expect(ZONA_NEGOCIO).toBe("America/Guatemala");
  });

  test("el módulo no usa new Date() ni Date.now(); el reloj se inyecta", () => {
    const src = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "calendar.ts"),
      "utf8",
    );
    expect(src).not.toMatch(/Date\.now\s*\(/);
    expect(src).not.toMatch(/new\s+Date\s*\(/);
  });

  test("14:59: ventana cerrada", () => {
    const now = instanteGT("2026-08-20T14:59:00");
    expect(calendar.isVentanaAbierta(now)).toBe(false);
  });

  test("15:00: ventana abierta", () => {
    const now = instanteGT("2026-08-20T15:00:00");
    expect(calendar.isVentanaAbierta(now)).toBe(true);
  });

  test("23:59: ventana abierta y fecha_operacion es el siguiente hábil", () => {
    const now = instanteGT("2026-08-20T23:59:00");
    expect(calendar.isVentanaAbierta(now)).toBe(true);
    expect(calendar.getFechaOperacion(now)).toBe("2026-08-21");
  });

  test("cambio de día a medianoche: 00:00 ya es el día siguiente", () => {
    const antes = instanteGT("2026-08-20T23:59:00");
    const medianoche = instanteGT("2026-08-21T00:00:00");

    expect(calendar.isVentanaAbierta(medianoche)).toBe(false);
    expect(calendar.getFechaOperacion(antes)).toBe("2026-08-21");
    expect(calendar.getFechaOperacion(medianoche)).toBe("2026-08-22");
  });

  test("sábado: es hábil y la carga efectiva sale de PLANTA", () => {
    expect(calendar.isSabado("2026-08-22")).toBe(true);
    expect(calendar.isDiaNoLaborable("2026-08-22")).toBe(false);
    expect(calendar.puntoCargaEfectivo("DEMOCRACIA", "2026-08-22")).toBe(
      "PLANTA",
    );
    expect(calendar.puntoCargaEfectivo("PLANTA", "2026-08-22")).toBe("PLANTA");

    const sabadoTarde = instanteGT("2026-08-22T16:00:00");
    expect(calendar.getFechaOperacion(sabadoTarde)).toBe("2026-08-24");
  });

  test("en día hábil no sábado se respeta el punto de carga del producto", () => {
    expect(calendar.puntoCargaEfectivo("DEMOCRACIA", "2026-08-21")).toBe(
      "DEMOCRACIA",
    );
    expect(calendar.puntoCargaEfectivo("PLANTA", "2026-08-21")).toBe("PLANTA");
  });

  test("domingo es no laborable por regla, sin estar en la lista de feriados", () => {
    expect(calendar.isDiaNoLaborable("2026-08-23")).toBe(true);
    expect(calendar.isSabado("2026-08-23")).toBe(false);
    expect(calendar.getSiguienteDiaHabil("2026-08-22")).toBe("2026-08-24");
  });

  test("feriado es no laborable y se salta al calcular el siguiente hábil", () => {
    expect(calendar.isDiaNoLaborable("2026-09-15")).toBe(true);
    expect(calendar.getSiguienteDiaHabil("2026-09-14")).toBe("2026-09-16");

    const vispera = instanteGT("2026-09-14T16:00:00");
    expect(calendar.getFechaOperacion(vispera)).toBe("2026-09-16");
  });
});
