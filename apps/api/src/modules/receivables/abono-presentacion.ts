import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import {
  abono,
  cliente,
  factura,
  pago,
  pedido,
  usuario,
} from "@misupertostada/db";
import {
  instanteAIso,
  ordenarFacturasFifo,
  portalCuentaSchema,
  estadoFactura,
  type AbonoPublico,
  type PortalCuenta,
} from "@misupertostada/shared";
import type { AppDatabase } from "../shared/database.module";
import type { BusinessCalendarService } from "../shared/calendar.service";
import { antiguedadDiasDe } from "./factura-presentacion";

type AbonoRow = typeof abono.$inferSelect;

export async function facturasPendientesDeCliente(
  tx: AppDatabase,
  clienteId: string,
  organizacionId: string,
): Promise<Array<{ id: string; saldo: number; pedidoId: string }>> {
  const abonadoSql = sql<number>`coalesce((
    select sum(${pago.montoCentavos}) from ${pago} where ${pago.facturaId} = ${factura.id}
  ), 0)::int`;

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
        eq(pedido.clienteId, clienteId),
        eq(pedido.organizacionId, organizacionId),
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

export async function aplicacionesDeAbono(
  db: AppDatabase,
  abonoId: string,
): Promise<AbonoPublico["aplicaciones"]> {
  const filas = await db
    .select({
      facturaId: pago.facturaId,
      montoCentavos: pago.montoCentavos,
      numeroDte: factura.numeroDte,
    })
    .from(pago)
    .innerJoin(factura, eq(factura.id, pago.facturaId))
    .where(eq(pago.abonoId, abonoId));
  return filas.map((f) => ({
    facturaId: f.facturaId,
    numeroDte: f.numeroDte ?? null,
    montoCentavos: f.montoCentavos,
  }));
}

async function nombresUsuarios(
  db: AppDatabase,
  ids: Array<string | null>,
): Promise<Map<string, string>> {
  const unicos = [...new Set(ids.filter((id): id is string => Boolean(id)))];
  if (unicos.length === 0) return new Map();
  const rows = await db
    .select({ id: usuario.id, username: usuario.username })
    .from(usuario)
    .where(inArray(usuario.id, unicos));
  return new Map(rows.map((r) => [r.id, r.username]));
}

export async function presentarAbono(
  db: AppDatabase,
  row: AbonoRow,
  opts?: { clienteNombre?: string },
): Promise<AbonoPublico> {
  const aplicaciones = await aplicacionesDeAbono(db, row.id);
  const nombres = await nombresUsuarios(db, [
    row.registradoPor,
    row.confirmadoPor,
  ]);
  return {
    id: row.id,
    clienteId: row.clienteId,
    clienteNombre: opts?.clienteNombre,
    montoCentavos: row.montoCentavos,
    metodo: row.metodo,
    estado: row.estado,
    descripcion: row.descripcion ?? null,
    comprobanteAssetId: row.comprobanteAssetId ?? null,
    origen: row.origen,
    fecha: row.fecha,
    registradoPor: row.registradoPor,
    registradoPorNombre: row.registradoPor
      ? (nombres.get(row.registradoPor) ?? null)
      : null,
    confirmadoPor: row.confirmadoPor,
    confirmadoPorNombre: row.confirmadoPor
      ? (nombres.get(row.confirmadoPor) ?? null)
      : null,
    confirmadoAt: row.confirmadoAt ? instanteAIso(row.confirmadoAt) : null,
    motivoRechazo: row.motivoRechazo ?? null,
    aplicaciones,
  };
}

export async function construirCuentaCliente(
  db: AppDatabase,
  calendar: BusinessCalendarService,
  cli: typeof cliente.$inferSelect,
): Promise<PortalCuenta> {
  const cal = await calendar.load(cli.organizacionId);
  const now = calendar.now();
  const filas = await db
    .select({ factura, pedido })
    .from(factura)
    .innerJoin(pedido, eq(factura.pedidoId, pedido.id))
    .where(eq(pedido.clienteId, cli.id));

  const ids = filas.map((f) => f.factura.id);
  const pagos = ids.length
    ? await db.select().from(pago).where(inArray(pago.facturaId, ids))
    : [];
  const abonoPorFactura = new Map<string, number>();
  for (const p of pagos) {
    abonoPorFactura.set(
      p.facturaId,
      (abonoPorFactura.get(p.facturaId) ?? 0) + p.montoCentavos,
    );
  }

  const pendientes = [];
  for (const fila of filas) {
    const fac = fila.factura;
    const abonado = abonoPorFactura.get(fac.id) ?? 0;
    if (abonado >= fac.montoCentavos) continue;
    const saldo = fac.montoCentavos - abonado;
    const emitida = fac.emitidaAt ?? fac.createdAt;
    const antiguedadDias = antiguedadDiasDe(cal, emitida, now);
    const estado = estadoFactura({
      montoCentavos: fac.montoCentavos,
      abonadoCentavos: abonado,
      antiguedadDias,
    });
    if (estado === "PAGADO") continue;
    pendientes.push({
      id: fac.id,
      numeroDte: fac.numeroDte ?? null,
      montoCentavos: fac.montoCentavos,
      abonadoCentavos: abonado,
      saldoCentavos: saldo,
      emitidaAt: emitida ? instanteAIso(emitida) : null,
      antiguedadDias,
      estado:
        estado === "VENCIDO"
          ? ("VENCIDO" as const)
          : estado === "ABONO_PARCIAL"
            ? ("ABONO_PARCIAL" as const)
            : ("PENDIENTE" as const),
    });
  }

  const abonosRows = await db
    .select()
    .from(abono)
    .where(eq(abono.clienteId, cli.id))
    .orderBy(desc(abono.createdAt))
    .limit(40);

  const abonosPublicos = [];
  let transferenciasEnRevisionCentavos = 0;
  for (const row of abonosRows) {
    const pub = await presentarAbono(db, row);
    abonosPublicos.push({
      id: pub.id,
      montoCentavos: pub.montoCentavos,
      metodo: pub.metodo,
      estado: pub.estado,
      descripcion: pub.descripcion,
      comprobanteAssetId: pub.comprobanteAssetId,
      fecha: pub.fecha,
      confirmadoAt: pub.confirmadoAt,
      motivoRechazo: pub.motivoRechazo,
      aplicaciones: pub.aplicaciones,
    });
    if (row.estado === "PENDIENTE" && row.metodo === "TRANSFERENCIA") {
      transferenciasEnRevisionCentavos += row.montoCentavos;
    }
  }

  return portalCuentaSchema.parse({
    facturasPendientes: pendientes.length,
    limiteFacturasPendientes: cli.limiteFacturasPendientes,
    saldoCentavos: pendientes.reduce((acc, f) => acc + f.saldoCentavos, 0),
    facturas: [...pendientes].sort(ordenarFacturasFifo),
    abonos: abonosPublicos,
    transferenciasEnRevisionCentavos,
  });
}
