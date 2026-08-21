import { describe, expect, test } from "bun:test";
import {
  aFechaIso,
  celdasMes,
  diaSemanaLunes0,
  diasEnMes,
  esFechaIso,
  mesAnterior,
  mesSiguiente,
} from "./fecha-ui";

describe("fecha-ui", () => {
  test("esFechaIso valida YYYY-MM-DD", () => {
    expect(esFechaIso("2026-08-20")).toBe(true);
    expect(esFechaIso("20/08/2026")).toBe(false);
  });

  test("agosto 2026 empieza en sábado (Lu=0 → offset 5)", () => {
    expect(diaSemanaLunes0("2026-08-01")).toBe(5);
    expect(diasEnMes(2026, 8)).toBe(31);
    const cells = celdasMes(2026, 8);
    expect(cells[5]).toBe("2026-08-01");
    expect(cells.filter(Boolean)).toHaveLength(31);
  });

  test("navegación de mes", () => {
    expect(mesAnterior(2026, 1)).toEqual({ y: 2025, m: 12 });
    expect(mesSiguiente(2026, 12)).toEqual({ y: 2027, m: 1 });
    expect(aFechaIso(2026, 8, 20)).toBe("2026-08-20");
  });
});
