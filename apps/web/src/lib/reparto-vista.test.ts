import { describe, expect, test } from "bun:test";
import {
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
