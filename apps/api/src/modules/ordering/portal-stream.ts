import {
  OPERACION_SSE_TIPOS,
  type PanelSseEvent,
} from "@misupertostada/shared";

export type EventoPortal = PanelSseEvent | { tipo: "heartbeat" };

/**
 * Qué puede ver un cliente del bus del panel.
 *
 * Pasan los eventos de operación —cerrar y **reabrir** el día, y la hoja—
 * porque cambian si su ventana está abierta y no dicen nada de nadie, y los
 * que llevan su propio `clienteId`. Todo lo demás (pedidos y facturas de otros
 * clientes) se queda fuera: el bus es de la organización entera.
 */
export function visibleParaCliente(
  data: EventoPortal,
  clienteId: string,
): boolean {
  if (data.tipo === "heartbeat") return true;
  if ((OPERACION_SSE_TIPOS as readonly string[]).includes(data.tipo)) {
    return true;
  }
  if (data.tipo === "producto.precio") return true;
  if (data.tipo === "cliente_producto.precio") {
    return "clienteId" in data && data.clienteId === clienteId;
  }
  return "clienteId" in data && data.clienteId === clienteId;
}
