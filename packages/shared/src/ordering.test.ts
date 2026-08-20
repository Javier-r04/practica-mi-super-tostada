import { describe, expect, test } from "bun:test";
import {
  confirmarPedidoRequestSchema,
  textoConfirmacionPedido,
  totalPedidoCentavos,
} from "./ordering";

describe("totalPedidoCentavos", () => {
  test("50 × 1250 + 8 × 1500 = 74500, solo enteros", () => {
    expect(
      totalPedidoCentavos([
        { cantidad: 50, precioUnitarioCentavos: 1250 },
        { cantidad: 8, precioUnitarioCentavos: 1500 },
      ]),
    ).toBe(74500);
  });

  test("rechaza floats: el total no puede nacer de un decimal", () => {
    expect(() =>
      totalPedidoCentavos([
        { cantidad: 50.5, precioUnitarioCentavos: 1250 },
      ]),
    ).toThrow(/enteros/);
    expect(() =>
      totalPedidoCentavos([
        { cantidad: 50, precioUnitarioCentavos: 12.5 },
      ]),
    ).toThrow(/enteros/);
  });
});

describe("confirmarPedidoRequestSchema", () => {
  const productoId = "00000000-0000-4000-a000-000000000010";

  test("acepta productoId + cantidad entera ≥ 1 e ignora un precio colado", () => {
    const parsed = confirmarPedidoRequestSchema.parse({
      items: [{ productoId, cantidad: 50, precioCentavos: 1 }],
    });
    expect(parsed.items).toEqual([{ productoId, cantidad: 50 }]);
  });

  test("rechaza cantidad 0, float y lista vacía", () => {
    expect(
      confirmarPedidoRequestSchema.safeParse({
        items: [{ productoId, cantidad: 0 }],
      }).success,
    ).toBe(false);
    expect(
      confirmarPedidoRequestSchema.safeParse({
        items: [{ productoId, cantidad: 1.5 }],
      }).success,
    ).toBe(false);
    expect(
      confirmarPedidoRequestSchema.safeParse({ items: [] }).success,
    ).toBe(false);
  });
});

describe("textoConfirmacionPedido", () => {
  test("plantilla determinista con correlativo, fecha y total en quetzales", () => {
    expect(
      textoConfirmacionPedido({
        correlativo: 1042,
        fechaOperacion: "2026-08-21",
        totalCentavos: 74500,
        horarioEntregaFijo: "08:30",
      }),
    ).toBe(
      "Recibimos su pedido 1042 para el Viernes 21 de agosto. Total Q 745.00. Entrega a las 08:30.",
    );
  });
});
