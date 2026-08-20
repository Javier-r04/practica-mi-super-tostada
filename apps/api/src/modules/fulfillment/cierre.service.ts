import { Inject, Injectable } from "@nestjs/common";
import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import {
  cliente,
  diaOperacion,
  hojaProduccion,
  organizacion,
  outbox,
  pedido,
  pedidoItem,
  producto,
} from "@misupertostada/db";
import {
  MENSAJE_DIA_CERRADO,
  MENSAJE_DIA_NO_CERRADO,
  MENSAJE_HOJA_NO_MATERIALIZADA,
  TIPO_EVENTO_VENTANA_CERRADA,
  cerrarDiaRequestSchema,
  cierreResultadoSchema,
  operacionResumenSchema,
  reabrirDiaRequestSchema,
  reaperturaResultadoSchema,
  tienePermiso,
  type CierreResultado,
  type OperacionResumen,
  type ReaperturaResultado,
} from "@misupertostada/shared";
import { DRIZZLE } from "../shared/tokens";
import type { AppDatabase } from "../shared/database.module";
import { AuditWriter } from "../shared/audit.writer";
import { OutboxWriter } from "../shared/outbox.writer";
import { DomainEventWriter } from "../shared/domain-event.writer";
import { BusinessCalendarService } from "../shared/calendar.service";
import { DomainException } from "../shared/domain.exception";
import { parseBody } from "../shared/zod-body";
import { bloquearDiaOperacion, leerEstadoDia } from "../shared/dia-operacion";
import { PedidoEvents } from "../shared/panel-events";
import type { Actor } from "../identity/actor";
import { HojaService } from "./hoja.service";

@Injectable()
export class CierreService {
  constructor(
    @Inject(DRIZZLE) private readonly db: AppDatabase,
    private readonly audit: AuditWriter,
    private readonly outbox: OutboxWriter,
    private readonly events: DomainEventWriter,
    private readonly calendar: BusinessCalendarService,
    private readonly hoja: HojaService,
    private readonly bus: PedidoEvents,
  ) {}

  async resumen(
    actor: Actor,
    fechaOperacion?: string,
  ): Promise<OperacionResumen> {
    const fecha = fechaOperacion ?? (await this.fechaDefault());
    const { diaEstado, versionHoja, motivoReapertura } = await leerEstadoDia(
      this.db,
      actor.organizacionId,
      fecha,
    );

    const pedidos = await this.db
      .select({
        origen: pedido.origen,
        estado: pedido.estado,
      })
      .from(pedido)
      .where(
        and(
          eq(pedido.organizacionId, actor.organizacionId),
          eq(pedido.fechaOperacion, fecha),
          isNull(pedido.anuladoAt),
        ),
      );

    const vivos = pedidos.filter((p) => p.estado !== "ANULADO");
    const pedidosPortal = vivos.filter((p) => p.origen === "PORTAL").length;
    const pedidosManual = vivos.filter((p) => p.origen === "MANUAL").length;
    const confirmados = vivos.filter(
      (p) => p.estado === "CONFIRMADO" || p.estado === "EN_PRODUCCION",
    ).length;
    const borradores = vivos.filter((p) => p.estado === "BORRADOR").length;

    const [libras] = await this.db
      .select({
        total: sql<number>`coalesce(sum(${pedidoItem.cantidadPedida}), 0)`,
      })
      .from(pedidoItem)
      .innerJoin(pedido, eq(pedido.id, pedidoItem.pedidoId))
      .innerJoin(producto, eq(producto.id, pedidoItem.productoId))
      .where(
        and(
          eq(pedido.organizacionId, actor.organizacionId),
          eq(pedido.fechaOperacion, fecha),
          isNull(pedido.anuladoAt),
          sql`${pedido.estado} <> 'ANULADO'`,
          eq(producto.familia, "TORTILLA"),
          eq(producto.unidadMedida, "LIBRA"),
        ),
      );

    const destinos = await this.destinatariosOutbox(actor.organizacionId);
    const outboxRows =
      destinos.length === 0
        ? []
        : await this.db
            .select({ estado: outbox.estado })
            .from(outbox)
            .where(
              and(
                eq(outbox.fechaOperacion, fecha),
                inArray(outbox.destinatarioId, destinos),
              ),
            );

    const [consolidado] = await this.db
      .select({ id: outbox.id })
      .from(outbox)
      .where(
        and(
          eq(outbox.tipo, TIPO_EVENTO_VENTANA_CERRADA),
          eq(outbox.destinatarioId, actor.organizacionId),
          eq(outbox.fechaOperacion, fecha),
        ),
      )
      .limit(1);

    return operacionResumenSchema.parse({
      fechaOperacion: fecha,
      diaEstado,
      versionHoja,
      pedidosPortal,
      pedidosManual,
      librasTortilla: Number(libras?.total ?? 0),
      outboxPendientes: outboxRows.filter((r) => r.estado === "PENDIENTE").length,
      outboxEnviados: outboxRows.filter((r) => r.estado === "ENVIADO").length,
      outboxError: outboxRows.filter((r) => r.estado === "ERROR").length,
      previewCierre: {
        confirmados,
        borradores,
        mensajesAEncolar: consolidado ? 0 : 1,
      },
      motivoReapertura,
    });
  }

  async cerrar(body: unknown, actor: Actor): Promise<CierreResultado> {
    if (!tienePermiso(actor.permisos, "ventana.cerrar")) {
      throw new DomainException(
        "PERMISO_DENEGADO",
        "No tiene permiso para esta acción",
        403,
      );
    }
    const input = parseBody(cerrarDiaRequestSchema, body ?? {});
    const fecha = input.fechaOperacion ?? (await this.fechaDefault());
    return this.ejecutarCierre({
      organizacionId: actor.organizacionId,
      fechaOperacion: fecha,
      actorTipo: "usuario",
      actorId: actor.usuarioId,
      ip: actor.ip,
      userAgent: actor.userAgent,
      skipIfReabierto: false,
    });
  }

  async reabrir(body: unknown, actor: Actor): Promise<ReaperturaResultado> {
    if (!tienePermiso(actor.permisos, "ventana.reabrir")) {
      throw new DomainException(
        "PERMISO_DENEGADO",
        "No tiene permiso para esta acción",
        403,
      );
    }
    const input = parseBody(reabrirDiaRequestSchema, body);
    const fecha = input.fechaOperacion ?? (await this.fechaDefault());

    await this.db.transaction(async (tx) => {
      await bloquearDiaOperacion(tx, actor.organizacionId, fecha);
      const [dia] = await tx
        .select()
        .from(diaOperacion)
        .where(
          and(
            eq(diaOperacion.organizacionId, actor.organizacionId),
            eq(diaOperacion.fechaOperacion, fecha),
          ),
        )
        .limit(1)
        .for("update");

      if (!dia || dia.estado !== "CERRADO") {
        throw new DomainException(
          "DIA_NO_CERRADO",
          MENSAJE_DIA_NO_CERRADO,
          409,
        );
      }

      const now = this.calendar.now();
      await tx
        .update(diaOperacion)
        .set({
          estado: "REABIERTO",
          motivoReapertura: input.motivo,
          reabiertoAt: now,
          reabiertoPor: actor.usuarioId,
        })
        .where(eq(diaOperacion.id, dia.id));

      await tx
        .update(pedido)
        .set({ estado: "CONFIRMADO" })
        .where(
          and(
            eq(pedido.organizacionId, actor.organizacionId),
            eq(pedido.fechaOperacion, fecha),
            eq(pedido.estado, "EN_PRODUCCION"),
          ),
        );

      await this.audit.insert(
        {
          actorTipo: "usuario",
          actorId: actor.usuarioId,
          accion: "ventana.reabrir",
          entidad: "dia_operacion",
          entidadId: dia.id,
          antes: { estado: "CERRADO" },
          despues: { estado: "REABIERTO", motivo: input.motivo, fechaOperacion: fecha },
          ip: actor.ip,
          userAgent: actor.userAgent,
        },
        tx,
      );
    });

    this.bus.emit({
      organizacionId: actor.organizacionId,
      tipo: "dia.reabierto",
      fechaOperacion: fecha,
    });

    return reaperturaResultadoSchema.parse({
      fechaOperacion: fecha,
      diaEstado: "REABIERTO",
      motivo: input.motivo,
    });
  }

  async cerrarSiToca(organizacionId?: string): Promise<void> {
    const cal = await this.calendar.load();
    const now = this.calendar.now();
    if (cal.isVentanaAbierta(now)) return;
    const fecha = cal.getFechaOperacionDeVentanaReciente(now);
    const orgs = organizacionId
      ? [{ id: organizacionId }]
      : await this.db
          .select({ id: organizacion.id })
          .from(organizacion)
          .where(eq(organizacion.activo, true));

    for (const org of orgs) {
      await this.ejecutarCierre({
        organizacionId: org.id,
        fechaOperacion: fecha,
        actorTipo: "sistema",
        actorId: "cron",
        skipIfReabierto: true,
      });
    }
  }

  private async fechaDefault(): Promise<string> {
    const cal = await this.calendar.load();
    const now = this.calendar.now();
    return cal.isVentanaAbierta(now)
      ? cal.getFechaOperacion(now)
      : cal.getFechaOperacionDeVentanaReciente(now);
  }

  private async destinatariosOutbox(organizacionId: string): Promise<string[]> {
    const clientes = await this.db
      .select({ id: cliente.id })
      .from(cliente)
      .where(eq(cliente.organizacionId, organizacionId));
    return [organizacionId, ...clientes.map((c) => c.id)];
  }

  private async ejecutarCierre(opts: {
    organizacionId: string;
    fechaOperacion: string;
    actorTipo: "usuario" | "sistema";
    actorId: string;
    ip?: string | null;
    userAgent?: string | null;
    skipIfReabierto: boolean;
  }): Promise<CierreResultado> {
    const cal = await this.calendar.load();
    let version = 1;
    let idempotente = false;

    await this.db.transaction(async (tx) => {
      await bloquearDiaOperacion(tx, opts.organizacionId, opts.fechaOperacion);
      const [dia] = await tx
        .select()
        .from(diaOperacion)
        .where(
          and(
            eq(diaOperacion.organizacionId, opts.organizacionId),
            eq(diaOperacion.fechaOperacion, opts.fechaOperacion),
          ),
        )
        .limit(1)
        .for("update");

      if (dia?.estado === "CERRADO") {
        const [hoja] = await tx
          .select({ version: hojaProduccion.version })
          .from(hojaProduccion)
          .where(
            and(
              eq(hojaProduccion.organizacionId, opts.organizacionId),
              eq(hojaProduccion.fechaOperacion, opts.fechaOperacion),
            ),
          )
          .orderBy(sql`${hojaProduccion.version} desc`)
          .limit(1);
        version = hoja?.version ?? 1;
        idempotente = true;
        return;
      }

      if (dia?.estado === "REABIERTO" && opts.skipIfReabierto) {
        idempotente = true;
        version = 1;
        return;
      }

      const [ultima] = await tx
        .select({ version: hojaProduccion.version })
        .from(hojaProduccion)
        .where(
          and(
            eq(hojaProduccion.organizacionId, opts.organizacionId),
            eq(hojaProduccion.fechaOperacion, opts.fechaOperacion),
          ),
        )
        .orderBy(sql`${hojaProduccion.version} desc`)
        .limit(1);
      version = (ultima?.version ?? 0) + 1;

      const generadoPor =
        opts.actorTipo === "usuario" ? opts.actorId : null;
      await this.hoja.materializar(
        opts.organizacionId,
        opts.fechaOperacion,
        version,
        generadoPor,
        cal,
        tx,
      );

      await tx
        .update(pedido)
        .set({ estado: "EN_PRODUCCION" })
        .where(
          and(
            eq(pedido.organizacionId, opts.organizacionId),
            eq(pedido.fechaOperacion, opts.fechaOperacion),
            eq(pedido.estado, "CONFIRMADO"),
          ),
        );

      const now = this.calendar.now();
      if (!dia) {
        await tx.insert(diaOperacion).values({
          organizacionId: opts.organizacionId,
          fechaOperacion: opts.fechaOperacion,
          estado: "CERRADO",
          cerradoAt: now,
          cerradoPor: generadoPor,
        });
      } else {
        await tx
          .update(diaOperacion)
          .set({
            estado: "CERRADO",
            cerradoAt: now,
            cerradoPor: generadoPor,
          })
          .where(eq(diaOperacion.id, dia.id));
      }

      await this.events.insert(
        TIPO_EVENTO_VENTANA_CERRADA,
        {
          organizacionId: opts.organizacionId,
          fechaOperacion: opts.fechaOperacion,
          version,
        },
        tx,
      );

      await this.outbox.insert(
        {
          tipo: TIPO_EVENTO_VENTANA_CERRADA,
          destinatarioId: opts.organizacionId,
          fechaOperacion: opts.fechaOperacion,
          payload: {
            organizacionId: opts.organizacionId,
            fechaOperacion: opts.fechaOperacion,
            version,
          },
        },
        tx,
      );

      await this.audit.insert(
        {
          actorTipo: opts.actorTipo,
          actorId: opts.actorId,
          accion: "ventana.cerrar",
          entidad: "dia_operacion",
          entidadId: `${opts.organizacionId}:${opts.fechaOperacion}`,
          antes: { estado: dia?.estado ?? "SIN_CIERRE" },
          despues: {
            estado: "CERRADO",
            version,
            fechaOperacion: opts.fechaOperacion,
          },
          ip: opts.ip,
          userAgent: opts.userAgent,
        },
        tx,
      );
    });

    if (!idempotente) {
      this.bus.emit({
        organizacionId: opts.organizacionId,
        tipo: "dia.cerrado",
        fechaOperacion: opts.fechaOperacion,
        versionHoja: version,
      });
      this.bus.emit({
        organizacionId: opts.organizacionId,
        tipo: "hoja.generada",
        fechaOperacion: opts.fechaOperacion,
        versionHoja: version,
      });
    }

    return cierreResultadoSchema.parse({
      fechaOperacion: opts.fechaOperacion,
      version,
      idempotente,
      diaEstado: "CERRADO",
    });
  }
}

export function diaCerrado(): DomainException {
  return new DomainException("DIA_CERRADO", MENSAJE_DIA_CERRADO, 409);
}

export function hojaNoMaterializada(): DomainException {
  return new DomainException(
    "HOJA_NO_MATERIALIZADA",
    MENSAJE_HOJA_NO_MATERIALIZADA,
    404,
  );
}
