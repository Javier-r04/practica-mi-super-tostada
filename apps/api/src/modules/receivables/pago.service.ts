import { Inject, Injectable } from "@nestjs/common";
import { and, asc, eq, sql } from "drizzle-orm";
import { asset, factura, pago, pedido, usuario } from "@misupertostada/db";
import {
  MENSAJE_COMPROBANTE_REQUERIDO,
  MENSAJE_PAGO_EXCEDE_SALDO,
  aplicarFifo,
  fechaDeInstante,
  pagoRegistroResultadoSchema,
  registrarPagoRequestSchema,
  tienePermiso,
  type PagoRegistroResultado,
} from "@misupertostada/shared";
import { DRIZZLE } from "../shared/tokens";
import type { AppDatabase } from "../shared/database.module";
import { AuditWriter } from "../shared/audit.writer";
import { BusinessCalendarService } from "../shared/calendar.service";
import { PedidoEvents } from "../shared/panel-events";
import { DomainException } from "../shared/domain.exception";
import { parseBody } from "../shared/zod-body";
import type { Actor } from "../identity/actor";
import { FacturaService } from "./factura.service";
import { presentarFactura } from "./factura-presentacion";

@Injectable()
export class PagoService {
  constructor(
    @Inject(DRIZZLE) private readonly db: AppDatabase,
    private readonly audit: AuditWriter,
    private readonly calendar: BusinessCalendarService,
    private readonly bus: PedidoEvents,
    private readonly facturas: FacturaService,
  ) {}

  async registrar(body: unknown, actor: Actor): Promise<PagoRegistroResultado> {
    if (!tienePermiso(actor.permisos, "cobranza.registrar_pago")) {
      throw new DomainException(
        "PERMISO_DENEGADO",
        "No tiene permiso para esta acción",
        403,
      );
    }
    const input = parseBody(registrarPagoRequestSchema, body);
    if (input.metodo === "TRANSFERENCIA" && !input.comprobanteAssetId) {
      throw new DomainException(
        "COMPROBANTE_REQUERIDO",
        MENSAJE_COMPROBANTE_REQUERIDO,
        400,
      );
    }

    const existente = await this.porIdempotencia(input.id, input.idempotencyKey);
    if (existente) {
      return this.resultadoDePagos([existente], true);
    }

    const fecha = this.fechaPago(input.fecha, actor);
    const inserted = await this.db.transaction(async (tx) => {
      const destinos = await this.facturasObjetivo(tx, actor, input);
      const { asignaciones, sobra } = aplicarFifo(
        destinos.map((d) => ({ id: d.id, saldoCentavos: d.saldo })),
        input.montoCentavos,
      );
      if (sobra > 0 || asignaciones.length === 0) {
        throw new DomainException("PAGO_EXCEDE_SALDO", MENSAJE_PAGO_EXCEDE_SALDO, 409);
      }

      if (input.comprobanteAssetId) {
        await this.exigirComprobante(tx, input.comprobanteAssetId, input.id);
      }

      const filas = [];
      for (let i = 0; i < asignaciones.length; i++) {
        const asg = asignaciones[i]!;
        const esPrimero = i === 0;
        const [row] = await tx
          .insert(pago)
          .values({
            id: esPrimero ? input.id : crypto.randomUUID(),
            facturaId: asg.facturaId,
            montoCentavos: asg.montoCentavos,
            metodo: input.metodo,
            fecha,
            comprobanteAssetId: esPrimero ? (input.comprobanteAssetId ?? null) : null,
            registradoPor: actor.usuarioId,
            idempotencyKey: esPrimero ? input.idempotencyKey : null,
          })
          .returning();
        if (!row) {
          throw new DomainException("PAGO_NO_CREADO", "No se pudo registrar el cobro", 500);
        }
        filas.push(row);
        await this.audit.insert(
          {
            actorTipo: "usuario",
            actorId: actor.usuarioId,
            accion: "cobranza.registrar_pago",
            entidad: "pago",
            entidadId: row.id,
            despues: {
              facturaId: row.facturaId,
              montoCentavos: row.montoCentavos,
              metodo: row.metodo,
              fecha: row.fecha,
            },
            ip: actor.ip,
            userAgent: actor.userAgent,
          },
          tx,
        );
      }
      await this.facturas.verificarLimite(tx, destinos[0]!.pedidoId);
      return filas;
    });

    const primera = inserted[0]!;
    const [ped] = await this.db
      .select({ fechaOperacion: pedido.fechaOperacion, clienteId: pedido.clienteId })
      .from(factura)
      .innerJoin(pedido, eq(pedido.id, factura.pedidoId))
      .where(eq(factura.id, primera.facturaId))
      .limit(1);
    this.bus.emit({
      organizacionId: actor.organizacionId,
      tipo: "pago.registrado",
      fechaOperacion: ped?.fechaOperacion ?? fecha,
      facturaId: primera.facturaId,
      clienteId: ped?.clienteId,
    });
    return this.resultadoDePagos(inserted, false);
  }

  private fechaPago(override: string | undefined, actor: Actor): string {
    if (
      override &&
      (actor.rol === "ADMIN_JEFE" || actor.rol === "ADMIN")
    ) {
      return override;
    }
    return fechaDeInstante(this.calendar.now());
  }

  private async porIdempotencia(id: string, key: string) {
    const [byKey] = await this.db
      .select()
      .from(pago)
      .where(eq(pago.idempotencyKey, key))
      .limit(1);
    if (byKey) return byKey;
    const [byId] = await this.db.select().from(pago).where(eq(pago.id, id)).limit(1);
    return byId ?? null;
  }

  private async exigirComprobante(
    tx: AppDatabase,
    assetId: string,
    pagoId: string,
  ): Promise<void> {
    const [row] = await tx
      .select()
      .from(asset)
      .where(eq(asset.id, assetId))
      .limit(1);
    if (!row || row.ownerType !== "pago" || row.ownerId !== pagoId) {
      throw new DomainException(
        "COMPROBANTE_REQUERIDO",
        MENSAJE_COMPROBANTE_REQUERIDO,
        400,
      );
    }
  }

  private async facturasObjetivo(
    tx: AppDatabase,
    actor: Actor,
    input: { facturaId?: string; clienteId?: string },
  ): Promise<Array<{ id: string; saldo: number; pedidoId: string }>> {
    const abonadoSql = sql<number>`coalesce((
      select sum(${pago.montoCentavos}) from ${pago} where ${pago.facturaId} = ${factura.id}
    ), 0)::int`;

    if (input.facturaId) {
      const [row] = await tx
        .select({
          id: factura.id,
          monto: factura.montoCentavos,
          abonado: abonadoSql,
          pedidoId: factura.pedidoId,
          org: pedido.organizacionId,
        })
        .from(factura)
        .innerJoin(pedido, eq(pedido.id, factura.pedidoId))
        .where(
          and(
            eq(factura.id, input.facturaId),
            eq(pedido.organizacionId, actor.organizacionId),
          ),
        )
        .limit(1);
      if (!row) {
        throw new DomainException("NO_ENCONTRADO", "Factura no encontrada", 404);
      }
      return [{ id: row.id, saldo: row.monto - Number(row.abonado), pedidoId: row.pedidoId }];
    }

    const rows = await tx
      .select({
        id: factura.id,
        monto: factura.montoCentavos,
        abonado: abonadoSql,
        pedidoId: factura.pedidoId,
        emitida: factura.emitidaAt,
        created: factura.createdAt,
      })
      .from(factura)
      .innerJoin(pedido, eq(pedido.id, factura.pedidoId))
      .where(
        and(
          eq(pedido.clienteId, input.clienteId!),
          eq(pedido.organizacionId, actor.organizacionId),
          sql`${factura.montoCentavos} > ${abonadoSql}`,
        ),
      )
      .orderBy(asc(sql`coalesce(${factura.emitidaAt}, ${factura.createdAt})`));

    return rows.map((r) => ({
      id: r.id,
      saldo: r.monto - Number(r.abonado),
      pedidoId: r.pedidoId,
    }));
  }

  private async resultadoDePagos(
    filas: Array<typeof pago.$inferSelect>,
    idempotente: boolean,
  ): Promise<PagoRegistroResultado> {
    const facturaIds = [...new Set(filas.map((p) => p.facturaId))];
    const facturas = [];
    for (const id of facturaIds) {
      const [fac] = await this.db.select().from(factura).where(eq(factura.id, id)).limit(1);
      if (fac) facturas.push(await presentarFactura(this.db, this.calendar, fac));
    }
    const [actorRow] = filas[0]?.registradoPor
      ? await this.db
          .select({ username: usuario.username })
          .from(usuario)
          .where(eq(usuario.id, filas[0]!.registradoPor))
          .limit(1)
      : [undefined];
    return pagoRegistroResultadoSchema.parse({
      idempotente,
      pagos: filas.map((p) => ({
        id: p.id,
        facturaId: p.facturaId,
        montoCentavos: p.montoCentavos,
        metodo: p.metodo,
        fecha: p.fecha,
        registradoPor: p.registradoPor,
        registradoPorNombre: actorRow?.username ?? null,
        comprobanteAssetId: p.comprobanteAssetId,
      })),
      facturas,
    });
  }
}
