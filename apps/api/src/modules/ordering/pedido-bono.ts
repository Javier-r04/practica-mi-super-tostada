import { and, asc, eq, isNull, sql } from "drizzle-orm";
import { clienteBono, pedidoItem } from "@misupertostada/db";
import type { AppDatabase } from "../shared/database.module";
import { DomainException } from "../shared/domain.exception";

export type ItemPedidoInput = {
  productoId: string;
  cantidad: number;
  esDevolucion?: boolean;
  bonoId?: string;
};

export type ItemSnapshotBono = {
  productoId: string;
  cantidad: number;
  nombreMostrado: string;
  unidadMedida: "LIBRA" | "BOLSA" | "UNIDAD";
  precioUnitarioCentavos: number;
  esDevolucion: boolean;
  bonoId: string | null;
};

type BonoRow = typeof clienteBono.$inferSelect;

function saldoDe(bono: BonoRow): number {
  return bono.cantidadOtorgada - bono.cantidadAplicada;
}

export async function restaurarBonosDePedido(
  tx: AppDatabase,
  pedidoId: string,
): Promise<void> {
  const lineas = await tx
    .select()
    .from(pedidoItem)
    .where(
      and(eq(pedidoItem.pedidoId, pedidoId), eq(pedidoItem.esDevolucion, true)),
    );
  for (const linea of lineas) {
    if (!linea.bonoId) continue;
    await tx
      .update(clienteBono)
      .set({
        cantidadAplicada: sql`${clienteBono.cantidadAplicada} - ${linea.cantidadPedida}`,
      })
      .where(eq(clienteBono.id, linea.bonoId));
  }
}

export async function restaurarBonoNoEntregado(
  tx: AppDatabase,
  bonoId: string,
  cantidad: number,
): Promise<void> {
  if (cantidad <= 0) return;
  await tx
    .update(clienteBono)
    .set({
      cantidadAplicada: sql`${clienteBono.cantidadAplicada} - ${cantidad}`,
    })
    .where(eq(clienteBono.id, bonoId));
}

async function lockBonosCliente(
  tx: AppDatabase,
  clienteId: string,
): Promise<BonoRow[]> {
  return tx
    .select()
    .from(clienteBono)
    .where(
      and(eq(clienteBono.clienteId, clienteId), isNull(clienteBono.anuladoAt)),
    )
    .orderBy(asc(clienteBono.createdAt))
    .for("update");
}

async function aplicarCantidad(
  tx: AppDatabase,
  bonoId: string,
  cantidad: number,
): Promise<void> {
  await tx
    .update(clienteBono)
    .set({
      cantidadAplicada: sql`${clienteBono.cantidadAplicada} + ${cantidad}`,
    })
    .where(eq(clienteBono.id, bonoId));
}

function consumirFifo(
  bonos: BonoRow[],
  productoId: string,
  cantidad: number,
  bonoId?: string,
): Array<{ bonoId: string; cantidad: number }> {
  const candidatos = bonoId
    ? bonos.filter((b) => b.id === bonoId)
    : bonos.filter((b) => b.productoId === productoId);

  let restante = cantidad;
  const asignaciones: Array<{ bonoId: string; cantidad: number }> = [];

  for (const bono of candidatos) {
    const saldo = saldoDe(bono);
    if (saldo <= 0) continue;
    const usar = Math.min(saldo, restante);
    if (usar > 0) {
      asignaciones.push({ bonoId: bono.id, cantidad: usar });
      restante -= usar;
    }
    if (restante === 0) break;
  }

  if (restante > 0) {
    throw new DomainException(
      "BONO_INSUFICIENTE",
      "No hay suficiente saldo de devolución para este pedido",
      409,
    );
  }

  return asignaciones;
}

/**
 * Restaura lo aplicado por el pedido y vuelve a consumir según los ítems nuevos.
 * Devuelve snapshots listos para insertar (puede partir un ítem en varias líneas si FIFO cruza bonos).
 */
export async function aplicarBonosEnPedido(
  tx: AppDatabase,
  clienteId: string,
  pedidoId: string,
  items: ItemPedidoInput[],
  tasarDevolucion: (
    item: ItemPedidoInput,
    bonoId: string,
  ) => Pick<
    ItemSnapshotBono,
    "nombreMostrado" | "unidadMedida" | "precioUnitarioCentavos"
  >,
): Promise<ItemSnapshotBono[]> {
  await restaurarBonosDePedido(tx, pedidoId);
  const bonos = await lockBonosCliente(tx, clienteId);

  const snapshots: ItemSnapshotBono[] = [];
  const devoluciones = items.filter((i) => i.esDevolucion);

  for (const item of devoluciones) {
    const asignaciones = consumirFifo(
      bonos,
      item.productoId,
      item.cantidad,
      item.bonoId,
    );
    for (const asig of asignaciones) {
      await aplicarCantidad(tx, asig.bonoId, asig.cantidad);
      const bono = bonos.find((b) => b.id === asig.bonoId)!;
      bono.cantidadAplicada += asig.cantidad;
      const tasa = tasarDevolucion(
        { ...item, cantidad: asig.cantidad },
        asig.bonoId,
      );
      snapshots.push({
        productoId: item.productoId,
        cantidad: asig.cantidad,
        esDevolucion: true,
        bonoId: asig.bonoId,
        ...tasa,
      });
    }
  }

  return snapshots;
}

export function claveItem(productoId: string, esDevolucion: boolean): string {
  return `${productoId}:${esDevolucion ? "1" : "0"}`;
}
