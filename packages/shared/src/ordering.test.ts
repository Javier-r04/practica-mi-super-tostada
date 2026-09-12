import { describe, expect, test } from "bun:test";
import {
  anularPedidoRequestSchema,
  confirmarPedidoRequestSchema,
  crearPedidoManualRequestSchema,
  listarPedidosQuerySchema,
  pedidoSseEventSchema,
  portalHistorialSchema,
  portalPedidoDetalleClienteSchema,
  portalPedidoResumenSchema,
  portalProductoSchema,
  portalSesionSchema,
  textoConfirmacionPedido,
  totalPedidoCentavos,
} from "./ordering";
import { saludoPortalDe } from "./calendar";
import { DateTime } from "luxon";
import { ZONA_NEGOCIO } from "./calendar";

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
    expect(parsed.items).toEqual([
      { productoId, cantidad: 50, esDevolucion: false },
    ]);
  });

  test("acepta esDevolucion con bonoId opcional", () => {
    const bonoId = "00000000-0000-4000-a000-000000000099";
    const parsed = confirmarPedidoRequestSchema.parse({
      items: [
        { productoId, cantidad: 2, esDevolucion: true, bonoId },
        { productoId, cantidad: 10, esDevolucion: false },
      ],
    });
    expect(parsed.items[0]?.esDevolucion).toBe(true);
    expect(parsed.items[0]?.bonoId).toBe(bonoId);
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
      listarPedidosQuerySchema.parse({
        desde: "2026-08-01",
        hasta: "2026-08-20",
      }),
    ).toEqual({
      desde: "2026-08-01",
      hasta: "2026-08-20",
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
        fechaEntrega: "2026-08-21",
        totalCentavos: 74500,
        horarioEntregaFijo: "08:30",
      }),
    ).toBe(
      "Recibimos su pedido 1042 para el Viernes 21 de agosto. Total Q 745.00. Entrega a las 08:30.",
    );
  });
});

const PRODUCTO_ID = "00000000-0000-4000-a000-000000000010";
const PEDIDO_ID = "00000000-0000-4000-a000-000000000020";
const ASSET_ID = "00000000-0000-4000-a000-000000000030";
const CLIENTE_ID = "00000000-0000-4000-a000-000000000001";

describe("portalProductoSchema", () => {
  const base = {
    productoId: PRODUCTO_ID,
    alias: "tortilla grande",
    nombreCanonico: "Tortillas #16",
    unidadMedida: "LIBRA" as const,
    precioCentavos: 1250,
    favorito: true,
    familia: "TORTILLA" as const,
    orden: 1,
    pedible: true,
  };

  test("exige fotoAssetId (uuid o null)", () => {
    expect(portalProductoSchema.safeParse(base).success).toBe(false);
    expect(
      portalProductoSchema.parse({ ...base, fotoAssetId: null }),
    ).toMatchObject({ fotoAssetId: null });
    expect(
      portalProductoSchema.parse({ ...base, fotoAssetId: ASSET_ID }),
    ).toMatchObject({ fotoAssetId: ASSET_ID });
  });
});

describe("portalSesionSchema", () => {
  const sesionBase = {
    cliente: {
      id: CLIENTE_ID,
      nombre: "Tabasco",
      horarioEntregaFijo: "08:30",
    },
    ventana: {
      abierta: true,
      fechaOperacion: "2026-08-21",
      fechaEntrega: "2026-08-22",
      diaEstado: "SIN_CIERRE",
      cierraAt: "2026-08-21T00:00:00.000-06:00",
      proximaAperturaAt: "2026-08-21T15:00:00.000-06:00",
      horarioEntregaFijo: "08:30",
    },
    catalogo: [],
    pedidoAbierto: null,
    cuenta: {
      facturasPendientes: 0,
      limiteFacturasPendientes: null,
      saldoCentavos: 0,
      facturas: [],
      abonos: [],
      transferenciasEnRevisionCentavos: 0,
    },
  };

  test("exige ahoraIso, saludo y ultimoPedido", () => {
    expect(portalSesionSchema.safeParse(sesionBase).success).toBe(false);
    const ok = portalSesionSchema.parse({
      ...sesionBase,
      ahoraIso: "2026-08-20T16:00:00.000-06:00",
      saludo: "tardes",
      ultimoPedido: null,
    });
    expect(ok.saludo).toBe("tardes");
    expect(ok.ultimoPedido).toBeNull();
    expect(ok.ventana.diaEstado).toBe("SIN_CIERRE");
  });

  test("rechaza una sesión sin diaEstado: el portal no puede omitir el bit del navbar", () => {
    const { diaEstado: _omitido, ...sinEstado } = sesionBase.ventana;
    expect(
      portalSesionSchema.safeParse({
        ...sesionBase,
        ahoraIso: "2026-08-20T16:00:00.000-06:00",
        saludo: "tardes",
        ultimoPedido: null,
        ventana: sinEstado,
      }).success,
    ).toBe(false);
  });
});

describe("portalPedidoResumenSchema / historial / detalle", () => {
  const resumen = {
    id: PEDIDO_ID,
    correlativo: 42,
    fechaOperacion: "2026-08-21",
    fechaEntrega: "2026-08-22",
    estado: "CONFIRMADO" as const,
    totalCentavos: 12500,
    origen: "PORTAL" as const,
  };

  test("resumen acepta MANUAL y ANULADO", () => {
    expect(portalPedidoResumenSchema.parse(resumen).origen).toBe("PORTAL");
    expect(
      portalPedidoResumenSchema.parse({
        ...resumen,
        origen: "MANUAL",
        estado: "ANULADO",
      }),
    ).toMatchObject({ origen: "MANUAL", estado: "ANULADO" });
  });

  test("historial pagina con nextOffset nullable", () => {
    expect(
      portalHistorialSchema.parse({ items: [resumen], nextOffset: 20 }),
    ).toEqual({ items: [resumen], nextOffset: 20 });
    expect(
      portalHistorialSchema.parse({ items: [], nextOffset: null }),
    ).toEqual({ items: [], nextOffset: null });
  });

  test("detalle de cliente no exige textoConfirmacion", () => {
    const detalle = portalPedidoDetalleClienteSchema.parse({
      ...resumen,
      items: [
        {
          productoId: PRODUCTO_ID,
          cantidad: 10,
          nombreMostrado: "tortilla grande",
          unidadMedida: "LIBRA",
          precioUnitarioCentavos: 1250,
          subtotalCentavos: 12500,
          fotoAssetId: null,
        },
      ],
      factura: null,
    });
    expect(detalle).not.toHaveProperty("textoConfirmacion");
    expect(detalle.items[0]?.fotoAssetId).toBeNull();
  });
});

describe("saludoPortalDe", () => {
  test("antes de las 18:00 GT es tardes; desde las 18:00 es noches", () => {
    const tarde = DateTime.fromISO("2026-08-20T17:59:00", {
      zone: ZONA_NEGOCIO,
    }).toJSDate();
    const noche = DateTime.fromISO("2026-08-20T18:00:00", {
      zone: ZONA_NEGOCIO,
    }).toJSDate();
    expect(saludoPortalDe(tarde)).toBe("tardes");
    expect(saludoPortalDe(noche)).toBe("noches");
  });
});