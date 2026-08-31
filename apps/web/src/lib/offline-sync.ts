import {
  confirmarAccion,
  fallarAccion,
  marcarEnviando,
  siguienteAccion,
  type FilaCola,
  type EntregarPedidoRequest,
  type RegistrarPagoRequest,
} from "@misupertostada/shared";
import type { ColaStore } from "./offline-idb";

export type SyncPorts = {
  postEntrega: (body: EntregarPedidoRequest) => Promise<unknown>;
  postPago: (body: RegistrarPagoRequest) => Promise<unknown>;
  subirComprobante: (blob: Blob, pagoId: string) => Promise<string>;
};

export type DrainResultado = {
  confirmadas: number;
  detenido: "vacio" | "red" | "sesion";
};

function httpStatus(err: unknown): number {
  if (err && typeof err === "object" && "status" in err) {
    const status = (err as { status: unknown }).status;
    if (typeof status === "number") return status;
  }
  return 0;
}

function mensajeDe(err: unknown): string {
  return err instanceof Error ? err.message : "No se pudo enviar";
}

function reanudarEnVuelo(cola: readonly FilaCola[]): FilaCola[] {
  return cola.map((f) =>
    f.estado === "enviando" ? { ...f, estado: "pendiente" as const } : f,
  );
}

/**
 * Drena FIFO. Ack solo con HTTP 200. Un PAGO espera la ENTREGA de ese pedido
 * (reducer). Red/5xx para el ciclo; 409 queda en error; 401 no borra.
 */
export async function drenarCola(
  store: ColaStore,
  ports: SyncPorts,
): Promise<DrainResultado> {
  let confirmadas = 0;
  await store.escribirCola(reanudarEnVuelo(await store.leerCola()));

  for (;;) {
    const cola = await store.leerCola();
    const next = siguienteAccion(cola);
    if (!next) return { confirmadas, detenido: "vacio" };

    await store.escribirCola(marcarEnviando(cola, next.idempotencyKey));
    try {
      if (next.tipo === "ENTREGA") {
        await ports.postEntrega({
          pedidoId: next.pedidoId,
          idempotencyKey: next.idempotencyKey,
          items: next.items,
        });
      } else {
        let comprobanteAssetId: string | undefined;
        if (next.blobId) {
          const blob = await store.getBlob(next.blobId);
          if (!blob) {
            throw Object.assign(new Error("Falta el comprobante en este teléfono"), {
              status: 400,
            });
          }
          comprobanteAssetId = await ports.subirComprobante(blob, next.pagoId);
        }
        await ports.postPago({
          id: next.pagoId,
          idempotencyKey: next.idempotencyKey,
          clienteId: next.clienteId,
          montoCentavos: next.montoCentavos,
          metodo: next.metodo,
          comprobanteAssetId,
          origen: "REPARTO",
        });
      }
      await store.escribirCola(
        confirmarAccion(await store.leerCola(), next.idempotencyKey),
      );
      confirmadas += 1;
    } catch (err) {
      const status = httpStatus(err);
      const after = fallarAccion(await store.leerCola(), next.idempotencyKey, {
        httpStatus: status,
        mensaje: mensajeDe(err),
      });
      await store.escribirCola(after);
      const fila = after.find((f) => f.idempotencyKey === next.idempotencyKey);
      if (fila?.estado === "sesion") return { confirmadas, detenido: "sesion" };
      if (fila?.estado === "pendiente") return { confirmadas, detenido: "red" };
    }
  }
}
