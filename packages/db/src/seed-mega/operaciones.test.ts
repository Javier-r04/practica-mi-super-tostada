import { describe, expect, test } from "bun:test";
import { DateTime } from "luxon";
import {
  createBusinessCalendar,
  ZONA_NEGOCIO,
} from "@misupertostada/shared";
import { resolverOperacionesMegaSeed } from "./operaciones";

function instanteGT(isoLocal: string): Date {
  const dt = DateTime.fromISO(isoLocal, { zone: ZONA_NEGOCIO });
  if (!dt.isValid) throw new Error(`instante inválido: ${isoLocal}`);
  return dt.toJSDate();
}

const cal = createBusinessCalendar({
  diasNoLaborables: [],
  ventanasPorDia: {
    1: { aperturaMinutos: 15 * 60, cierreMinutos: 3 * 60, cruzaMedianoche: true },
    2: { aperturaMinutos: 15 * 60, cierreMinutos: 3 * 60, cruzaMedianoche: true },
    3: { aperturaMinutos: 15 * 60, cierreMinutos: 3 * 60, cruzaMedianoche: true },
    4: { aperturaMinutos: 15 * 60, cierreMinutos: 3 * 60, cruzaMedianoche: true },
    5: { aperturaMinutos: 15 * 60, cierreMinutos: 3 * 60, cruzaMedianoche: true },
    6: { aperturaMinutos: 15 * 60, cierreMinutos: 3 * 60, cruzaMedianoche: true },
    7: null,
  },
});

describe("resolverOperacionesMegaSeed", () => {
  test("martes 18:30: captura abierta, en curso cerrado ayer", () => {
    const now = instanteGT("2026-08-18T18:30:00");
    const ops = resolverOperacionesMegaSeed(cal, now);

    expect(ops.ventanaAbierta).toBe(true);
    expect(ops.fechaCaptura).toBe("2026-08-18");
    expect(ops.fechaEnCurso).toBe("2026-08-17");
    expect(ops.mismaOperacion).toBe(false);
    expect(ops.diasCaptura).toEqual(["2026-08-18"]);
    expect(ops.diasProduccionCerrados).toEqual(["2026-08-17"]);
  });

  test("martes 02:00: misma operación en captura y reparto, sin cierre", () => {
    const now = instanteGT("2026-08-18T02:00:00");
    const ops = resolverOperacionesMegaSeed(cal, now);

    expect(ops.ventanaAbierta).toBe(true);
    expect(ops.fechaCaptura).toBe("2026-08-17");
    expect(ops.fechaEnCurso).toBe("2026-08-17");
    expect(ops.mismaOperacion).toBe(true);
    expect(ops.diasCaptura).toEqual(["2026-08-17"]);
    expect(ops.diasProduccionCerrados).toEqual([]);
  });

  test("martes 10:00: ventana cerrada, solo en curso", () => {
    const now = instanteGT("2026-08-18T10:00:00");
    const ops = resolverOperacionesMegaSeed(cal, now);

    expect(ops.ventanaAbierta).toBe(false);
    expect(ops.fechaCaptura).toBe("2026-08-18");
    expect(ops.fechaEnCurso).toBe("2026-08-17");
    expect(ops.diasCaptura).toEqual([]);
    expect(ops.diasProduccionCerrados).toEqual(["2026-08-17"]);
  });
});
