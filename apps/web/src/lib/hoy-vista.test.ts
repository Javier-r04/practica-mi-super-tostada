import { describe, expect, test } from "bun:test";
import {
  copyHeroFoco,
  copyVentanaHoy,
  fechaDeFoco,
  fechaDefectoHoy,
  focoDeFecha,
  hrefHoyFecha,
  hrefClienteSinPedido,
  hrefLimiteCredito,
  hrefPedidoNoche,
  mapaFotoCliente,
  PEDIDOS_NOCHE_LIMITE,
  recortarPedidosNoche,
} from "./hoy-vista";

describe("copyVentanaHoy", () => {
  test("usa el horario del servidor, no 15:00 fijo", () => {
    const copy = copyVentanaHoy({ apertura: "11:00", cierre: "00:00" });
    expect(copy.subtitle).toBe("11:00 → 00:00 · America/Guatemala");
    expect(copy.empty).toContain("11:00");
    expect(copy.empty).not.toContain("15:00");
  });
});

describe("hrefHoyFecha", () => {
  test("un atajo de varios días se queda en /hoy, no en /pedidos", () => {
    expect(hrefHoyFecha("2026-08-21")).toBe("/hoy?fechaOperacion=2026-08-21");
    expect(hrefHoyFecha("")).toBe("/hoy");
    expect(hrefHoyFecha("2026-08-21")).not.toContain("pedidos");
  });
});

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

describe("ejes de operación en /hoy", () => {
  // Martes 18. La ventana del lunes cerró a las 03:00; la del martes abre a
  // las 15:00. Entre medio se reparte lo del lunes.
  const cerrada = {
    ventanaAbierta: false,
    fechaOperacionCaptura: "2026-08-18",
    fechaOperacionEnCurso: "2026-08-17",
  };
  const abierta = { ...cerrada, ventanaAbierta: true };

  test("con la ventana cerrada abre en el reparto, no en la ventana vacía", () => {
    // A las 08:00 la operación del martes no ha recibido un solo pedido.
    expect(fechaDefectoHoy(cerrada)).toBe("2026-08-17");
  });

  test("con la ventana abierta abre en la captura", () => {
    expect(fechaDefectoHoy(abierta)).toBe("2026-08-18");
  });

  test("sin calendario todavía no inventa una fecha", () => {
    expect(fechaDefectoHoy(undefined)).toBe("");
  });

  test("focoDeFecha distingue los dos ejes y las fechas históricas", () => {
    expect(focoDeFecha("2026-08-17", cerrada)).toBe("curso");
    expect(focoDeFecha("2026-08-18", cerrada)).toBe("captura");
    expect(focoDeFecha("2026-08-11", cerrada)).toBe("otra");
  });

  test("fechaDeFoco es la inversa de focoDeFecha", () => {
    expect(fechaDeFoco("curso", cerrada)).toBe("2026-08-17");
    expect(fechaDeFoco("captura", cerrada)).toBe("2026-08-18");
  });

  test("el hero no llama «noche» a un reparto ya hecho", () => {
    expect(copyHeroFoco("captura").titulo).toBe("Monto de la noche");
    expect(copyHeroFoco("curso").titulo).not.toContain("noche");
    expect(copyHeroFoco("otra").nota).toContain("pasada");
  });
});
