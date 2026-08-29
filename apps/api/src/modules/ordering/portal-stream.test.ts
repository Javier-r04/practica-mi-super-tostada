import { describe, expect, test } from "bun:test";
import { PedidoEvents } from "./pedido-events";
import { visibleParaCliente } from "./portal-stream";
import { filter } from "rxjs/operators";

const ORG = "00000000-0000-4000-a000-0000000000aa";
const OTRA_ORG = "00000000-0000-4000-a000-0000000000dd";
const CLIENTE = "00000000-0000-4000-a000-0000000000bb";
const OTRO = "00000000-0000-4000-a000-0000000000cc";
const PEDIDO = "00000000-0000-4000-a000-000000000099";
const FECHA = "2026-08-21";

/**
 * Lo que importa aquí es que `dia.reabierto` llegue al portal —es lo que
 * vuelve a abrir la ventana del cliente sin recargar— y que no se cuele nada
 * de otro cliente: el bus es de la organización entera.
 */
describe("stream del portal", () => {
  test("pasan los eventos de operación y los propios; no los ajenos", () => {
    const bus = new PedidoEvents();
    const vistos: string[] = [];
    const sub = bus
      .stream(ORG)
      .pipe(filter(({ data }) => visibleParaCliente(data, CLIENTE)))
      .subscribe(({ data }) => {
        if (data.tipo !== "heartbeat") vistos.push(data.tipo);
      });

    bus.emit({ organizacionId: ORG, tipo: "dia.reabierto", fechaOperacion: FECHA });
    bus.emit({ organizacionId: ORG, tipo: "dia.cerrado", fechaOperacion: FECHA });
    bus.emit({
      organizacionId: ORG,
      tipo: "factura.actualizada",
      fechaOperacion: FECHA,
      clienteId: CLIENTE,
    });
    bus.emit({
      organizacionId: ORG,
      tipo: "factura.actualizada",
      fechaOperacion: FECHA,
      clienteId: OTRO,
    });
    // De otra organización no llega nada, ni siquiera lo de operación.
    bus.emit({
      organizacionId: OTRA_ORG,
      tipo: "dia.reabierto",
      fechaOperacion: FECHA,
    });
    // Un pedido no identifica al cliente: no se difunde.
    bus.emit({
      organizacionId: ORG,
      tipo: "pedido.creado",
      pedidoId: PEDIDO,
      fechaOperacion: FECHA,
    });

    expect(vistos).toEqual([
      "dia.reabierto",
      "dia.cerrado",
      "factura.actualizada",
    ]);
    sub.unsubscribe();
  });

  test("el latido siempre pasa", () => {
    expect(visibleParaCliente({ tipo: "heartbeat" }, CLIENTE)).toBe(true);
  });
});
