import { Inject, Injectable } from "@nestjs/common";
import { and, eq } from "drizzle-orm";
import { cliente, factura, pedido } from "@misupertostada/db";
import {
  MENSAJE_DTE_DUPLICADO,
  TIPO_EVENTO_LIMITE_CREDITO,
  capturarDteRequestSchema,
  tienePermiso,
  type FacturaPublica,
} from "@misupertostada/shared";
import { DRIZZLE } from "../shared/tokens";
import type { AppDatabase } from "../shared/database.module";
import { AuditWriter } from "../shared/audit.writer";
import { OutboxWriter } from "../shared/outbox.writer";
import { BusinessCalendarService } from "../shared/calendar.service";
import { PedidoEvents } from "../shared/panel-events";
import { DomainException } from "../shared/domain.exception";
import { parseBody } from "../shared/zod-body";
import { esViolacionUnica } from "../shared/pg-error";
import type { Actor } from "../identity/actor";
import {
  FACTURA_AL_ENTREGAR,
  type FacturaAlEntregar,
  type FacturaAlEntregarInput,
  type FacturaAlEntregarResultado,
} from "./factura-al-entregar";
import { pendientesDeCliente, presentarFactura } from "./factura-presentacion";

@Injectable()
export class FacturaService implements FacturaAlEntregar {
  constructor(
    @Inject(DRIZZLE) private readonly db: AppDatabase,
    private readonly audit: AuditWriter,
    private readonly outbox: OutboxWriter,
    private readonly calendar: BusinessCalendarService,
    private readonly bus: PedidoEvents,
  ) {}

  async crearEnTx(
    tx: AppDatabase,
    input: FacturaAlEntregarInput,
  ): Promise<FacturaAlEntregarResultado> {
    const inserted = await tx
      .insert(factura)
      .values({
        pedidoId: input.pedidoId,
        montoCentavos: input.montoCentavos,
      })
      .onConflictDoNothing()
      .returning();
    const row =
      inserted[0] ??
      (
        await tx
          .select()
          .from(factura)
          .where(eq(factura.pedidoId, input.pedidoId))
          .limit(1)
      )[0];
    if (!row) {
      throw new DomainException(
        "FACTURA_NO_CREADA",
        "No se pudo crear la factura de la entrega",
        500,
      );
    }
    if (inserted[0]) {
      await this.verificarLimite(tx, input.pedidoId);
    }
    return {
      id: row.id,
      montoCentavos: row.montoCentavos,
      idempotente: !inserted[0],
    };
  }

  async presentar(facturaId: string, tx: AppDatabase = this.db): Promise<FacturaPublica> {
    const [fac] = await tx.select().from(factura).where(eq(factura.id, facturaId)).limit(1);
    if (!fac) {
      throw new DomainException("NO_ENCONTRADO", "Factura no encontrada", 404);
    }
    return presentarFactura(tx, this.calendar, fac);
  }

  async capturarDte(
    facturaId: string,
    body: unknown,
    actor: Actor,
  ): Promise<FacturaPublica> {
    if (!tienePermiso(actor.permisos, "cobranza.capturar_dte")) {
      throw new DomainException(
        "PERMISO_DENEGADO",
        "No tiene permiso para esta acción",
        403,
      );
    }
    const input = parseBody(capturarDteRequestSchema, body);
    const now = this.calendar.now();

    try {
      await this.db.transaction(async (tx) => {
        const [fac] = await tx
          .select()
          .from(factura)
          .where(eq(factura.id, facturaId))
          .limit(1)
          .for("update");
        if (!fac) {
          throw new DomainException("NO_ENCONTRADO", "Factura no encontrada", 404);
        }
        const [ped] = await tx
          .select()
          .from(pedido)
          .where(
            and(
              eq(pedido.id, fac.pedidoId),
              eq(pedido.organizacionId, actor.organizacionId),
            ),
          )
          .limit(1);
        if (!ped) {
          throw new DomainException("NO_ENCONTRADO", "Factura no encontrada", 404);
        }
        const antes = fac.numeroDte;
        await tx
          .update(factura)
          .set({
            numeroDte: input.numeroDte,
            ...(fac.emitidaAt ? {} : { emitidaAt: now }),
          })
          .where(eq(factura.id, facturaId));
        await this.audit.insert(
          {
            actorTipo: "usuario",
            actorId: actor.usuarioId,
            accion: "cobranza.capturar_dte",
            entidad: "factura",
            entidadId: facturaId,
            antes: { numeroDte: antes },
            despues: { numeroDte: input.numeroDte },
            ip: actor.ip,
            userAgent: actor.userAgent,
          },
          tx,
        );
      });
    } catch (err) {
      if (err instanceof DomainException) throw err;
      if (esViolacionUnica(err)) {
        throw new DomainException("DTE_DUPLICADO", MENSAJE_DTE_DUPLICADO, 409);
      }
      throw err;
    }

    const [ped] = await this.db
      .select({ fechaOperacion: pedido.fechaOperacion, clienteId: pedido.clienteId })
      .from(factura)
      .innerJoin(pedido, eq(pedido.id, factura.pedidoId))
      .where(eq(factura.id, facturaId))
      .limit(1);
    if (ped) {
      this.bus.emit({
        organizacionId: actor.organizacionId,
        tipo: "factura.actualizada",
        fechaOperacion: ped.fechaOperacion,
        facturaId,
        clienteId: ped.clienteId,
      });
    }
    return this.presentar(facturaId);
  }

  async verificarLimite(tx: AppDatabase, pedidoId: string): Promise<void> {
    const [ped] = await tx
      .select()
      .from(pedido)
      .where(eq(pedido.id, pedidoId))
      .limit(1);
    if (!ped) return;
    const [cli] = await tx
      .select()
      .from(cliente)
      .where(eq(cliente.id, ped.clienteId))
      .limit(1);
    if (!cli?.limiteFacturasPendientes) return;
    const { count } = await pendientesDeCliente(tx, ped.clienteId);
    if (count <= cli.limiteFacturasPendientes) return;
    await this.outbox.insert(
      {
        tipo: TIPO_EVENTO_LIMITE_CREDITO,
        destinatarioId: ped.clienteId,
        fechaOperacion: ped.fechaOperacion,
        payload: {
          clienteId: ped.clienteId,
          pendientes: count,
          limite: cli.limiteFacturasPendientes,
        },
      },
      tx,
    );
  }
}

export { FACTURA_AL_ENTREGAR };
