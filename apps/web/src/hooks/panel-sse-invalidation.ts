import { panelSseEventSchema, type PanelSseEvent } from "@misupertostada/shared";

export const SSE_CONNECTING = 0;
export const SSE_OPEN = 1;
export const SSE_CLOSED = 2;

const CLAVES_PEDIDO: string[][] = [["pedidos"], ["tablero"]];
const CLAVES_OPERACION: string[][] = [
  ["operacion"],
  ["hoja"],
  ["pedidos"],
  ["calendario"],
  ["tablero"],
];
const CLAVES_ENTREGA: string[][] = [
  ["pedidos"],
  ["ruta"],
  ["cartera"],
  ["cuadre"],
  ["tablero"],
];
const CLAVES_FACTURA: string[][] = [["cartera"], ["tablero"]];
const CLAVES_PAGO: string[][] = [["cartera"], ["cuadre"], ["ruta"], ["tablero"]];
const CLAVES_MENSAJE: string[][] = [["conversaciones"]];

const CLAVES_RECONEXION: string[][] = [
  ["pedidos"],
  ["hoja"],
  ["operacion"],
  ["calendario"],
  ["cartera"],
  ["ruta"],
  ["cuadre"],
  ["tablero"],
  ["conversaciones"],
];

export function clavesAInvalidar(evento: PanelSseEvent): string[][] {
  switch (evento.tipo) {
    case "pedido.creado":
    case "pedido.editado":
    case "pedido.anulado":
      return CLAVES_PEDIDO;
    case "dia.cerrado":
    case "dia.reabierto":
    case "hoja.generada":
      return CLAVES_OPERACION;
    case "pedido.entregado":
      return CLAVES_ENTREGA;
    case "factura.actualizada":
      return CLAVES_FACTURA;
    case "pago.registrado":
      return CLAVES_PAGO;
    case "mensaje.nuevo":
    case "mensaje.estado":
      return CLAVES_MENSAJE;
  }
}

export function clavesAlReconectar(): string[][] {
  return CLAVES_RECONEXION;
}

export function fusionarClaves(lotes: string[][][]): string[][] {
  const seen = new Map<string, string[]>();
  for (const lote of lotes) {
    for (const key of lote) {
      seen.set(key.join("\0"), key);
    }
  }
  return [...seen.values()];
}

export function interpretarMensajeSse(
  data: string,
): PanelSseEvent | "heartbeat" | null {
  try {
    const parsed: unknown = JSON.parse(data);
    if (
      parsed &&
      typeof parsed === "object" &&
      "tipo" in parsed &&
      parsed.tipo === "heartbeat"
    ) {
      return "heartbeat";
    }
    const evento = panelSseEventSchema.safeParse(parsed);
    return evento.success ? evento.data : null;
  } catch {
    return null;
  }
}

export function debeReconectarManual(
  readyState: number,
  stopped: boolean,
): boolean {
  return !stopped && readyState === SSE_CLOSED;
}
