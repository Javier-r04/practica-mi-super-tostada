import { and, eq, sql } from "drizzle-orm";
import { factura, pago, pedido } from "@misupertostada/db";
import {
  estadoFactura,
  facturaPublicaSchema,
  instanteAIso,
  type FacturaPublica,
} from "@misupertostada/shared";
import type { AppDatabase } from "../shared/database.module";
import { BusinessCalendarService } from "../shared/calendar.service";

const abonadoSql = sql<number>`coalesce((
  select sum(${pago.montoCentavos}) from ${pago} where ${pago.facturaId} = ${factura.id}
), 0)::int`;

export function antiguedadDiasDe(
  cal: { diasCalendarioEntre: (desde: Date, hasta: Date) => number },
  desde: Date | string | null | undefined,
  hasta: Date,
): number {
  if (!desde) return 0;
  const d = desde instanceof Date ? desde : new Date(desde);
  if (Number.isNaN(d.getTime())) return 0;
  return Math.max(0, cal.diasCalendarioEntre(d, hasta));
}

export async function abonadoDeFactura(
  db: AppDatabase,
  facturaId: string,
): Promise<number> {
  const [row] = await db
    .select({
      total: sql<number>`coalesce(sum(${pago.montoCentavos}), 0)::int`,
    })
    .from(pago)
    .where(eq(pago.facturaId, facturaId));
  return Number(row?.total ?? 0);
}

export async function presentarFactura(
  db: AppDatabase,
  calendar: BusinessCalendarService,
  fac: typeof factura.$inferSelect,
): Promise<FacturaPublica> {
  const abonadoCentavos = await abonadoDeFactura(db, fac.id);
  const cal = await calendar.load();
  const now = calendar.now();
  const emitida = fac.emitidaAt ?? fac.createdAt;
  const antiguedadDias = antiguedadDiasDe(cal, emitida, now);
  const saldoCentavos = Math.max(0, fac.montoCentavos - abonadoCentavos);
  return facturaPublicaSchema.parse({
    id: fac.id,
    pedidoId: fac.pedidoId,
    numeroDte: fac.numeroDte ?? null,
    montoCentavos: fac.montoCentavos,
    abonadoCentavos,
    saldoCentavos,
    emitidaAt: emitida ? instanteAIso(emitida) : null,
    antiguedadDias,
    estado: estadoFactura({
      montoCentavos: fac.montoCentavos,
      abonadoCentavos,
      antiguedadDias,
    }),
  });
}

export async function pendientesDeCliente(
  db: AppDatabase,
  clienteId: string,
): Promise<{ count: number; saldoCentavos: number }> {
  const [row] = await db
    .select({
      count: sql<number>`count(*)::int`,
      saldo: sql<number>`coalesce(sum(${factura.montoCentavos} - ${abonadoSql}), 0)::int`,
    })
    .from(factura)
    .innerJoin(pedido, eq(pedido.id, factura.pedidoId))
    .where(
      and(
        eq(pedido.clienteId, clienteId),
        sql`${factura.montoCentavos} > ${abonadoSql}`,
      ),
    );
  return {
    count: Number(row?.count ?? 0),
    saldoCentavos: Number(row?.saldo ?? 0),
  };
}
