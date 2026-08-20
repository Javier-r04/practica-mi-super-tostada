import { describe, expect, test } from "bun:test";
import { centavosSchema, formatearCentavos, redondearBancario } from "./money";

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

  test("rechaza floats: no enmascara corrupción de centavos", () => {
    expect(() => formatearCentavos(1250.4)).toThrow(/entero en centavos/);
    expect(() => formatearCentavos(1250.6)).toThrow(/entero en centavos/);
  });

  test("rechaza NaN", () => {
    expect(() => formatearCentavos(Number.NaN)).toThrow(/entero en centavos/);
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

describe("redondearBancario (half-even)", () => {
  test("empate .5 redondea al par más cercano", () => {
    expect(redondearBancario(2.5)).toBe(2);
    expect(redondearBancario(3.5)).toBe(4);
    expect(redondearBancario(12.5)).toBe(12);
    expect(redondearBancario(13.5)).toBe(14);
  });

  test("fuera del empate redondea al más cercano", () => {
    expect(redondearBancario(2.4)).toBe(2);
    expect(redondearBancario(2.6)).toBe(3);
  });

  test("negativos también usan half-even", () => {
    expect(redondearBancario(-2.5)).toBe(-2);
    expect(redondearBancario(-3.5)).toBe(-4);
  });
});
