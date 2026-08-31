import { describe, expect, test } from "bun:test";
import {
  ANTIGUEDAD_VENCIDA_DIAS,
  aplicarFifo,
  carteraQuerySchema,
  entregarPedidoRequestSchema,
  estadoFactura,
  montoFacturaCentavos,
  registrarPagoRequestSchema,
  rutaParadaSchema,
  rutaRepartoSchema,
} from "./receivables";

describe("carteraQuerySchema", () => {
  test("acepta paginación y búsqueda desde query string", () => {
    const parsed = carteraQuerySchema.parse({
      estado: "pendientes",
      q: "Tabascos",
      sinDte: "1",
      limit: "40",
      offset: "80",
    });
    expect(parsed.estado).toBe("pendientes");
    expect(parsed.q).toBe("Tabascos");
    expect(parsed.sinDte).toBe("1");
    expect(parsed.limit).toBe(40);
    expect(parsed.offset).toBe(80);
  });

  test("vacíos → undefined", () => {
    const parsed = carteraQuerySchema.parse({
      estado: "",
      q: "",
      limit: "",
      offset: "",
    });
    expect(parsed.estado).toBeUndefined();
    expect(parsed.q).toBeUndefined();
    expect(parsed.limit).toBeUndefined();
    expect(parsed.offset).toBeUndefined();
  });
});

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

describe("entregarPedidoRequestSchema", () => {
  test("E8 exige idempotencyKey; sin ella el retry duplicaría factura", () => {
    expect(
      entregarPedidoRequestSchema.safeParse({
        pedidoId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
      }).success,
    ).toBe(false);
    expect(
      entregarPedidoRequestSchema.safeParse({
        pedidoId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        idempotencyKey: "entrega-tony-01",
      }).success,
    ).toBe(true);
  });
});

describe("registrarPagoRequestSchema", () => {
  const base = {
    id: "11111111-1111-1111-1111-111111111111",
    idempotencyKey: "pago-tony-001",
    montoCentavos: 1000,
    metodo: "EFECTIVO" as const,
  };

  test("exige clienteId y transferencia con comprobante", () => {
    expect(registrarPagoRequestSchema.safeParse(base).success).toBe(false);
    expect(
      registrarPagoRequestSchema.safeParse({
        ...base,
        clienteId: "33333333-3333-3333-3333-333333333333",
      }).success,
    ).toBe(true);
    expect(
      registrarPagoRequestSchema.safeParse({
        ...base,
        clienteId: "33333333-3333-3333-3333-333333333333",
        metodo: "TRANSFERENCIA",
      }).success,
    ).toBe(false);
    expect(
      registrarPagoRequestSchema.safeParse({
        ...base,
        clienteId: "33333333-3333-3333-3333-333333333333",
        metodo: "TRANSFERENCIA",
        comprobanteAssetId: "44444444-4444-4444-4444-444444444444",
      }).success,
    ).toBe(true);
  });
});

describe("rutaRepartoSchema", () => {
  const paradaBase = {
    pedidoId: "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa",
    correlativo: 12,
    clienteId: "bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb",
    clienteNombre: "Tabascos",
    horarioEntregaFijo: "07:30",
    telefonoWa: null,
    estado: "EN_PRODUCCION" as const,
    totalEstimadoCentavos: 22500,
    saldoAnteriorCentavos: 0,
    facturasPendientes: 0,
    items: [
      {
        productoId: "cccccccc-cccc-4ccc-cccc-cccccccccccc",
        nombreMostrado: "Tortillas #16",
        unidadMedida: "LIBRA" as const,
        cantidadPedida: 50,
        cantidadEntregada: 50,
        precioUnitarioCentavos: 450,
        notaProduccion: null,
      },
    ],
    factura: null,
  };

  test("acepta foto, notas y cobradoHoy; ítem con fotoAssetId", () => {
    const parsed = rutaRepartoSchema.parse({
      fechaOperacion: "2026-08-21",
      cobradoHoyCentavos: 15000,
      paradas: [
        {
          ...paradaBase,
          fotoAssetId: "dddddddd-dddd-4ddd-dddd-dddddddddddd",
          notasPermanentes: "grosor especial",
          items: [
            {
              ...paradaBase.items[0]!,
              fotoAssetId: "eeeeeeee-eeee-4eee-eeee-eeeeeeeeeeee",
            },
          ],
        },
      ],
    });
    expect(parsed.cobradoHoyCentavos).toBe(15000);
    expect(parsed.paradas[0]!.fotoAssetId).toBe(
      "dddddddd-dddd-4ddd-dddd-dddddddddddd",
    );
    expect(parsed.paradas[0]!.notasPermanentes).toBe("grosor especial");
    expect(parsed.paradas[0]!.items[0]!.fotoAssetId).toBe(
      "eeeeeeee-eeee-4eee-eeee-eeeeeeeeeeee",
    );
  });

  test("snapshot IndexedDB viejo sin foto/cobradoHoy sigue parseando", () => {
    const parsed = rutaRepartoSchema.parse({
      fechaOperacion: "2026-08-20",
      paradas: [paradaBase],
    });
    expect(parsed.cobradoHoyCentavos).toBe(0);
    expect(parsed.paradas[0]!.fotoAssetId).toBeNull();
    expect(parsed.paradas[0]!.notasPermanentes).toBeNull();
    expect(parsed.paradas[0]!.items[0]!.fotoAssetId).toBeNull();
  });

  test("rutaParadaSchema exige correlativo positivo", () => {
    expect(
      rutaParadaSchema.safeParse({ ...paradaBase, correlativo: 0 }).success,
    ).toBe(false);
  });
});
