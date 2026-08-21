import { describe, expect, test } from "bun:test";
import { firstValueFrom, take, timeout } from "rxjs";
import { PedidoEvents } from "./panel-events";

const PEDIDO = "00000000-0000-4000-a000-000000000099";
const FACTURA = "00000000-0000-4000-a000-000000000088";
const FECHA = "2026-08-21";
const ORG = "org-a";
const OTRA = "org-b";

describe("PedidoEvents", () => {
  test("el primer latido llega de inmediato", async () => {
    const bus = new PedidoEvents();
    const primero = await firstValueFrom(
      bus.stream(ORG).pipe(take(1), timeout({ first: 200 })),
    );
    expect(primero.data).toEqual({ tipo: "heartbeat" });
  });

  test("un payload inválido no tumba observe y el siguiente evento sí llega", async () => {
    const bus = new PedidoEvents();
    const vistos: string[] = [];
    let error = false;
    const sub = bus.observe(ORG).subscribe({
      next: (e) => vistos.push(e.tipo),
      error: () => {
        error = true;
      },
    });

    bus.emit({
      organizacionId: ORG,
      tipo: "factura.actualizada",
      fechaOperacion: "",
      facturaId: FACTURA,
    });
    bus.emit({
      organizacionId: OTRA,
      tipo: "pedido.creado",
      pedidoId: PEDIDO,
      fechaOperacion: FECHA,
    });
    bus.emit({
      organizacionId: ORG,
      tipo: "pedido.creado",
      pedidoId: PEDIDO,
      fechaOperacion: FECHA,
    });

    expect(error).toBe(false);
    expect(vistos).toEqual(["pedido.creado"]);
    sub.unsubscribe();
  });
});
