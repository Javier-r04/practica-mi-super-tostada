import { describe, expect, test } from "bun:test";
import { ESTADO_PRESENTACION, ESTADOS, type Estado } from "./estados";

describe("ESTADOS", () => {
  test("cubre pedido, cobranza, cola y puntos de carga", () => {
    expect(ESTADOS).toEqual([
      "BORRADOR",
      "CONFIRMADO",
      "EN_PRODUCCION",
      "ENTREGADO",
      "ANULADO",
      "PAGADO",
      "PENDIENTE",
      "ABONO_PARCIAL",
      "VENCIDO",
      "SIN_SINCRONIZAR",
      "PLANTA",
      "DEMOCRACIA",
    ]);
  });

  test("cada estado tiene label y tokens --estado-* o --carga-*", () => {
    for (const estado of ESTADOS) {
      const presentacion = ESTADO_PRESENTACION[estado];
      expect(presentacion.label.length).toBeGreaterThan(0);
      expect(presentacion.bg.startsWith("var(--")).toBe(true);
      expect(presentacion.fg.startsWith("var(--")).toBe(true);
    }
  });

  test("ABONO_PARCIAL y PENDIENTE comparten tokens de pendiente", () => {
    expect(ESTADO_PRESENTACION.ABONO_PARCIAL.bg).toBe(
      ESTADO_PRESENTACION.PENDIENTE.bg,
    );
    expect(ESTADO_PRESENTACION.ABONO_PARCIAL.fg).toBe(
      ESTADO_PRESENTACION.PENDIENTE.fg,
    );
  });

  test("puntos de carga no reutilizan tokens de estado de pedido", () => {
    expect(ESTADO_PRESENTACION.PLANTA.bg).toContain("--carga-");
    expect(ESTADO_PRESENTACION.DEMOCRACIA.bg).toContain("--carga-");
  });

  test("el mapa cubre exactamente el union Estado", () => {
    const keys = Object.keys(ESTADO_PRESENTACION) as Estado[];
    expect(keys.sort()).toEqual([...ESTADOS].sort());
  });
});
