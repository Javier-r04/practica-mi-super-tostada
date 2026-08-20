import { Inject, Injectable } from "@nestjs/common";
import { and, eq, isNull, sql } from "drizzle-orm";
import {
  cliente,
  clienteProducto,
  pedido,
  pedidoItem,
  producto,
} from "@misupertostada/db";
import {
  MENSAJE_PRECIO_AUSENTE,
  MENSAJE_VENTANA_CERRADA,
  confirmarPedidoRequestSchema,
  fechaDeInstante,
  formatearFechaLarga,
  horaEnZona,
  portalPedidoSchema,
  textoConfirmacionPedido,
  totalPedidoCentavos,
  type PortalPedido,
} from "@misupertostada/shared";
import { DRIZZLE } from "../shared/tokens";
import type { AppDatabase } from "../shared/database.module";
import { AuditWriter } from "../shared/audit.writer";
import { OutboxWriter } from "../shared/outbox.writer";
import { BusinessCalendarService } from "../shared/calendar.service";
import { DomainException } from "../shared/domain.exception";
import { parseBody } from "../shared/zod-body";
import { esViolacionUnica } from "../shared/pg-error";
import type { ClientePortal } from "./portal-token.service";

export type PortalMeta = { ip: string | null; userAgent: string | null };

type ItemSnapshot = {
  productoId: string;
  cantidad: number;
  nombreMostrado: string;
  unidadMedida: "LIBRA" | "BOLSA" | "UNIDAD";
  precioUnitarioCentavos: number;
};

@Injectable()
export class PedidoService {
  constructor(
    @Inject(DRIZZLE) private readonly db: AppDatabase,
    private readonly audit: AuditWriter,
    private readonly outbox: OutboxWriter,
    private readonly calendar: BusinessCalendarService,
  ) {}

  async upsertPortal(
    clienteRow: ClientePortal,
    body: unknown,
    meta: PortalMeta,
  ): Promise<PortalPedido> {
    const input = parseBody(confirmarPedidoRequestSchema, body);
    const cal = await this.calendar.load();
    const now = this.calendar.now();
    if (!cal.isVentanaAbierta(now)) {
      throw ventanaCerrada(cal.getProximaApertura(now));
    }
    const fechaOperacion = cal.getFechaOperacion(now);
    const [abierto] = await this.db
      .select()
      .from(pedido)
      .where(
        and(
          eq(pedido.clienteId, clienteRow.id),
          eq(pedido.fechaOperacion, fechaOperacion),
          eq(pedido.origen, "PORTAL"),
          isNull(pedido.anuladoAt),
        ),
      )
      .limit(1);
    const itemsPrevios = abierto
      ? await this.itemsDe(abierto.id, this.db)
      : [];
    const snapshots = await this.tasarItems(
      clienteRow,
      input.items,
      itemsPrevios,
    );

    for (let intento = 0; intento < 5; intento++) {
      try {
        return await this.db.transaction(async (tx) => {
          await tx
            .select({ id: cliente.id })
            .from(cliente)
            .where(eq(cliente.id, clienteRow.id))
            .for("update");

          const [existente] = await tx
            .select()
            .from(pedido)
            .where(
              and(
                eq(pedido.clienteId, clienteRow.id),
                eq(pedido.fechaOperacion, fechaOperacion),
                eq(pedido.origen, "PORTAL"),
                isNull(pedido.anuladoAt),
              ),
            )
            .limit(1)
            .for("update");

          const itemsAntes = existente
            ? await this.itemsDe(existente.id, tx)
            : [];
          const congelados = snapshots.map((item) => {
            const previo = itemsAntes.find(
              (p) => p.productoId === item.productoId,
            );
            return previo
              ? {
                  ...item,
                  nombreMostrado: previo.nombreMostrado,
                  unidadMedida: previo.unidadMedida,
                  precioUnitarioCentavos: previo.precioUnitarioCentavos,
                }
              : item;
          });

          const esEdicion = Boolean(existente);
          const pedidoId = existente
            ? existente.id
            : await this.insertarPedido(tx, clienteRow, fechaOperacion);

          if (existente) {
            await tx
              .delete(pedidoItem)
              .where(eq(pedidoItem.pedidoId, existente.id));
          }

          await tx.insert(pedidoItem).values(
            congelados.map((item) => ({
              pedidoId,
              productoId: item.productoId,
              cantidadPedida: item.cantidad,
              cantidadEntregada: item.cantidad,
              precioUnitarioCentavos: item.precioUnitarioCentavos,
              nombreMostrado: item.nombreMostrado,
              unidadMedida: item.unidadMedida,
            })),
          );

          if (!esEdicion) {
            await this.outbox.insert(
              {
                tipo: "PedidoConfirmado",
                destinatarioId: clienteRow.id,
                fechaOperacion,
                payload: {
                  pedidoId,
                  clienteId: clienteRow.id,
                  fechaOperacion,
                },
              },
              tx,
            );
          }

          await this.audit.insert(
            {
              actorTipo: "cliente",
              actorId: clienteRow.id,
              accion: esEdicion ? "portal.editar" : "portal.confirmar",
              entidad: "pedido",
              entidadId: pedidoId,
              antes: esEdicion ? { items: itemsAntes } : null,
              despues: { items: congelados },
              ip: meta.ip,
              userAgent: meta.userAgent,
            },
            tx,
          );

          return this.presentar(pedidoId, horarioDe(clienteRow), tx);
        });
      } catch (err) {
        if (!esViolacionUnica(err) || intento === 4) throw err;
      }
    }
    throw new DomainException("VALIDACION", "No se pudo crear el pedido", 500);
  }

  async portalAbierto(
    clienteId: string,
    fechaOperacion: string,
    horarioEntregaFijo: string | null,
  ): Promise<PortalPedido | null> {
    const [row] = await this.db
      .select()
      .from(pedido)
      .where(
        and(
          eq(pedido.clienteId, clienteId),
          eq(pedido.fechaOperacion, fechaOperacion),
          eq(pedido.origen, "PORTAL"),
          isNull(pedido.anuladoAt),
        ),
      )
      .limit(1);
    if (!row) return null;
    return this.presentar(row.id, horarioEntregaFijo);
  }

  async presentar(
    pedidoId: string,
    horarioEntregaFijo: string | null,
    tx: AppDatabase = this.db,
  ): Promise<PortalPedido> {
    const [row] = await tx
      .select()
      .from(pedido)
      .where(eq(pedido.id, pedidoId))
      .limit(1);
    if (!row) {
      throw new DomainException("NO_ENCONTRADO", "Pedido no encontrado", 404);
    }
    const items = await tx
      .select()
      .from(pedidoItem)
      .where(eq(pedidoItem.pedidoId, pedidoId));
    const mapped = items.map((item) => ({
      productoId: item.productoId,
      cantidad: item.cantidadPedida,
      nombreMostrado: item.nombreMostrado,
      unidadMedida: item.unidadMedida,
      precioUnitarioCentavos: item.precioUnitarioCentavos,
      subtotalCentavos:
        item.cantidadPedida * item.precioUnitarioCentavos,
    }));
    const totalCentavos = totalPedidoCentavos(mapped);
    return portalPedidoSchema.parse({
      id: row.id,
      correlativo: row.correlativo,
      estado: row.estado,
      fechaOperacion: row.fechaOperacion,
      origen: "PORTAL",
      items: mapped,
      totalCentavos,
      textoConfirmacion: textoConfirmacionPedido({
        correlativo: row.correlativo,
        fechaOperacion: row.fechaOperacion,
        totalCentavos,
        horarioEntregaFijo,
      }),
    });
  }

  private async tasarItems(
    clienteRow: ClientePortal,
    items: { productoId: string; cantidad: number }[],
    previos: ItemSnapshot[],
  ): Promise<ItemSnapshot[]> {
    const ids = items.map((i) => i.productoId);
    const unicos = new Set(ids);
    if (unicos.size !== ids.length) {
      throw new DomainException(
        "VALIDACION",
        "Hay productos repetidos en el pedido",
        400,
      );
    }

    const productos = await this.db
      .select()
      .from(producto)
      .where(
        and(
          eq(producto.organizacionId, clienteRow.organizacionId),
          eq(producto.activo, true),
        ),
      );
    const porId = new Map(productos.map((p) => [p.id, p]));

    const ligas = await this.db
      .select()
      .from(clienteProducto)
      .where(eq(clienteProducto.clienteId, clienteRow.id));
    const ligaPorProducto = new Map(ligas.map((l) => [l.productoId, l]));
    const previoPorProducto = new Map(previos.map((i) => [i.productoId, i]));

    return items.map((item) => {
      const ya = previoPorProducto.get(item.productoId);
      if (ya) {
        return { ...ya, cantidad: item.cantidad };
      }
      const prod = porId.get(item.productoId);
      const liga = ligaPorProducto.get(item.productoId);
      if (!prod || !liga || liga.precioCentavos == null) {
        throw new DomainException(
          "PRECIO_AUSENTE",
          MENSAJE_PRECIO_AUSENTE,
          409,
        );
      }
      const alias = liga.alias?.trim();
      return {
        productoId: item.productoId,
        cantidad: item.cantidad,
        nombreMostrado: alias || prod.nombreCanonico,
        unidadMedida: prod.unidadMedida,
        precioUnitarioCentavos: liga.precioCentavos,
      };
    });
  }

  private async insertarPedido(
    tx: AppDatabase,
    clienteRow: ClientePortal,
    fechaOperacion: string,
  ): Promise<string> {
    const [agg] = await tx
      .select({
        max: sql<number>`coalesce(max(${pedido.correlativo}), 0)::int`,
      })
      .from(pedido)
      .where(eq(pedido.organizacionId, clienteRow.organizacionId));
    const correlativo = Number(agg?.max ?? 0) + 1;
    const [row] = await tx
      .insert(pedido)
      .values({
        organizacionId: clienteRow.organizacionId,
        correlativo,
        fechaOperacion,
        clienteId: clienteRow.id,
        estado: "CONFIRMADO",
        origen: "PORTAL",
      })
      .returning({ id: pedido.id });
    if (!row) {
      throw new DomainException("VALIDACION", "No se pudo crear el pedido", 500);
    }
    return row.id;
  }

  private async itemsDe(
    pedidoId: string,
    tx: AppDatabase,
  ): Promise<ItemSnapshot[]> {
    const rows = await tx
      .select()
      .from(pedidoItem)
      .where(eq(pedidoItem.pedidoId, pedidoId));
    return rows.map((item) => ({
      productoId: item.productoId,
      cantidad: item.cantidadPedida,
      nombreMostrado: item.nombreMostrado,
      unidadMedida: item.unidadMedida,
      precioUnitarioCentavos: item.precioUnitarioCentavos,
    }));
  }
}

export function horarioDe(clienteRow: ClientePortal): string | null {
  const raw = clienteRow.horarioEntregaFijo;
  if (!raw) return null;
  return raw.slice(0, 5);
}

function ventanaCerrada(proxima: Date): DomainException {
  const fechaLarga = formatearFechaLarga(fechaDeInstante(proxima));
  const hora = horaEnZona(proxima);
  return new DomainException(
    "VENTANA_CERRADA",
    `${MENSAJE_VENTANA_CERRADA} Abre el ${fechaLarga} a las ${hora}.`,
    409,
  );
}
