import { describe, expect, test } from "bun:test";
import {
  desgloseCobroParada,
  saldoParadaCentavos,
  siguienteTrasCobro,
  siguienteTrasEntrega,
  siguienteTrasVolver,
  vistaInicialParada,
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
