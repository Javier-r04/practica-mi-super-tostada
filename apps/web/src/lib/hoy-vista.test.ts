import { describe, expect, test } from "bun:test";
import {
  hrefClienteSinPedido,
  hrefLimiteCredito,
  hrefPedidoNoche,
  mapaFotoCliente,
  PEDIDOS_NOCHE_LIMITE,
  recortarPedidosNoche,
} from "./hoy-vista";

describe("hrefPedidoNoche", () => {
  test("deep link con fecha y pedidoId", () => {
    expect(
      hrefPedidoNoche({
        fechaOperacion: "2026-08-21",
        pedidoId: "11111111-1111-4111-8111-111111111111",
      }),
    ).toBe(
      "/pedidos?fechaOperacion=2026-08-21&pedidoId=11111111-1111-4111-8111-111111111111",
    );
  });
});

describe("hrefClienteSinPedido / hrefLimiteCredito", () => {
  test("abren la ficha, no la bandeja", () => {
    const id = "22222222-2222-4222-8222-222222222222";
    expect(hrefClienteSinPedido(id)).toBe(`/clientes/${id}`);
    expect(hrefLimiteCredito(id)).toBe(`/clientes/${id}`);
    expect(hrefClienteSinPedido(id)).not.toContain("pedidos");
  });
});

describe("recortarPedidosNoche", () => {
  test("sin meta si cabe en el límite", () => {
    const rows = [1, 2, 3];
    const r = recortarPedidosNoche(rows);
    expect(r.visible).toEqual([1, 2, 3]);
    expect(r.total).toBe(3);
    expect(r.meta).toBeNull();
  });

  test("meta 8 de N cuando hay más", () => {
    const rows = Array.from({ length: 12 }, (_, i) => i + 1);
    const r = recortarPedidosNoche(rows);
    expect(r.visible).toHaveLength(PEDIDOS_NOCHE_LIMITE);
    expect(r.visible[0]).toBe(1);
    expect(r.visible[7]).toBe(8);
    expect(r.total).toBe(12);
    expect(r.meta).toBe("8 de 12");
  });
});

describe("mapaFotoCliente", () => {
  test("clienteId → fotoAssetId", () => {
    const map = mapaFotoCliente([
      { id: "a", fotoAssetId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" },
      { id: "b", fotoAssetId: null },
      { id: "c" },
    ]);
    expect(map.get("a")).toBe("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
    expect(map.get("b")).toBeNull();
    expect(map.get("c")).toBeNull();
  });
});
