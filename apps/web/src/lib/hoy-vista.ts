import { buildPedidosHref } from "./pedido-vista";

export const PEDIDOS_NOCHE_LIMITE = 8;

export type PedidoNocheRecorte<T> = {
  visible: T[];
  total: number;
  meta: string | null;
};

/** Deep link a ese pedido en la bandeja de la fecha. */
export function hrefPedidoNoche(input: {
  fechaOperacion: string;
  pedidoId: string;
}): string {
  return buildPedidosHref({
    fechaOperacion: input.fechaOperacion,
    pedidoId: input.pedidoId,
  });
}

/** Ficha del restaurante que aún no pidió (no la bandeja genérica). */
export function hrefClienteSinPedido(clienteId: string): string {
  return `/clientes/${clienteId}`;
}

/** Ficha del cliente al límite de crédito. */
export function hrefLimiteCredito(clienteId: string): string {
  return `/clientes/${clienteId}`;
}

/**
 * Recorte de la lista de pedidos de la noche.
 * Meta visible solo si hay más que el límite ("8 de N").
 */
export function recortarPedidosNoche<T>(
  rows: readonly T[],
  limite = PEDIDOS_NOCHE_LIMITE,
): PedidoNocheRecorte<T> {
  const total = rows.length;
  const visible = rows.slice(0, limite);
  const meta = total > limite ? `${limite} de ${total}` : null;
  return { visible, total, meta };
}

/** Join clienteId → fotoAssetId para avatares (misma query que Pedidos). */
export function mapaFotoCliente(
  clientes: readonly { id: string; fotoAssetId?: string | null }[],
): Map<string, string | null> {
  const map = new Map<string, string | null>();
  for (const c of clientes) {
    map.set(c.id, c.fotoAssetId ?? null);
  }
  return map;
}
