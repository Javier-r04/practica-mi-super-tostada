import { describe, expect, test } from "bun:test";
import { avisoReabierto, type ReaperturaUi } from "./reabierto-vista";

const LIMPIO: ReaperturaUi = {
  fechaOperacionCaptura: "2026-08-24",
  fechaOperacionEnCurso: "2026-08-22",
  diaEstado: "SIN_CIERRE",
  diaEstadoEnCurso: "CERRADO",
};

describe("avisoReabierto", () => {
  test("sin reaperturas no rotula nada", () => {
    expect(avisoReabierto(LIMPIO)).toBeNull();
    expect(avisoReabierto(undefined)).toBeNull();
  });

  // El caso real: el sábado 22 se reabrió a mano y nadie lo cerró. El lunes 24
  // producción y reparto salían en blanco sin ninguna explicación.
  test("la operación en curso reabierta bloquea y nombra su fecha", () => {
    const aviso = avisoReabierto({
      ...LIMPIO,
      diaEstadoEnCurso: "REABIERTO",
    });
    expect(aviso?.fechaOperacion).toBe("2026-08-22");
    expect(aviso?.bloqueaOperacion).toBe(true);
    expect(aviso?.chip).toContain("Sá 22 ago");
    expect(aviso?.detalle).toContain("hoja de producción");
  });

  test("la de captura reabierta avisa pero no bloquea", () => {
    const aviso = avisoReabierto({ ...LIMPIO, diaEstado: "REABIERTO" });
    expect(aviso?.fechaOperacion).toBe("2026-08-24");
    expect(aviso?.bloqueaOperacion).toBe(false);
  });

  test("con las dos reabiertas gana la que tiene el reparto detenido", () => {
    const aviso = avisoReabierto({
      ...LIMPIO,
      diaEstado: "REABIERTO",
      diaEstadoEnCurso: "REABIERTO",
    });
    expect(aviso?.fechaOperacion).toBe("2026-08-22");
    expect(aviso?.bloqueaOperacion).toBe(true);
  });
});
