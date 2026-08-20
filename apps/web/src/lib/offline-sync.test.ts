import { describe, expect, test } from "bun:test";
import {
  encolar,
  type AccionCola,
  type FilaCola,
} from "@misupertostada/shared";
import { MemoryColaStore } from "./offline-idb";
import { drenarCola, type SyncPorts } from "./offline-sync";

const PEDIDO = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const CLIENTE = "cccccccc-cccc-cccc-cccc-cccccccccccc";
const PRODUCTO = "dddddddd-dddd-dddd-dddd-dddddddddddd";
const PAGO_ID = "11111111-1111-1111-1111-111111111111";
const BLOB_ID = "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee";
const KEY_E = "entrega-tony-tabasco";
const KEY_P = "pago-tony-tabasco-01";

function iso(n: number): string {
  return `2026-08-20T18:00:${String(n).padStart(2, "0")}.000Z`;
}

function entrega(): AccionCola {
  return {
    tipo: "ENTREGA",
    idempotencyKey: KEY_E,
    pedidoId: PEDIDO,
    items: [{ productoId: PRODUCTO, cantidadEntregada: 50 }],
  };
}

function pago(overrides: Partial<Extract<AccionCola, { tipo: "PAGO" }>> = {}): AccionCola {
  return {
    tipo: "PAGO",
    idempotencyKey: KEY_P,
    pagoId: PAGO_ID,
    clienteId: CLIENTE,
    pedidoId: PEDIDO,
    montoCentavos: 62500,
    metodo: "EFECTIVO",
    ...overrides,
  };
}

class FakeApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function ports(overrides: Partial<SyncPorts> = {}): SyncPorts & {
  entregas: string[];
  pagos: string[];
  uploads: string[];
} {
  const entregas: string[] = [];
  const pagos: string[] = [];
  const uploads: string[] = [];
  return {
    entregas,
    pagos,
    uploads,
    postEntrega: async (body) => {
      entregas.push(body.idempotencyKey);
      return { idempotente: false };
    },
    postPago: async (body) => {
      pagos.push(body.idempotencyKey);
      return { idempotente: false };
    },
    subirComprobante: async (_blob, pagoId) => {
      uploads.push(pagoId);
      return "99999999-9999-9999-9999-999999999999";
    },
    ...overrides,
  };
}

describe("MemoryColaStore", () => {
  test("persiste cola, blob y snapshot de ruta", async () => {
    const store = new MemoryColaStore();
    const cola = encolar([], entrega(), iso(1));
    await store.escribirCola(cola);
    await store.putBlob(BLOB_ID, new Blob(["foto"], { type: "image/jpeg" }));
    await store.putRuta({
      fechaOperacion: "2026-08-21",
      paradas: [],
    });
    expect((await store.leerCola())[0]?.idempotencyKey).toBe(KEY_E);
    expect((await store.getBlob(BLOB_ID))?.size).toBe(4);
    expect((await store.getRuta())?.fechaOperacion).toBe("2026-08-21");
  });
});

describe("drenarCola", () => {
  test("entrega del día sale antes que su cobro; ack solo tras 200", async () => {
    const store = new MemoryColaStore();
    let cola: FilaCola[] = [];
    cola = encolar(cola, pago(), iso(1));
    cola = encolar(cola, entrega(), iso(2));
    await store.escribirCola(cola);
    const api = ports();
    const r = await drenarCola(store, api);
    expect(api.entregas).toEqual([KEY_E]);
    expect(api.pagos).toEqual([KEY_P]);
    expect(r.confirmadas).toBe(2);
    expect(await store.leerCola()).toEqual([]);
  });

  test("transferencia sube el blob antes de POST /pagos", async () => {
    const store = new MemoryColaStore();
    await store.putBlob(BLOB_ID, new Blob(["x"], { type: "image/jpeg" }));
    await store.escribirCola(
      encolar(
        [],
        pago({ metodo: "TRANSFERENCIA", blobId: BLOB_ID, pedidoId: undefined }),
        iso(1),
      ),
    );
    const api = ports();
    await drenarCola(store, api);
    expect(api.uploads).toEqual([PAGO_ID]);
    expect(api.pagos).toEqual([KEY_P]);
  });

  test("409 de dominio deja la fila en error y no reintenta en el mismo ciclo", async () => {
    const store = new MemoryColaStore();
    await store.escribirCola(encolar([], entrega(), iso(1)));
    const api = ports({
      postEntrega: async () => {
        throw new FakeApiError("PEDIDO_NO_ENTREGABLE", "No entregable", 409);
      },
    });
    const r = await drenarCola(store, api);
    expect(r.confirmadas).toBe(0);
    const cola = await store.leerCola();
    expect(cola[0]?.estado).toBe("error");
    expect(cola[0]?.errorMensaje).toBe("No entregable");
  });

  test("401 no borra la cola", async () => {
    const store = new MemoryColaStore();
    await store.escribirCola(encolar([], entrega(), iso(1)));
    const api = ports({
      postEntrega: async () => {
        throw new FakeApiError("NO_AUTORIZADO", "sesión", 401);
      },
    });
    await drenarCola(store, api);
    const cola = await store.leerCola();
    expect(cola).toHaveLength(1);
    expect(cola[0]?.estado).toBe("sesion");
  });

  test("5xx deja pendiente y para el ciclo (no ack)", async () => {
    const store = new MemoryColaStore();
    await store.escribirCola(encolar([], entrega(), iso(1)));
    const api = ports({
      postEntrega: async () => {
        throw new FakeApiError("HTTP", "caído", 503);
      },
    });
    const r = await drenarCola(store, api);
    expect(r.confirmadas).toBe(0);
    expect(r.detenido).toBe("red");
    expect((await store.leerCola())[0]?.estado).toBe("pendiente");
  });

  test("retry de la misma key no llama dos veces si el primero ya confirmó", async () => {
    const store = new MemoryColaStore();
    await store.escribirCola(encolar([], entrega(), iso(1)));
    const api = ports();
    await drenarCola(store, api);
    await drenarCola(store, api);
    expect(api.entregas).toEqual([KEY_E]);
  });
});
