import { describe, expect, test } from "bun:test";
import {
  ANTIGUEDAD_VENCIDA_DIAS,
  aplicarFifo,
  estadoFactura,
  montoFacturaCentavos,
  registrarPagoRequestSchema,
} from "./receivables";

describe("estadoFactura", () => {
  test("abonado cubre el monto ⇒ Pagado, nunca un booleano guardado", () => {
    expect(
      estadoFactura({ montoCentavos: 10000, abonadoCentavos: 10000, antiguedadDias: 0 }),
    ).toBe("PAGADO");
    expect(
      estadoFactura({ montoCentavos: 10000, abonadoCentavos: 10001, antiguedadDias: 40 }),
    ).toBe("PAGADO");
  });

  test("factura de cero nace Pagada (suma 0 >= 0)", () => {
    expect(
      estadoFactura({ montoCentavos: 0, abonadoCentavos: 0, antiguedadDias: 20 }),
    ).toBe("PAGADO");
  });

  test("abono parcial deja saldo", () => {
    expect(
      estadoFactura({ montoCentavos: 10000, abonadoCentavos: 3000, antiguedadDias: 2 }),
    ).toBe("ABONO_PARCIAL");
  });

  test("sin abono y con saldo ⇒ Pendiente", () => {
    expect(
      estadoFactura({ montoCentavos: 10000, abonadoCentavos: 0, antiguedadDias: 0 }),
    ).toBe("PENDIENTE");
  });

  test("vencido a los 15 días con saldo; a los 14 no", () => {
    expect(
      estadoFactura({
        montoCentavos: 10000,
        abonadoCentavos: 0,
        antiguedadDias: ANTIGUEDAD_VENCIDA_DIAS,
      }),
    ).toBe("VENCIDO");
    expect(
      estadoFactura({
        montoCentavos: 10000,
        abonadoCentavos: 1000,
        antiguedadDias: ANTIGUEDAD_VENCIDA_DIAS,
      }),
    ).toBe("VENCIDO");
    expect(
      estadoFactura({
        montoCentavos: 10000,
        abonadoCentavos: 0,
        antiguedadDias: ANTIGUEDAD_VENCIDA_DIAS - 1,
      }),
    ).toBe("PENDIENTE");
  });

  test("rechaza floats: no enmascara centavos", () => {
    expect(() =>
      estadoFactura({
        montoCentavos: 10000.5,
        abonadoCentavos: 0,
        antiguedadDias: 0,
      }),
    ).toThrow(/enteros/);
  });
});

describe("montoFacturaCentavos", () => {
  test("50 lb a Q4.50 snapshot (450) = 22500; 40 lb = 18000", () => {
    expect(
      montoFacturaCentavos([
        { cantidadEntregada: 50, precioUnitarioCentavos: 450 },
      ]),
    ).toBe(22500);
    expect(
      montoFacturaCentavos([
        { cantidadEntregada: 40, precioUnitarioCentavos: 450 },
      ]),
    ).toBe(18000);
  });

  test("cero entregado en todas las líneas = 0", () => {
    expect(
      montoFacturaCentavos([
        { cantidadEntregada: 0, precioUnitarioCentavos: 1250 },
        { cantidadEntregada: 0, precioUnitarioCentavos: 1500 },
      ]),
    ).toBe(0);
  });

  test("producto de enteros, sin redondeo bancario", () => {
    expect(
      montoFacturaCentavos([
        { cantidadEntregada: 3, precioUnitarioCentavos: 1250 },
        { cantidadEntregada: 2, precioUnitarioCentavos: 1500 },
      ]),
    ).toBe(6750);
  });
});

describe("aplicarFifo", () => {
  test("parte 15000 en 10000 + 5000 sobre dos facturas", () => {
    const r = aplicarFifo(
      [
        { id: "a", saldoCentavos: 10000 },
        { id: "b", saldoCentavos: 5000 },
      ],
      15000,
    );
    expect(r.sobra).toBe(0);
    expect(r.asignaciones).toEqual([
      { facturaId: "a", montoCentavos: 10000 },
      { facturaId: "b", montoCentavos: 5000 },
    ]);
  });

  test("12000 sobre 10000 y 5000: primera Pagada, segunda abono 2000", () => {
    const r = aplicarFifo(
      [
        { id: "vieja", saldoCentavos: 10000 },
        { id: "nueva", saldoCentavos: 5000 },
      ],
      12000,
    );
    expect(r.sobra).toBe(0);
    expect(r.asignaciones).toEqual([
      { facturaId: "vieja", montoCentavos: 10000 },
      { facturaId: "nueva", montoCentavos: 2000 },
    ]);
  });

  test("sobra cuando el monto excede el saldo (el caller responde 409)", () => {
    const r = aplicarFifo([{ id: "a", saldoCentavos: 10000 }], 10001);
    expect(r.sobra).toBe(1);
    expect(r.asignaciones).toEqual([{ facturaId: "a", montoCentavos: 10000 }]);
  });

  test("sin facturas pendientes todo el monto sobra", () => {
    const r = aplicarFifo([], 5000);
    expect(r.asignaciones).toEqual([]);
    expect(r.sobra).toBe(5000);
  });
});

describe("registrarPagoRequestSchema", () => {
  const base = {
    id: "11111111-1111-1111-1111-111111111111",
    idempotencyKey: "pago-tony-001",
    montoCentavos: 1000,
    metodo: "EFECTIVO" as const,
  };

  test("exige exactamente uno de factura o cliente", () => {
    expect(registrarPagoRequestSchema.safeParse(base).success).toBe(false);
    expect(
      registrarPagoRequestSchema.safeParse({
        ...base,
        facturaId: "22222222-2222-2222-2222-222222222222",
        clienteId: "33333333-3333-3333-3333-333333333333",
      }).success,
    ).toBe(false);
    expect(
      registrarPagoRequestSchema.safeParse({
        ...base,
        facturaId: "22222222-2222-2222-2222-222222222222",
      }).success,
    ).toBe(true);
  });
});
