import { describe, expect, test } from "bun:test";
import { WEEKDAYS_ISO, type VentanaDiaDto } from "@misupertostada/shared";
import {
  errorVentanaSemanal,
  etiquetaFilaVentana,
  haySolapeUi,
} from "./ventana-semanal-vista";

function semana(parcial: Partial<Record<number, Partial<VentanaDiaDto>>>): VentanaDiaDto[] {
  return WEEKDAYS_ISO.map((weekday) => ({
    weekday,
    activa: weekday !== 7,
    apertura: "15:00",
    cierre: "00:00",
    cruzaMedianoche: true,
    ...parcial[weekday],
  }));
}

describe("ventana-semanal-vista", () => {
  test("copy: viernes abre 15:00 y cierra el sábado a las 00:00", () => {
    const viernes = semana({})[4]!;
    expect(etiquetaFilaVentana(viernes)).toBe(
      "Viernes abre 15:00 · cierra el sábado a las 00:00",
    );
  });

  test("viernes → sábado 06:00", () => {
    const dias = semana({
      5: { cierre: "06:00", cruzaMedianoche: true },
    });
    expect(etiquetaFilaVentana(dias[4]!)).toBe(
      "Viernes abre 15:00 · cierra el sábado a las 06:00",
    );
  });

  test("domingo inactivo", () => {
    expect(etiquetaFilaVentana(semana({})[6]!)).toBe("Domingo · inactivo");
  });

  test("solape lun/mar lo rechaza el schema, no un cálculo suelto de UI", () => {
    const dias = semana({
      1: { cierre: "06:00", cruzaMedianoche: true },
      2: { apertura: "05:00", cierre: "14:00", cruzaMedianoche: false },
    });
    expect(haySolapeUi(dias)).toBe(true);
    expect(errorVentanaSemanal(dias)).toMatch(/solap/i);
  });

  test("lun–sáb 15:00–00:00 es válido", () => {
    expect(errorVentanaSemanal(semana({}))).toBeNull();
  });
});
