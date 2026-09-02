import { describe, expect, test } from "bun:test";
import type { RutaParada } from "@misupertostada/shared";
import {
  desgloseCobroParada,
  saldoParadaCentavos,
  siguienteTrasCobro,
  siguienteTrasEntrega,
  siguienteTrasVolver,
  vistaInicialParada,
  paradaConColaLocal,
  cobradoPendienteColaCentavos,
} from "./reparto-vista";

describe("vistaInicialParada", () => {
  test("pendiente de entrega abre entrega aunque haya saldo", () => {
    expect(
      vistaInicialParada({
        estado: "EN_PRODUCCION",
        saldoCentavos: 5000,
        entregaLocal: false,
      }),
    ).toBe("entrega");
  });

  test("ya entregado con saldo abre cobro", () => {
    expect(
      vistaInicialParada({
        estado: "ENTREGADO",
        saldoCentavos: 1000,
        entregaLocal: false,
      }),
    ).toBe("cobro");
  });

  test("entrega en cola local con saldo abre cobro", () => {
    expect(
      vistaInicialParada({
        estado: "EN_PRODUCCION",
        saldoCentavos: 1000,
        entregaLocal: true,
      }),
    ).toBe("cobro");
  });

  test("entregado con saldo 0 abre entrega (solo lectura)", () => {
    expect(
      vistaInicialParada({
        estado: "ENTREGADO",
        saldoCentavos: 0,
        entregaLocal: false,
      }),
    ).toBe("entrega");
  });
});

describe("siguienteTrasEntrega", () => {
  test("saldo > 0 → cobro", () => {
    expect(siguienteTrasEntrega(1)).toBe("cobro");
  });

  test("saldo 0 → ruta", () => {
    expect(siguienteTrasEntrega(0)).toBe("ruta");
  });
});

describe("siguienteTrasCobro", () => {
  test("siempre vuelve a ruta", () => {
    expect(siguienteTrasCobro()).toBe("ruta");
  });
});

describe("siguienteTrasVolver", () => {
  test("cobro sin entregar → entrega", () => {
    expect(
      siguienteTrasVolver({ vista: "cobro", yaEntregado: false }),
    ).toBe("entrega");
  });

  test("cobro ya entregado → ruta", () => {
    expect(
      siguienteTrasVolver({ vista: "cobro", yaEntregado: true }),
    ).toBe("ruta");
  });

  test("entrega → ruta", () => {
    expect(
      siguienteTrasVolver({ vista: "entrega", yaEntregado: false }),
    ).toBe("ruta");
  });
});

describe("saldoParadaCentavos", () => {
  test("suma anterior + factura del día", () => {
    expect(
      saldoParadaCentavos({
        saldoAnteriorCentavos: 2000,
        facturaSaldoCentavos: 500,
      }),
    ).toBe(2500);
    expect(
      saldoParadaCentavos({
        saldoAnteriorCentavos: 1000,
        facturaSaldoCentavos: null,
      }),
    ).toBe(1000);
  });
});

describe("desgloseCobroParada", () => {
  const facturaParcial = {
    id: "00000000-0000-4000-8000-000000000001",
    pedidoId: "00000000-0000-4000-8000-000000000002",
    numeroDte: null,
    montoCentavos: 5000,
    abonadoCentavos: 200,
    saldoCentavos: 4800,
    emitidaAt: null,
    antiguedadDias: 0,
    estado: "ABONO_PARCIAL" as const,
  };

  test("abono parcial de hoy activa banner y desglose", () => {
    const d = desgloseCobroParada({
      saldoAnteriorCentavos: 0,
      factura: facturaParcial,
    });
    expect(d.mostrarBannerCobrar).toBe(true);
    expect(d.mostrarDesgloseHoy).toBe(true);
    expect(d.saldoTotalCentavos).toBe(4800);
    expect(d.estadoFactura).toBe("ABONO_PARCIAL");
  });

  test("suma saldo anterior con factura del día", () => {
    const d = desgloseCobroParada({
      saldoAnteriorCentavos: 1000,
      factura: facturaParcial,
    });
    expect(d.saldoTotalCentavos).toBe(5800);
    expect(d.mostrarBannerCobrar).toBe(true);
  });

  test("factura pagada no muestra banner", () => {
    const d = desgloseCobroParada({
      saldoAnteriorCentavos: 0,
      factura: {
        ...facturaParcial,
        abonadoCentavos: 5000,
        saldoCentavos: 0,
        estado: "PAGADO",
      },
    });
    expect(d.mostrarBannerCobrar).toBe(false);
    expect(d.estadoFactura).toBe("PAGADO");
  });

  test("sin factura solo alerta saldo anterior", () => {
    const d = desgloseCobroParada({
      saldoAnteriorCentavos: 3000,
      factura: null,
    });
    expect(d.mostrarDesgloseHoy).toBe(false);
    expect(d.saldoTotalCentavos).toBe(3000);
  });
});

describe("paradaConColaLocal", () => {
  const paradaBase: RutaParada = {
    pedidoId: "00000000-0000-4000-8000-000000000010",
    correlativo: 42,
    clienteId: "00000000-0000-4000-8000-000000000020",
    clienteNombre: "Tabascos",
    horarioEntregaFijo: "08:00",
    telefonoWa: null,
    fotoAssetId: null,
    notasPermanentes: null,
    estado: "ENTREGADO",
    totalEstimadoCentavos: 5000,
    saldoAnteriorCentavos: 0,
    facturasPendientes: 0,
    items: [
      {
        productoId: "00000000-0000-4000-8000-000000000030",
        nombreMostrado: "Tortilla",
        unidadMedida: "LIBRA",
        cantidadPedida: 10,
        cantidadEntregada: 10,
        precioUnitarioCentavos: 500,
        notaProduccion: null,
        fotoAssetId: null,
      },
    ],
    factura: {
      id: "00000000-0000-4000-8000-000000000040",
      pedidoId: "00000000-0000-4000-8000-000000000010",
      numeroDte: null,
      montoCentavos: 5000,
      abonadoCentavos: 0,
      saldoCentavos: 5000,
      emitidaAt: null,
      antiguedadDias: 0,
      estado: "PENDIENTE",
    },
  };

  test("refleja cobro parcial en cola antes de sincronizar", () => {
    const parada = paradaConColaLocal(paradaBase, [
      {
        tipo: "PAGO",
        idempotencyKey: "pago-1",
        pagoId: "00000000-0000-4000-8000-000000000050",
        clienteId: paradaBase.clienteId,
        pedidoId: paradaBase.pedidoId,
        montoCentavos: 200,
        metodo: "EFECTIVO",
        estado: "pendiente",
        enqueuedAt: "2026-08-22T10:00:00.000Z",
      },
    ]);
    expect(parada.factura?.abonadoCentavos).toBe(200);
    expect(parada.factura?.saldoCentavos).toBe(4800);
    expect(parada.factura?.estado).toBe("ABONO_PARCIAL");
  });

  test("aplica cobro a saldo anterior antes que a la factura de hoy", () => {
    const parada = paradaConColaLocal(
      { ...paradaBase, saldoAnteriorCentavos: 1000 },
      [
        {
          tipo: "PAGO",
          idempotencyKey: "pago-2",
          pagoId: "00000000-0000-4000-8000-000000000051",
          clienteId: paradaBase.clienteId,
          pedidoId: paradaBase.pedidoId,
          montoCentavos: 500,
          metodo: "EFECTIVO",
          estado: "pendiente",
          enqueuedAt: "2026-08-22T10:00:00.000Z",
        },
      ],
    );
    expect(parada.saldoAnteriorCentavos).toBe(500);
    expect(parada.factura?.abonadoCentavos).toBe(0);
    expect(parada.factura?.saldoCentavos).toBe(5000);
  });
});

describe("cobradoPendienteColaCentavos", () => {
  test("suma pagos pendientes y enviando", () => {
    expect(
      cobradoPendienteColaCentavos([
        {
          tipo: "PAGO",
          idempotencyKey: "a",
          pagoId: "00000000-0000-4000-8000-000000000060",
          clienteId: "00000000-0000-4000-8000-000000000020",
          montoCentavos: 200,
          metodo: "EFECTIVO",
          estado: "pendiente",
          enqueuedAt: "2026-08-22T10:00:00.000Z",
        },
        {
          tipo: "PAGO",
          idempotencyKey: "b",
          pagoId: "00000000-0000-4000-8000-000000000061",
          clienteId: "00000000-0000-4000-8000-000000000020",
          montoCentavos: 300,
          metodo: "EFECTIVO",
          estado: "enviando",
          enqueuedAt: "2026-08-22T10:01:00.000Z",
        },
      ]),
    ).toBe(500);
  });
});
