import { describe, expect, test } from "bun:test";
import type { PanelSseEvent } from "@misupertostada/shared";
import {
  SSE_CLOSED,
  SSE_CONNECTING,
  SSE_OPEN,
  clavesAInvalidar,
  clavesAlReconectar,
  debeReconectarAlVolver,
  debeReconectarManual,
  fusionarClaves,
  interpretarMensajeSse,
} from "./panel-sse-invalidation";

const PEDIDO = "00000000-0000-4000-a000-000000000099";
const FACTURA = "00000000-0000-4000-a000-000000000088";
const CONV = "00000000-0000-4000-a000-000000000077";
const CLIENTE = "00000000-0000-4000-a000-000000000066";
const FECHA = "2026-08-21";

function incluye(claves: string[][], raiz: string): boolean {
  return claves.some((k) => k[0] === raiz);
}

describe("clavesAInvalidar", () => {
  test("pedido creado/editado/anulado refresca operación sin tocar hoja ni cartera", () => {
    const evento: PanelSseEvent = {
      tipo: "pedido.creado",
      pedidoId: PEDIDO,
      fechaOperacion: FECHA,
    };
    const claves = clavesAInvalidar(evento);
    expect(incluye(claves, "pedidos")).toBe(true);
    expect(incluye(claves, "operacion")).toBe(true);
    expect(incluye(claves, "tablero")).toBe(true);
    expect(incluye(claves, "hoja")).toBe(false);
    expect(incluye(claves, "cartera")).toBe(false);
    expect(incluye(claves, "conversaciones")).toBe(false);
  });

  test("pedido entregado refresca operación y ruta sin tocar hoja", () => {
    const claves = clavesAInvalidar({
      tipo: "pedido.entregado",
      pedidoId: PEDIDO,
      fechaOperacion: FECHA,
    });
    expect(incluye(claves, "pedidos")).toBe(true);
    expect(incluye(claves, "operacion")).toBe(true);
    expect(incluye(claves, "ruta")).toBe(true);
    expect(incluye(claves, "cartera")).toBe(true);
    expect(incluye(claves, "cuadre")).toBe(true);
    expect(incluye(claves, "tablero")).toBe(true);
    expect(incluye(claves, "hoja")).toBe(false);
    expect(incluye(claves, "calendario")).toBe(false);
  });

  test("cierre de día refresca operación, hoja y ruta, no conversaciones", () => {
    const claves = clavesAInvalidar({
      tipo: "dia.cerrado",
      fechaOperacion: FECHA,
      versionHoja: 1,
    });
    expect(incluye(claves, "operacion")).toBe(true);
    expect(incluye(claves, "hoja")).toBe(true);
    expect(incluye(claves, "pedidos")).toBe(true);
    expect(incluye(claves, "calendario")).toBe(true);
    expect(incluye(claves, "ruta")).toBe(true);
    expect(incluye(claves, "conversaciones")).toBe(false);
  });

  test("factura actualizada invalida cartera, pedidos y tablero", () => {
    const claves = clavesAInvalidar({
      tipo: "factura.actualizada",
      fechaOperacion: FECHA,
      facturaId: FACTURA,
      clienteId: CLIENTE,
    });
    expect(incluye(claves, "cartera")).toBe(true);
    expect(incluye(claves, "pedidos")).toBe(true);
    expect(incluye(claves, "tablero")).toBe(true);
    expect(incluye(claves, "hoja")).toBe(false);
  });

  test("pago y abonos no refetch-ean la hoja de producción", () => {
    const clavesPago = clavesAInvalidar({
      tipo: "pago.registrado",
      fechaOperacion: FECHA,
      facturaId: FACTURA,
      clienteId: CLIENTE,
    });
    expect(incluye(clavesPago, "cartera")).toBe(true);
    expect(incluye(clavesPago, "abonos")).toBe(true);
    expect(incluye(clavesPago, "cuadre")).toBe(true);
    expect(incluye(clavesPago, "ruta")).toBe(true);
    expect(incluye(clavesPago, "hoja")).toBe(false);
    expect(incluye(clavesPago, "calendario")).toBe(false);

    const clavesAbono = clavesAInvalidar({
      tipo: "abono.confirmado",
      fechaOperacion: FECHA,
      clienteId: CLIENTE,
      abonoId: "00000000-0000-4000-a000-000000000055",
    });
    expect(clavesAbono).toEqual(clavesPago);
  });

  test("abono reportado desde portal refresca la bandeja de transferencias", () => {
    const claves = clavesAInvalidar({
      tipo: "abono.reportado",
      fechaOperacion: FECHA,
      clienteId: CLIENTE,
      abonoId: "00000000-0000-4000-a000-000000000055",
    });
    expect(incluye(claves, "abonos")).toBe(true);
    expect(incluye(claves, "cartera")).toBe(true);
    expect(incluye(claves, "hoja")).toBe(false);
  });

  test("mensaje de WhatsApp solo invalida conversaciones", () => {
    const claves = clavesAInvalidar({
      tipo: "mensaje.estado",
      conversacionId: CONV,
      clienteId: CLIENTE,
    });
    expect(claves).toEqual([["conversaciones"]]);
  });

  test("cambio de precio en catálogo refresca productos y clientes", () => {
    const base: PanelSseEvent = {
      tipo: "producto.precio",
      productoId: PEDIDO,
    };
    const override: PanelSseEvent = {
      tipo: "cliente_producto.precio",
      productoId: PEDIDO,
      clienteId: CLIENTE,
    };
    expect(incluye(clavesAInvalidar(base), "productos")).toBe(true);
    expect(incluye(clavesAInvalidar(base), "clientes")).toBe(true);
    expect(incluye(clavesAInvalidar(override), "productos")).toBe(true);
    expect(incluye(clavesAInvalidar(override), "clientes")).toBe(true);
  });
});

describe("interpretarMensajeSse", () => {
  test("descarta heartbeat y JSON ilegible", () => {
    expect(interpretarMensajeSse(JSON.stringify({ tipo: "heartbeat" }))).toBe(
      "heartbeat",
    );
    expect(interpretarMensajeSse("no-json")).toBeNull();
    expect(interpretarMensajeSse(JSON.stringify({ tipo: "desconocido" }))).toBeNull();
  });

  test("acepta un evento de panel válido", () => {
    const parsed = interpretarMensajeSse(
      JSON.stringify({
        tipo: "pedido.editado",
        pedidoId: PEDIDO,
        fechaOperacion: FECHA,
      }),
    );
    expect(parsed).toEqual({
      tipo: "pedido.editado",
      pedidoId: PEDIDO,
      fechaOperacion: FECHA,
    });
  });
});

describe("debeReconectarManual", () => {
  test("no reconecta mientras EventSource sigue CONNECTING u OPEN", () => {
    expect(debeReconectarManual(SSE_CONNECTING, false)).toBe(false);
    expect(debeReconectarManual(SSE_OPEN, false)).toBe(false);
  });

  test("reconecta solo si cerró y el efecto sigue activo", () => {
    expect(debeReconectarManual(SSE_CLOSED, false)).toBe(true);
    expect(debeReconectarManual(SSE_CLOSED, true)).toBe(false);
  });
});

describe("debeReconectarAlVolver", () => {
  test("no toca un stream abierto al volver a la pestaña", () => {
    expect(debeReconectarAlVolver(SSE_OPEN, false, true)).toBe(false);
  });

  test("reconecta si el canal quedó suspendido o cerrado", () => {
    expect(debeReconectarAlVolver(SSE_CONNECTING, false, true)).toBe(true);
    expect(debeReconectarAlVolver(SSE_CLOSED, false, true)).toBe(true);
    expect(debeReconectarAlVolver(null, false, true)).toBe(true);
  });

  test("no reconecta en background ni si el efecto ya paró", () => {
    expect(debeReconectarAlVolver(SSE_CLOSED, false, false)).toBe(false);
    expect(debeReconectarAlVolver(null, true, true)).toBe(false);
  });
});

describe("fusionarClaves", () => {
  test("al reconectar cubre el conjunto del panel sin duplicar", () => {
    const fusion = fusionarClaves([
      clavesAlReconectar(),
      clavesAInvalidar({
        tipo: "mensaje.nuevo",
        conversacionId: CONV,
      }),
    ]);
    expect(incluye(fusion, "conversaciones")).toBe(true);
    expect(incluye(fusion, "pedidos")).toBe(true);
    expect(fusion.filter((k) => k[0] === "conversaciones")).toHaveLength(1);
  });
});
