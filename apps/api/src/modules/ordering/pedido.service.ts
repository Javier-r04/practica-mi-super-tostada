import { Inject, Injectable } from "@nestjs/common";
import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import {
  auditLog,
  cliente,
  clienteProducto,
  pedido,
  pedidoItem,
  producto,
  usuario,
} from "@misupertostada/db";
import {
  MENSAJE_PRECIO_AUSENTE,
  anularPedidoRequestSchema,
  confirmarPedidoRequestSchema,
  crearPedidoManualRequestSchema,
  editarItemsPedidoRequestSchema,
  editarNotasPedidoRequestSchema,
  instanteAIso,
  listarPedidosQuerySchema,
  pedidoBandejaSchema,
  pedidoDetalleSchema,
  portalPedidoSchema,
  textoConfirmacionPedido,
  totalPedidoCentavos,
  type PedidoBandeja,
  type PedidoDetalle,
  type PedidoSseEvent,
  type PortalPedido,
  type BusinessCalendar,
} from "@misupertostada/shared";
import { DRIZZLE } from "../shared/tokens";
import type { AppDatabase } from "../shared/database.module";
import { AuditWriter } from "../shared/audit.writer";
import { OutboxWriter } from "../shared/outbox.writer";
import { BusinessCalendarService } from "../shared/calendar.service";
import { DomainException } from "../shared/domain.exception";
import { parseBody } from "../shared/zod-body";
import { esViolacionUnica } from "../shared/pg-error";
import type { Actor } from "../identity/actor";
import type { ClientePortal } from "./portal-token.service";
import { PedidoEvents } from "./pedido-events";
import {
  congelarSnapshots,
  diaCerrado,
  exigirAnulable,
  exigirCaptura,
  exigirConfirmado,
  horarioDe,
  ventanaCerrada,
  type ItemSnapshot,
} from "./pedido-reglas";
import {
  bloquearDiaOperacion,
  leerEstadoDia,
} from "../shared/dia-operacion";

export type PortalMeta = { ip: string | null; userAgent: string | null };

type ClienteRef = { id: string; organizacionId: string };

@Injectable()
export class PedidoService {
  constructor(
    @Inject(DRIZZLE) private readonly db: AppDatabase,
    private readonly audit: AuditWriter,
    private readonly outbox: OutboxWriter,
    private readonly calendar: BusinessCalendarService,
    private readonly events: PedidoEvents,
  ) {}

  async upsertPortal(
    clienteRow: ClientePortal,
    body: unknown,
    meta: PortalMeta,
  ): Promise<PortalPedido> {
    const input = parseBody(confirmarPedidoRequestSchema, body);
    const cal = await this.calendar.load();
    const now = this.calendar.now();
    const fechaOperacion = cal.getFechaOperacion(now);
    this.exigirVentanaPortal(cal, now);
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
        const resultado = await this.db.transaction(async (tx) => {
          await this.exigirDiaNoCerrado(
            tx,
            clienteRow.organizacionId,
            fechaOperacion,
          );
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
          const congelados = congelarSnapshots(snapshots, itemsAntes);

          const esEdicion = Boolean(existente);
          const pedidoId = existente
            ? existente.id
            : await this.insertarPedido(tx, clienteRow, fechaOperacion, {
                origen: "PORTAL",
              });

          if (existente) {
            await tx
              .delete(pedidoItem)
              .where(eq(pedidoItem.pedidoId, existente.id));
          }

          await this.escribirItems(tx, pedidoId, congelados);

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

          return {
            presentado: await this.presentar(
              pedidoId,
              horarioDe(clienteRow),
              tx,
            ),
            tipo: esEdicion
              ? ("pedido.editado" as const)
              : ("pedido.creado" as const),
            pedidoId,
          };
        });
        this.emitir(clienteRow.organizacionId, {
          tipo: resultado.tipo,
          pedidoId: resultado.pedidoId,
          fechaOperacion,
        });
        return resultado.presentado;
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

  async listar(actor: Actor, query: unknown): Promise<PedidoBandeja[]> {
    const input = parseBody(listarPedidosQuerySchema, query);
    /** Historial: cliente + flag, sin fecha → últimos pedidos de ese restaurante. */
    const historialCliente =
      Boolean(input.clienteId) && !input.fechaOperacion && input.historial === true;
    const filtros = [eq(pedido.organizacionId, actor.organizacionId)];
    if (input.fechaOperacion) {
      filtros.push(eq(pedido.fechaOperacion, input.fechaOperacion));
    } else if (!historialCliente) {
      const fechaOperacion = await this.fechaCapturaPanel(actor.organizacionId);
      filtros.push(eq(pedido.fechaOperacion, fechaOperacion));
    }
    if (input.clienteId) filtros.push(eq(pedido.clienteId, input.clienteId));
    if (input.estado) filtros.push(eq(pedido.estado, input.estado));

    const base = this.db
      .select({
        id: pedido.id,
        correlativo: pedido.correlativo,
        fechaOperacion: pedido.fechaOperacion,
        clienteId: pedido.clienteId,
        clienteNombre: cliente.nombre,
        estado: pedido.estado,
        origen: pedido.origen,
        capturadoPor: pedido.capturadoPor,
        capturadoAt: pedido.createdAt,
        notasAdmin: pedido.notasAdmin,
      })
      .from(pedido)
      .innerJoin(cliente, eq(cliente.id, pedido.clienteId))
      .where(and(...filtros));

    const rows = historialCliente
      ? await base
          .orderBy(desc(pedido.fechaOperacion), desc(pedido.correlativo))
          .limit(80)
      : await base.orderBy(desc(pedido.correlativo));

    const ids = rows.map((r) => r.id);
    const totales = new Map<string, number>();
    if (ids.length > 0) {
      const items = await this.db
        .select()
        .from(pedidoItem)
        .where(inArray(pedidoItem.pedidoId, ids));
      for (const item of items) {
        const prev = totales.get(item.pedidoId) ?? 0;
        totales.set(
          item.pedidoId,
          prev + item.cantidadPedida * item.precioUnitarioCentavos,
        );
      }
    }

    return rows.map((row) =>
      pedidoBandejaSchema.parse({
        id: row.id,
        correlativo: row.correlativo,
        fechaOperacion: row.fechaOperacion,
        clienteId: row.clienteId,
        clienteNombre: row.clienteNombre,
        estado: row.estado,
        origen: row.origen,
        totalCentavos: totales.get(row.id) ?? 0,
        capturadoPor: row.capturadoPor ?? null,
        capturadoAt: instanteAIso(row.capturadoAt),
        notasAdmin: row.notasAdmin ?? null,
      }),
    );
  }

  async obtener(id: string, actor: Actor): Promise<PedidoDetalle> {
    return this.presentarPanel(id, actor.organizacionId);
  }

  async crearManual(body: unknown, actor: Actor): Promise<PedidoDetalle> {
    exigirCaptura(actor);
    const input = parseBody(crearPedidoManualRequestSchema, body);
    const fechaOperacion = await this.fechaCapturaPanel(actor.organizacionId);
    const clienteRow = await this.clienteDe(
      input.clienteId,
      actor.organizacionId,
    );
    const snapshots = await this.tasarItems(clienteRow, input.items, []);
    const notasAdmin = input.notasAdmin?.trim() || null;

    for (let intento = 0; intento < 5; intento++) {
      try {
        const pedidoId = await this.db.transaction(async (tx) => {
          await this.exigirDiaNoCerrado(
            tx,
            actor.organizacionId,
            fechaOperacion,
          );
          await tx
            .select({ id: cliente.id })
            .from(cliente)
            .where(eq(cliente.id, clienteRow.id))
            .for("update");
          const id = await this.insertarPedido(tx, clienteRow, fechaOperacion, {
            origen: "MANUAL",
            capturadoPor: actor.usuarioId,
            notasAdmin,
          });
          await this.escribirItems(tx, id, snapshots);
          await this.outbox.insert(
            {
              tipo: "PedidoConfirmado",
              destinatarioId: clienteRow.id,
              fechaOperacion,
              payload: {
                pedidoId: id,
                clienteId: clienteRow.id,
                fechaOperacion,
              },
            },
            tx,
          );
          await this.audit.insert(
            {
              actorTipo: "usuario",
              actorId: actor.usuarioId,
              accion: "pedidos.capturar",
              entidad: "pedido",
              entidadId: id,
              antes: null,
              despues: { items: snapshots, notasAdmin, origen: "MANUAL" },
              ip: actor.ip,
              userAgent: actor.userAgent,
            },
            tx,
          );
          return id;
        });
        this.emitir(actor.organizacionId, {
          tipo: "pedido.creado",
          pedidoId,
          fechaOperacion,
        });
        return this.presentarPanel(pedidoId, actor.organizacionId);
      } catch (err) {
        if (!esViolacionUnica(err) || intento === 4) throw err;
      }
    }
    throw new DomainException("VALIDACION", "No se pudo crear el pedido", 500);
  }

  async editarNotas(
    id: string,
    body: unknown,
    actor: Actor,
  ): Promise<PedidoDetalle> {
    exigirCaptura(actor);
    const input = parseBody(editarNotasPedidoRequestSchema, body);
    const row = await this.pedidoDe(id, actor.organizacionId);
    exigirConfirmado(row.estado);
    const notasAdmin = input.notasAdmin.trim();
    await this.db.transaction(async (tx) => {
      await this.exigirDiaNoCerrado(
        tx,
        actor.organizacionId,
        row.fechaOperacion,
      );
      await tx
        .update(pedido)
        .set({ notasAdmin })
        .where(eq(pedido.id, row.id));
      await this.audit.insert(
        {
          actorTipo: "usuario",
          actorId: actor.usuarioId,
          accion: "pedidos.notas",
          entidad: "pedido",
          entidadId: row.id,
          antes: { notasAdmin: row.notasAdmin },
          despues: { notasAdmin },
          ip: actor.ip,
          userAgent: actor.userAgent,
        },
        tx,
      );
    });
    this.emitir(actor.organizacionId, {
      tipo: "pedido.editado",
      pedidoId: row.id,
      fechaOperacion: row.fechaOperacion,
    });
    return this.presentarPanel(row.id, actor.organizacionId);
  }

  async editarItems(
    id: string,
    body: unknown,
    actor: Actor,
  ): Promise<PedidoDetalle> {
    exigirCaptura(actor);
    const input = parseBody(editarItemsPedidoRequestSchema, body);
    const row = await this.pedidoDe(id, actor.organizacionId);
    exigirConfirmado(row.estado);
    const itemsPrevios = await this.itemsDe(row.id, this.db);
    const snapshots = await this.tasarItems(
      { id: row.clienteId, organizacionId: row.organizacionId },
      input.items,
      itemsPrevios,
    );

    await this.db.transaction(async (tx) => {
      await this.exigirDiaNoCerrado(
        tx,
        actor.organizacionId,
        row.fechaOperacion,
      );
      const itemsAntes = await this.itemsDe(row.id, tx);
      const congelados = congelarSnapshots(snapshots, itemsAntes);
      await tx.delete(pedidoItem).where(eq(pedidoItem.pedidoId, row.id));
      await this.escribirItems(tx, row.id, congelados);
      await this.audit.insert(
        {
          actorTipo: "usuario",
          actorId: actor.usuarioId,
          accion: "pedidos.editar_items",
          entidad: "pedido",
          entidadId: row.id,
          antes: { items: itemsAntes },
          despues: { items: congelados },
          ip: actor.ip,
          userAgent: actor.userAgent,
        },
        tx,
      );
    });
    this.emitir(actor.organizacionId, {
      tipo: "pedido.editado",
      pedidoId: row.id,
      fechaOperacion: row.fechaOperacion,
    });
    return this.presentarPanel(row.id, actor.organizacionId);
  }

  async anular(id: string, body: unknown, actor: Actor): Promise<PedidoDetalle> {
    exigirCaptura(actor);
    const input = parseBody(anularPedidoRequestSchema, body);
    const row = await this.pedidoDe(id, actor.organizacionId);
    exigirAnulable(row.estado);
    const anuladoAt = this.calendar.now();
    await this.db.transaction(async (tx) => {
      await this.exigirDiaNoCerrado(
        tx,
        actor.organizacionId,
        row.fechaOperacion,
      );
      await tx
        .update(pedido)
        .set({
          estado: "ANULADO",
          anuladoAt,
          motivoAnulacion: input.motivo,
        })
        .where(eq(pedido.id, row.id));
      await this.audit.insert(
        {
          actorTipo: "usuario",
          actorId: actor.usuarioId,
          accion: "pedidos.anular",
          entidad: "pedido",
          entidadId: row.id,
          antes: { estado: row.estado, anuladoAt: null },
          despues: {
            estado: "ANULADO",
            motivo: input.motivo,
            anuladoAt: instanteAIso(anuladoAt),
          },
          ip: actor.ip,
          userAgent: actor.userAgent,
        },
        tx,
      );
    });
    this.emitir(actor.organizacionId, {
      tipo: "pedido.anulado",
      pedidoId: row.id,
      fechaOperacion: row.fechaOperacion,
    });
    return this.presentarPanel(row.id, actor.organizacionId);
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
      subtotalCentavos: item.cantidadPedida * item.precioUnitarioCentavos,
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

  private async presentarPanel(
    pedidoId: string,
    organizacionId: string,
  ): Promise<PedidoDetalle> {
    const row = await this.pedidoDe(pedidoId, organizacionId);
    const [cli] = await this.db
      .select()
      .from(cliente)
      .where(eq(cliente.id, row.clienteId))
      .limit(1);
    if (!cli) {
      throw new DomainException("NO_ENCONTRADO", "Cliente no encontrado", 404);
    }
    const cal = await this.calendar.load();
    const lineas = await this.db
      .select({
        item: pedidoItem,
        puntoCarga: producto.puntoCarga,
        notaProduccion: clienteProducto.notaProduccion,
      })
      .from(pedidoItem)
      .innerJoin(producto, eq(producto.id, pedidoItem.productoId))
      .leftJoin(
        clienteProducto,
        and(
          eq(clienteProducto.clienteId, row.clienteId),
          eq(clienteProducto.productoId, pedidoItem.productoId),
        ),
      )
      .where(eq(pedidoItem.pedidoId, pedidoId));

    const items = lineas.map((linea) => ({
      productoId: linea.item.productoId,
      cantidad: linea.item.cantidadPedida,
      nombreMostrado: linea.item.nombreMostrado,
      unidadMedida: linea.item.unidadMedida,
      precioUnitarioCentavos: linea.item.precioUnitarioCentavos,
      subtotalCentavos:
        linea.item.cantidadPedida * linea.item.precioUnitarioCentavos,
      puntoCarga: cal.puntoCargaEfectivo(
        linea.puntoCarga,
        row.fechaOperacion,
      ),
      notaProduccion: linea.notaProduccion ?? null,
    }));
    const totalCentavos = totalPedidoCentavos(items);

    const logs = await this.db
      .select()
      .from(auditLog)
      .where(
        and(eq(auditLog.entidad, "pedido"), eq(auditLog.entidadId, pedidoId)),
      )
      .orderBy(desc(auditLog.createdAt))
      .limit(30);

    const usuarioIds = [
      ...new Set(
        [
          row.capturadoPor,
          ...logs
            .filter((l) => l.actorTipo === "usuario")
            .map((l) => l.actorId),
        ].filter((id): id is string => Boolean(id)),
      ),
    ];
    const nombres = new Map<string, string>();
    if (usuarioIds.length > 0) {
      const users = await this.db
        .select({ id: usuario.id, username: usuario.username })
        .from(usuario)
        .where(inArray(usuario.id, usuarioIds));
      for (const u of users) nombres.set(u.id, u.username);
    }

    const capturadoPorNombre = row.capturadoPor
      ? (nombres.get(row.capturadoPor) ?? null)
      : null;

    return pedidoDetalleSchema.parse({
      id: row.id,
      correlativo: row.correlativo,
      fechaOperacion: row.fechaOperacion,
      clienteId: cli.id,
      clienteNombre: cli.nombre,
      clienteContacto: cli.contacto ?? null,
      clienteTelefonoWa: cli.telefonoWa ?? null,
      horarioEntregaFijo: horarioDe(cli),
      notasPermanentes: cli.notasPermanentes ?? null,
      estado: row.estado,
      origen: row.origen,
      notasAdmin: row.notasAdmin ?? null,
      capturadoPor: row.capturadoPor ?? null,
      capturadoPorNombre,
      capturadoAt: instanteAIso(row.createdAt),
      anuladoAt: row.anuladoAt ? instanteAIso(row.anuladoAt) : null,
      motivoAnulacion: row.motivoAnulacion ?? null,
      items,
      totalCentavos,
      historial: logs.map((l) => ({
        accion: l.accion,
        actorTipo: l.actorTipo,
        actorNombre:
          l.actorTipo === "usuario"
            ? (nombres.get(l.actorId) ?? null)
            : l.actorTipo === "cliente"
              ? cli.nombre
              : null,
        createdAt: instanteAIso(l.createdAt),
        antes: l.antes ?? null,
        despues: l.despues ?? null,
      })),
    });
  }

  private async tasarItems(
    clienteRow: ClienteRef,
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

  private async fechaCapturaPanel(organizacionId: string): Promise<string> {
    const cal = await this.calendar.load();
    const now = this.calendar.now();
    const fechaOperacion = cal.getFechaOperacion(now);
    if (cal.isVentanaAbierta(now)) return fechaOperacion;
    const reciente = cal.getFechaOperacionDeVentanaReciente(now);
    const { diaEstado } = await leerEstadoDia(this.db, organizacionId, reciente);
    return diaEstado === "REABIERTO" ? reciente : fechaOperacion;
  }

  private async exigirDiaNoCerrado(
    tx: AppDatabase,
    organizacionId: string,
    fechaOperacion: string,
  ): Promise<void> {
    await bloquearDiaOperacion(tx, organizacionId, fechaOperacion);
    const { diaEstado } = await leerEstadoDia(tx, organizacionId, fechaOperacion);
    if (diaEstado === "CERRADO") throw diaCerrado();
  }

  private exigirVentanaPortal(cal: BusinessCalendar, now: Date): void {
    if (!cal.isVentanaAbierta(now)) {
      throw ventanaCerrada(cal.getProximaApertura(now));
    }
  }

  private async insertarPedido(
    tx: AppDatabase,
    clienteRow: ClienteRef,
    fechaOperacion: string,
    opts: {
      origen: "PORTAL" | "MANUAL";
      capturadoPor?: string | null;
      notasAdmin?: string | null;
    },
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
        origen: opts.origen,
        capturadoPor: opts.capturadoPor ?? null,
        notasAdmin: opts.notasAdmin ?? null,
      })
      .returning({ id: pedido.id });
    if (!row) {
      throw new DomainException("VALIDACION", "No se pudo crear el pedido", 500);
    }
    return row.id;
  }

  private async escribirItems(
    tx: AppDatabase,
    pedidoId: string,
    items: ItemSnapshot[],
  ): Promise<void> {
    await tx.insert(pedidoItem).values(
      items.map((item) => ({
        pedidoId,
        productoId: item.productoId,
        cantidadPedida: item.cantidad,
        cantidadEntregada: item.cantidad,
        precioUnitarioCentavos: item.precioUnitarioCentavos,
        nombreMostrado: item.nombreMostrado,
        unidadMedida: item.unidadMedida,
      })),
    );
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

  private async clienteDe(
    id: string,
    organizacionId: string,
  ): Promise<typeof cliente.$inferSelect> {
    const [row] = await this.db
      .select()
      .from(cliente)
      .where(and(eq(cliente.id, id), eq(cliente.organizacionId, organizacionId)))
      .limit(1);
    if (!row) {
      throw new DomainException("NO_ENCONTRADO", "Cliente no encontrado", 404);
    }
    return row;
  }

  private async pedidoDe(id: string, organizacionId: string) {
    const [row] = await this.db
      .select()
      .from(pedido)
      .where(
        and(eq(pedido.id, id), eq(pedido.organizacionId, organizacionId)),
      )
      .limit(1);
    if (!row) {
      throw new DomainException("NO_ENCONTRADO", "Pedido no encontrado", 404);
    }
    return row;
  }

  private emitir(
    organizacionId: string,
    evento: PedidoSseEvent,
  ): void {
    this.events.emit({ ...evento, organizacionId });
  }
}
