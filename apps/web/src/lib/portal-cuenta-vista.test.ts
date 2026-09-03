import { describe, expect, test } from "bun:test";
import type { PortalAbonoAplicacion } from "@misupertostada/shared";
import {
  avancePagoFactura,
  esFiltroFacturas,
  hrefPedidoPortal,
  resumenAplicacion,
} from "./portal-cuenta-vista";

describe("avancePagoFactura", () => {
  test("sin abonos: falta todo", () => {
    const a = avancePagoFactura({ montoCentavos: 10000, abonadoCentavos: 0 });
    expect(a.faltaCentavos).toBe(10000);
    expect(a.porcentaje).toBe(0);
    expect(a.etiqueta).toBe("Falta Q 100.00");
  });

  test("abono parcial: dice lo abonado y lo que falta", () => {
    const a = avancePagoFactura({ montoCentavos: 10000, abonadoCentavos: 3000 });
    expect(a.faltaCentavos).toBe(7000);
    expect(a.porcentaje).toBe(30);
    expect(a.etiqueta).toBe("Abonado Q 30.00 · falta Q 70.00");
  });

  test("saldada", () => {
    const a = avancePagoFactura({ montoCentavos: 10000, abonadoCentavos: 10000 });
    expect(a.faltaCentavos).toBe(0);
    expect(a.porcentaje).toBe(100);
    expect(a.etiqueta).toBe("Pagada por completo");
  });

  test("nunca queda saldo negativo si el abono excede el monto", () => {
    const a = avancePagoFactura({ montoCentavos: 10000, abonadoCentavos: 12000 });
    expect(a.faltaCentavos).toBe(0);
    expect(a.porcentaje).toBe(100);
  });

  test("factura en cero (todo entregado en cero) está pagada, no NaN", () => {
    const a = avancePagoFactura({ montoCentavos: 0, abonadoCentavos: 0 });
    expect(a.porcentaje).toBe(100);
    expect(a.faltaCentavos).toBe(0);
  });

  test("el porcentaje redondea, pero el dinero queda al centavo", () => {
    const a = avancePagoFactura({ montoCentavos: 30000, abonadoCentavos: 10000 });
    expect(a.porcentaje).toBe(33);
    expect(a.faltaCentavos).toBe(20000);
  });
});

describe("resumenAplicacion", () => {
  const base: PortalAbonoAplicacion = {
    facturaId: "00000000-0000-4000-a000-000000000001",
    pedidoId: "00000000-0000-4000-a000-000000000002",
    correlativo: 1042,
    fechaEntrega: "2026-08-21",
    numeroDte: "A-4821",
    montoCentavos: 5000,
  };

  test("el pedido va en el título; fecha y DTE en el detalle", () => {
    expect(resumenAplicacion(base)).toEqual({
      titulo: "Pedido #1042",
      detalle: "Viernes 21 de agosto · DTE A-4821",
    });
  });

  test("factura aún sin DTE capturado", () => {
    expect(resumenAplicacion({ ...base, numeroDte: null })).toEqual({
      titulo: "Pedido #1042",
      detalle: "Viernes 21 de agosto · sin DTE",
    });
  });

  test("el título nunca depende de la fecha ni del DTE: es lo que no se puede recortar", () => {
    const largo = resumenAplicacion({
      ...base,
      numeroDte: "SERIE-MUY-LARGA-0000000000001",
    });
    expect(largo.titulo).toBe("Pedido #1042");
  });
});

describe("esFiltroFacturas", () => {
  test("acepta los tres del contrato y rechaza el resto", () => {
    expect(esFiltroFacturas("pendientes")).toBe(true);
    expect(esFiltroFacturas("pagadas")).toBe(true);
    expect(esFiltroFacturas("todas")).toBe(true);
    expect(esFiltroFacturas("vencidas")).toBe(false);
  });
});

describe("hrefPedidoPortal", () => {
  test("escapa el token", () => {
    expect(hrefPedidoPortal("a b/c", "00000000-0000-4000-a000-000000000002")).toBe(
      "/p/a%20b%2Fc/pedidos/00000000-0000-4000-a000-000000000002",
    );
  });
});
