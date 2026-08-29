import { describe, expect, test } from "bun:test";
import type { ClienteProductoFila, PedidoBandeja } from "@misupertostada/shared";
import {
  agruparProductosCaptura,
  aplicarSegmentoLista,
  buildPedidosHref,
  debeAplicarSnapshotServidor,
  parsePedidosRango,
  estadoDeSegmento,
  filtrarBandeja,
  parsePedidoSegmento,
  productosAgregables,
} from "./pedido-vista";

const basePedido = (over: Partial<PedidoBandeja> = {}): PedidoBandeja => ({
  id: "11111111-1111-4111-8111-111111111111",
  correlativo: 1042,
  fechaOperacion: "2026-08-21",
  clienteId: "22222222-2222-4222-8222-222222222222",
  clienteNombre: "Tabascos",
  estado: "CONFIRMADO",
  origen: "PORTAL",
  totalCentavos: 12500,
  capturadoPor: null,
  capturadoAt: "2026-08-20T21:00:00.000Z",
  notasAdmin: null,
  ...over,
});

const fila = (over: Partial<ClienteProductoFila> = {}): ClienteProductoFila => ({
  productoId: "33333333-3333-4333-8333-333333333333",
  sku: "T16",
  nombreCanonico: "Tortilla 16",
  familia: "TORTILLA",
  unidadMedida: "LIBRA",
  puntoCarga: "PLANTA",
  productoActivo: true,
  alias: "grande",
  precioCentavos: 500,
  notaProduccion: null,
  favorito: false,
  orden: 1,
  ligado: true,
  ...over,
});

describe("debeAplicarSnapshotServidor", () => {
  test("cambia de pedido → siempre aplica", () => {
    expect(
      debeAplicarSnapshotServidor({
        pedidoIdLocal: "a",
        pedidoIdServidor: "b",
        dirty: true,
      }),
    ).toBe(true);
  });

  test("mismo pedido dirty → no pisa ediciones", () => {
    expect(
      debeAplicarSnapshotServidor({
        pedidoIdLocal: "a",
        pedidoIdServidor: "a",
        dirty: true,
      }),
    ).toBe(false);
  });

  test("mismo pedido limpio → aplica", () => {
    expect(
      debeAplicarSnapshotServidor({
        pedidoIdLocal: "a",
        pedidoIdServidor: "a",
        dirty: false,
      }),
    ).toBe(true);
  });
});

describe("segmento de estado", () => {
  test("vivos no manda estado al API; anulado sí", () => {
    expect(estadoDeSegmento("todos")).toBeUndefined();
    expect(estadoDeSegmento("vivos")).toBeUndefined();
    expect(estadoDeSegmento("ANULADO")).toBe("ANULADO");
  });

  test("aplicarSegmentoLista oculta anulados en vivos", () => {
    const rows = [
      basePedido({ id: "1", estado: "CONFIRMADO" }),
      basePedido({ id: "2", estado: "ANULADO", correlativo: 2 }),
    ];
    expect(aplicarSegmentoLista(rows, "vivos")).toHaveLength(1);
    expect(aplicarSegmentoLista(rows, "ANULADO")).toHaveLength(1);
    expect(aplicarSegmentoLista(rows, "todos")).toHaveLength(2);
  });

  test("parsePedidoSegmento", () => {
    expect(parsePedidoSegmento("vivos")).toBe("vivos");
    expect(parsePedidoSegmento("ANULADO")).toBe("ANULADO");
    expect(parsePedidoSegmento("x")).toBe("todos");
  });
});

describe("filtrarBandeja", () => {
  test("por nombre y correlativo", () => {
    const rows = [
      basePedido(),
      basePedido({
        id: "2",
        correlativo: 99,
        clienteNombre: "La Estancia",
      }),
    ];
    expect(filtrarBandeja(rows, "1042")).toHaveLength(1);
    expect(filtrarBandeja(rows, "estancia")).toHaveLength(1);
  });

  test("por alias de producto del cliente", () => {
    const rows = [basePedido()];
    const aliases = new Map([
      [rows[0]!.clienteId, ["tortilla grande", "papalinas"]],
    ]);
    expect(filtrarBandeja(rows, "papal", aliases)).toHaveLength(1);
    expect(filtrarBandeja(rows, "xyz", aliases)).toHaveLength(0);
  });
});

describe("agruparProductosCaptura", () => {
  test("favoritos arriba y no se repiten en familia", () => {
    const filas = [
      fila({
        productoId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        favorito: true,
        alias: "grande",
        orden: 2,
      }),
      fila({
        productoId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        familia: "TOSTADA",
        nombreCanonico: "Tostada",
        favorito: false,
        orden: 1,
      }),
      fila({
        productoId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
        favorito: false,
        nombreCanonico: "Tortilla 12",
        orden: 1,
      }),
    ];
    const grupos = agruparProductosCaptura(filas);
    expect(grupos[0]!.key).toBe("favoritos");
    expect(grupos[0]!.filas).toHaveLength(1);
    expect(grupos.map((g) => g.key)).toEqual([
      "favoritos",
      "TORTILLA",
      "TOSTADA",
    ]);
  });
});

describe("productosAgregables", () => {
  test("excluye ya en pedido y sin precio", () => {
    const enPedido = new Set(["aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"]);
    const list = productosAgregables(
      [
        fila({
          productoId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          precioCentavos: 100,
        }),
        fila({
          productoId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
          precioCentavos: null,
        }),
        fila({
          productoId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
          precioCentavos: 200,
        }),
      ],
      enPedido,
    );
    expect(list.map((f) => f.productoId)).toEqual([
      "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
    ]);
  });
});

describe("buildPedidosHref", () => {
  test("arma deep link con pedidoId", () => {
    expect(
      buildPedidosHref({
        pedidoId: "11111111-1111-4111-8111-111111111111",
        fechaOperacion: "2026-08-21",
      }),
    ).toBe(
      "/pedidos?fechaOperacion=2026-08-21&pedidoId=11111111-1111-4111-8111-111111111111",
    );
  });

  test("historial sin fecha", () => {
    expect(
      buildPedidosHref({
        clienteId: "22222222-2222-4222-8222-222222222222",
        historial: true,
        pedidoId: "11111111-1111-4111-8111-111111111111",
      }),
    ).toContain("historial=1");
  });

  test("rango de periodo queda en la URL como el tablero", () => {
    expect(
      buildPedidosHref({
        periodo: "semana",
        desde: "2026-08-17",
        hasta: "2026-08-23",
      }),
    ).toBe("/pedidos?periodo=semana&desde=2026-08-17&hasta=2026-08-23");
  });
});

describe("parsePedidosRango", () => {
  const hoy = "2026-08-22";

  test("sin query usa hoy de operación", () => {
    expect(parsePedidosRango(new URLSearchParams(), hoy)).toEqual({
      periodo: "hoy",
      desde: hoy,
      hasta: hoy,
    });
  });

  test("fechaOperacion suelta (Hoy / ficha) es un día", () => {
    expect(
      parsePedidosRango(
        new URLSearchParams("fechaOperacion=2026-08-21"),
        hoy,
      ),
    ).toEqual({
      periodo: "rango",
      desde: "2026-08-21",
      hasta: "2026-08-21",
    });
  });

  test("historial de cliente no arma rango", () => {
    expect(
      parsePedidosRango(
        new URLSearchParams(
          "clienteId=22222222-2222-4222-8222-222222222222&historial=1",
        ),
        hoy,
      ),
    ).toBeNull();
  });

  test("periodo semana resuelve el rango con el ancla", () => {
    expect(
      parsePedidosRango(new URLSearchParams("periodo=semana"), hoy),
    ).toEqual({
      periodo: "semana",
      desde: "2026-08-17",
      hasta: "2026-08-23",
    });
  });
});

describe("parsePedidosRango · foco de la bandeja", () => {
  const enCurso = "2026-08-24";
  const captura = "2026-08-25";

  test("sin filtro abre en el foco, no en la operación en curso", () => {
    expect(parsePedidosRango(new URLSearchParams(), enCurso, captura)).toEqual({
      periodo: "rango",
      desde: captura,
      hasta: captura,
    });
  });

  test("con los dos ejes juntos sigue siendo periodo hoy", () => {
    expect(parsePedidosRango(new URLSearchParams(), enCurso, enCurso)).toEqual({
      periodo: "hoy",
      desde: enCurso,
      hasta: enCurso,
    });
  });

  test("el atajo Hoy explícito sigue apuntando al eje en curso", () => {
    expect(
      parsePedidosRango(new URLSearchParams("periodo=hoy"), enCurso, captura),
    ).toEqual({ periodo: "hoy", desde: enCurso, hasta: enCurso });
  });

  test("un deep link de fecha manda sobre el foco", () => {
    expect(
      parsePedidosRango(
        new URLSearchParams("fechaOperacion=2026-08-03"),
        enCurso,
        captura,
      ),
    ).toEqual({ periodo: "rango", desde: "2026-08-03", hasta: "2026-08-03" });
  });
});
