import { describe, expect, test } from "bun:test";
import {
  INTERVALO_VENTANA_BUFFER_MS,
  INTERVALO_VENTANA_MAX_MS,
  INTERVALO_VENTANA_MIN_MS,
  intervaloRefetchVentana,
} from "./ventana-refetch";

const LUNES_10 = Date.parse("2026-08-24T10:00:00.000-06:00");
const LUNES_15 = "2026-08-24T15:00:00.000-06:00";
const MARTES_03 = "2026-08-25T03:00:00.000-06:00";

describe("intervaloRefetchVentana", () => {
  test("sin instantes (día reabierto a mano, reloj todavía cerrado) sondea cada minuto", () => {
    expect(
      intervaloRefetchVentana({
        cierraAt: null,
        proximaAperturaAt: null,
        now: LUNES_10,
      }),
    ).toBe(INTERVALO_VENTANA_MAX_MS);
  });

  test("ventana cerrada a las 10:00: no espera a las 15:00 de un tirón, sondea cada minuto", () => {
    // El portal abierto a las 10:00 tiene proximaAperturaAt = 15:00. Si
    // programara un único timeout de cinco horas, una pestaña en segundo
    // plano o un sleep lo perdería. El tope de un minuto es el mismo que
    // ya usa el navbar.
    expect(
      intervaloRefetchVentana({
        proximaAperturaAt: LUNES_15,
        now: LUNES_10,
      }),
    ).toBe(INTERVALO_VENTANA_MAX_MS);
  });

  test("en el último minuto antes de las 15:00 apunta al instante exacto", () => {
    const ahora = Date.parse("2026-08-24T14:59:20.000-06:00");
    const delay = intervaloRefetchVentana({
      proximaAperturaAt: LUNES_15,
      now: ahora,
    });
    expect(delay).toBe(40_000 + INTERVALO_VENTANA_BUFFER_MS);
  });

  test("a las 15:00 en punto espera el colchón, no el minuto completo", () => {
    // El colchón deja que el reloj del servidor cruce el umbral antes del GET.
    expect(
      intervaloRefetchVentana({
        proximaAperturaAt: LUNES_15,
        now: Date.parse(LUNES_15),
      }),
    ).toBe(INTERVALO_VENTANA_BUFFER_MS);
  });

  test("si el instante ya pasó de largo refresca en el mínimo, no espera un minuto", () => {
    expect(
      intervaloRefetchVentana({
        proximaAperturaAt: LUNES_15,
        now: Date.parse(LUNES_15) + 5_000,
      }),
    ).toBe(INTERVALO_VENTANA_MIN_MS);
  });

  test("ventana abierta: en el último minuto antes del cierre apunta al instante", () => {
    const ahora = Date.parse("2026-08-25T02:59:50.000-06:00");
    expect(
      intervaloRefetchVentana({
        cierraAt: MARTES_03,
        now: ahora,
      }),
    ).toBe(10_000 + INTERVALO_VENTANA_BUFFER_MS);
  });

  test("el cierre más cercano gana si hay los dos instantes", () => {
    const ahora = Date.parse("2026-08-24T14:59:50.000-06:00");
    expect(
      intervaloRefetchVentana({
        cierraAt: MARTES_03,
        proximaAperturaAt: LUNES_15,
        now: ahora,
      }),
    ).toBe(10_000 + INTERVALO_VENTANA_BUFFER_MS);
  });

  test("instante inválido no tumba el sondeo", () => {
    expect(
      intervaloRefetchVentana({
        proximaAperturaAt: "no-es-una-fecha",
        now: LUNES_10,
      }),
    ).toBe(INTERVALO_VENTANA_MAX_MS);
  });
});
