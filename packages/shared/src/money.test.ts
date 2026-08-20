import { describe, expect, test } from "bun:test";
import { centavosSchema, formatearCentavos } from "./money";

describe("formatearCentavos", () => {
  test("formatea 1250 como Q 12.50", () => {
    expect(formatearCentavos(1250)).toBe("Q 12.50");
  });

  test("formatea miles con coma: 124050 → Q 1,240.50", () => {
    expect(formatearCentavos(124050)).toBe("Q 1,240.50");
  });

  test("siempre muestra dos decimales, incluido .00", () => {
    expect(formatearCentavos(0)).toBe("Q 0.00");
    expect(formatearCentavos(100)).toBe("Q 1.00");
  });

  test("negativos usan el signo menos tipográfico", () => {
    expect(formatearCentavos(-1250)).toBe("−Q 12.50");
  });

  test("simbolo false omite Q", () => {
    expect(formatearCentavos(1250, { simbolo: false })).toBe("12.50");
    expect(formatearCentavos(-1250, { simbolo: false })).toBe("−12.50");
  });

  test("redondea valores no enteros (no deberían llegar aquí)", () => {
    expect(formatearCentavos(1250.4)).toBe("Q 12.50");
    expect(formatearCentavos(1250.6)).toBe("Q 12.51");
  });

  test("trata NaN como cero", () => {
    expect(formatearCentavos(Number.NaN)).toBe("Q 0.00");
  });
});

describe("centavosSchema", () => {
  test("acepta enteros", () => {
    expect(centavosSchema.parse(1250)).toBe(1250);
    expect(centavosSchema.parse(0)).toBe(0);
    expect(centavosSchema.parse(-100)).toBe(-100);
  });

  test("rechaza decimales", () => {
    expect(centavosSchema.safeParse(12.5).success).toBe(false);
  });
});
