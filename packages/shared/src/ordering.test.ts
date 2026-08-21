import { describe, expect, test } from "bun:test";
import {
  anularPedidoRequestSchema,
  confirmarPedidoRequestSchema,
  crearPedidoManualRequestSchema,
  listarPedidosQuerySchema,
  pedidoSseEventSchema,
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

describe("listarPedidosQuerySchema", () => {
  test("acepta vacío y trata strings vacíos como ausentes", () => {
    expect(listarPedidosQuerySchema.parse({})).toEqual({});
    expect(
      listarPedidosQuerySchema.parse({
        fechaOperacion: "",
        clienteId: "",
        estado: "",
      }),
    ).toEqual({});
  });

  test("acepta fecha, cliente y estado; rechaza estado inventado", () => {
    const clienteId = "00000000-0000-4000-a000-000000000001";
    expect(
      listarPedidosQuerySchema.parse({
        fechaOperacion: "2026-08-21",
        clienteId,
        estado: "CONFIRMADO",
      }),
    ).toEqual({
      fechaOperacion: "2026-08-21",
      clienteId,
      estado: "CONFIRMADO",
    });
    expect(
      listarPedidosQuerySchema.parse({
        clienteId,
        historial: "1",
      }),
    ).toEqual({
      clienteId,
      historial: true,
    });
    expect(
      listarPedidosQuerySchema.safeParse({ estado: "CANCELADO" }).success,
    ).toBe(false);
  });
});

describe("crearPedidoManualRequestSchema", () => {
  const productoId = "00000000-0000-4000-a000-000000000010";
  const clienteId = "00000000-0000-4000-a000-000000000001";

  test("exige cliente e ítems; la nota es opcional", () => {
    expect(
      crearPedidoManualRequestSchema.parse({
        clienteId,
        items: [{ productoId, cantidad: 6 }],
        notasAdmin: "llevar con las tortillas de la mañana",
      }),
    ).toMatchObject({
      clienteId,
      notasAdmin: "llevar con las tortillas de la mañana",
    });
    expect(
      crearPedidoManualRequestSchema.safeParse({
        clienteId,
        items: [],
      }).success,
    ).toBe(false);
  });
});

describe("anularPedidoRequestSchema", () => {
  test("exige motivo no vacío; no admite 'cancelado' como contrato", () => {
    expect(anularPedidoRequestSchema.parse({ motivo: "  Cliente se equivocó  " })).toEqual({
      motivo: "Cliente se equivocó",
    });
    expect(anularPedidoRequestSchema.safeParse({ motivo: "   " }).success).toBe(
      false,
    );
  });
});

describe("pedidoSseEventSchema", () => {
  test("solo alta, edición y anulación", () => {
    const base = {
      pedidoId: "00000000-0000-4000-a000-000000000099",
      fechaOperacion: "2026-08-21",
    };
    expect(pedidoSseEventSchema.parse({ ...base, tipo: "pedido.creado" }).tipo).toBe(
      "pedido.creado",
    );
    expect(
      pedidoSseEventSchema.safeParse({ ...base, tipo: "heartbeat" }).success,
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
