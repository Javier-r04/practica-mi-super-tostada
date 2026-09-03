import { describe, expect, test } from "bun:test";
import {
  confirmarAccion,
  encolar,
  fallarAccion,
  marcarEnviando,
  MENSAJE_COLA_SESION,
  MENSAJE_COMPROBANTE_REQUERIDO,
  MENSAJE_SIN_SENAL,
  pendientesCount,
  pedidoTieneCola,
  siguienteAccion,
  type AccionCola,
  type FilaCola,
} from "./offline";
import { entregarPedidoRequestSchema } from "./receivables";

const PEDIDO_A = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const PEDIDO_B = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
const CLIENTE = "cccccccc-cccc-cccc-cccc-cccccccccccc";
const PRODUCTO = "dddddddd-dddd-dddd-dddd-dddddddddddd";
const PAGO_1 = "11111111-1111-1111-1111-111111111111";
const PAGO_2 = "22222222-2222-2222-2222-222222222222";
const KEY_E1 = "entrega-pedido-a-001";
const KEY_E2 = "entrega-pedido-b-002";
const KEY_P1 = "pago-efectivo-0001";
const KEY_P2 = "pago-transfer-0002";
const BLOB = "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee";

function iso(seq: number): string {
  return `2026-08-20T18:00:${String(seq).padStart(2, "0")}.000Z`;
}

function entrega(
  overrides: Partial<Extract<AccionCola, { tipo: "ENTREGA" }>> = {},
): Extract<AccionCola, { tipo: "ENTREGA" }> {
  return {
    tipo: "ENTREGA",
    idempotencyKey: KEY_E1,
    pedidoId: PEDIDO_A,
    items: [{ productoId: PRODUCTO, cantidadEntregada: 50 }],
    ...overrides,
  };
}

function pago(
  overrides: Partial<Extract<AccionCola, { tipo: "PAGO" }>> = {},
): Extract<AccionCola, { tipo: "PAGO" }> {
  return {
    tipo: "PAGO",
    idempotencyKey: KEY_P1,
    pagoId: PAGO_1,
    clienteId: CLIENTE,
    pedidoId: PEDIDO_A,
    montoCentavos: 62500,
    metodo: "EFECTIVO",
    ...overrides,
  };
}

describe("MENSAJE_SIN_SENAL", () => {
  test("copy honesto: queda en el teléfono, no finge guardado en servidor", () => {
    expect(MENSAJE_SIN_SENAL).toBe("Sin señal · queda en este teléfono");
    expect(MENSAJE_SIN_SENAL).not.toMatch(/todavía \(E8\)/);
    expect(MENSAJE_SIN_SENAL.toLowerCase()).not.toContain("cancelado");
  });
});

describe("entregarPedidoRequestSchema (E8)", () => {
  test("exige idempotencyKey de 8–128", () => {
    expect(
      entregarPedidoRequestSchema.safeParse({ pedidoId: PEDIDO_A }).success,
    ).toBe(false);
    expect(
      entregarPedidoRequestSchema.safeParse({
        pedidoId: PEDIDO_A,
        idempotencyKey: "corta",
      }).success,
    ).toBe(false);
    expect(
      entregarPedidoRequestSchema.safeParse({
        pedidoId: PEDIDO_A,
        idempotencyKey: KEY_E1,
      }).success,
    ).toBe(true);
  });
});

describe("encolar ENTREGA (D6 coalesce)", () => {
  test("primera entrega entra como pendiente", () => {
    const cola = encolar([], entrega(), iso(1));
    expect(cola).toHaveLength(1);
    expect(cola[0]?.estado).toBe("pendiente");
    expect(cola[0]?.enqueuedAt).toBe(iso(1));
    expect(pendientesCount(cola)).toBe(1);
  });

  test("re-tap del mismo pedido actualiza cantidades y conserva la key", () => {
    const a = encolar([], entrega(), iso(1));
    const b = encolar(
      a,
      entrega({
        idempotencyKey: "entrega-otra-key-xxx",
        items: [{ productoId: PRODUCTO, cantidadEntregada: 40 }],
      }),
      iso(2),
    );
    expect(b).toHaveLength(1);
    expect(b[0]?.idempotencyKey).toBe(KEY_E1);
    expect(b[0]?.enqueuedAt).toBe(iso(1));
    if (b[0]?.tipo !== "ENTREGA") throw new Error("esperaba ENTREGA");
    expect(b[0].items[0]?.cantidadEntregada).toBe(40);
    expect(b[0].estado).toBe("pendiente");
  });

  test("dos pedidos distintos son dos acciones", () => {
    const a = encolar([], entrega(), iso(1));
    const b = encolar(
      a,
      entrega({ idempotencyKey: KEY_E2, pedidoId: PEDIDO_B }),
      iso(2),
    );
    expect(b).toHaveLength(2);
  });
});

describe("encolar PAGO (D6 no fusionar cobros)", () => {
  test("cada abono es una acción nueva", () => {
    const a = encolar([], pago({ montoCentavos: 20000 }), iso(1));
    const b = encolar(
      a,
      pago({
        idempotencyKey: KEY_P2,
        pagoId: PAGO_2,
        montoCentavos: 10000,
      }),
      iso(2),
    );
    expect(b).toHaveLength(2);
    expect(b.map((f) => f.idempotencyKey)).toEqual([KEY_P1, KEY_P2]);
  });

  test("rechaza monto con float: solo enteros en centavos", () => {
    expect(() => encolar([], pago({ montoCentavos: 12.5 }), iso(1))).toThrow(
      /enteros/,
    );
  });

  test("transferencia sin foto no se encola", () => {
    expect(() =>
      encolar([], pago({ metodo: "TRANSFERENCIA" }), iso(1)),
    ).toThrow(MENSAJE_COMPROBANTE_REQUERIDO);
  });

  test("cheque sin foto no se encola", () => {
    expect(() => encolar([], pago({ metodo: "CHEQUE" }), iso(1))).toThrow(
      MENSAJE_COMPROBANTE_REQUERIDO,
    );
  });

  test("transferencia con blobId sí entra", () => {
    const cola = encolar(
      [],
      pago({ metodo: "TRANSFERENCIA", blobId: BLOB }),
      iso(1),
    );
    expect(cola).toHaveLength(1);
  });

  test("cheque con blobId sí entra", () => {
    const cola = encolar(
      [],
      pago({ metodo: "CHEQUE", blobId: BLOB }),
      iso(1),
    );
    expect(cola).toHaveLength(1);
  });

  test("no duplica la misma idempotencyKey", () => {
    const a = encolar([], pago(), iso(1));
    expect(() => encolar(a, pago({ montoCentavos: 1 }), iso(2))).toThrow(
      /idempotency/i,
    );
  });
});

describe("siguienteAccion (D7 FIFO + espera de factura)", () => {
  test("FIFO por enqueuedAt", () => {
    let cola: FilaCola[] = [];
    cola = encolar(cola, entrega({ pedidoId: PEDIDO_B, idempotencyKey: KEY_E2 }), iso(2));
    cola = encolar(cola, entrega(), iso(1));
    const next = siguienteAccion(cola);
    expect(next?.idempotencyKey).toBe(KEY_E1);
  });

  test("PAGO del pedido de hoy espera a su ENTREGA", () => {
    let cola: FilaCola[] = [];
    cola = encolar(cola, pago(), iso(1));
    cola = encolar(cola, entrega(), iso(2));
    expect(siguienteAccion(cola)?.tipo).toBe("ENTREGA");
    cola = confirmarAccion(cola, KEY_E1);
    expect(siguienteAccion(cola)?.tipo).toBe("PAGO");
  });

  test("saldo anterior (pago sin pedidoId de entrega pendiente) sale en orden", () => {
    let cola: FilaCola[] = [];
    cola = encolar(
      cola,
      pago({ pedidoId: undefined, idempotencyKey: KEY_P1 }),
      iso(1),
    );
    cola = encolar(cola, entrega(), iso(2));
    expect(siguienteAccion(cola)?.idempotencyKey).toBe(KEY_P1);
  });

  test("enqueuedAt no es fecha_operacion: el orden es el ISO local inyectado", () => {
    const cola = encolar([], entrega(), "2026-01-01T00:00:00.000Z");
    expect(cola[0]?.enqueuedAt).toBe("2026-01-01T00:00:00.000Z");
  });
});

describe("ack / fail", () => {
  test("confirmar quita la fila (el UI ya puede mostrar Entregado/Pagado)", () => {
    const cola = confirmarAccion(encolar([], entrega(), iso(1)), KEY_E1);
    expect(cola).toEqual([]);
    expect(pedidoTieneCola(cola, PEDIDO_A)).toBe(false);
  });

  test("401 → sesion, no borra la cola", () => {
    const cola = fallarAccion(encolar([], entrega(), iso(1)), KEY_E1, {
      httpStatus: 401,
      mensaje: "No autorizado",
    });
    expect(cola[0]?.estado).toBe("sesion");
    expect(cola[0]?.errorMensaje).toBe(MENSAJE_COLA_SESION);
    expect(cola).toHaveLength(1);
  });

  test("409 de dominio → error, siguienteAccion lo salta", () => {
    let cola = encolar([], entrega(), iso(1));
    cola = encolar(
      cola,
      entrega({ pedidoId: PEDIDO_B, idempotencyKey: KEY_E2 }),
      iso(2),
    );
    cola = fallarAccion(cola, KEY_E1, {
      httpStatus: 409,
      mensaje: "No entregable",
    });
    expect(cola[0]?.estado).toBe("error");
    expect(siguienteAccion(cola)?.idempotencyKey).toBe(KEY_E2);
  });

  test("red / 5xx vuelve a pendiente para reintentar", () => {
    let cola = marcarEnviando(encolar([], entrega(), iso(1)), KEY_E1);
    expect(cola[0]?.estado).toBe("enviando");
    cola = fallarAccion(cola, KEY_E1, { httpStatus: 503, mensaje: "caído" });
    expect(cola[0]?.estado).toBe("pendiente");
    cola = fallarAccion(cola, KEY_E1, { httpStatus: 0, mensaje: "red" });
    expect(cola[0]?.estado).toBe("pendiente");
  });
});
