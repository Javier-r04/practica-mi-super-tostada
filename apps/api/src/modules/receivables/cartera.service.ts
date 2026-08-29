import { Inject, Injectable } from "@nestjs/common";
import { and, eq, inArray, sql } from "drizzle-orm";
import {
  cliente,
  factura,
  pago,
  pedido,
  usuario,
} from "@misupertostada/db";
import {
  CARTERA_PAGE_SIZE_DEFAULT,
  carteraListaSchema,
  carteraQuerySchema,
  carteraResumenSchema,
  cuadreDiaSchema,
  cuadreQuerySchema,
  estadoFactura,
  fechaDeInstante,
  facturaCarteraSchema,
  instanteAIso,
  portalCuentaSchema,
  type CarteraLista,
  type CarteraQuery,
  type CarteraResumen,
  type CuadreDia,
  type CuadreQuery,
  type FacturaCartera,
  type PortalCuenta,
} from "@misupertostada/shared";
import { DRIZZLE } from "../shared/tokens";
import type { AppDatabase } from "../shared/database.module";
import { BusinessCalendarService } from "../shared/calendar.service";
import { DomainException } from "../shared/domain.exception";
import { parseBody } from "../shared/zod-body";
import type { Actor } from "../identity/actor";
import { antiguedadDiasDe } from "./factura-presentacion";

const abonadoSql = sql<number>`coalesce((
  select sum(${pago.montoCentavos}) from ${pago} where ${pago.facturaId} = ${factura.id}
), 0)::int`;

function rankEstado(estado: FacturaCartera["estado"]): number {
  if (estado === "VENCIDO") return 0;
  if (estado === "ABONO_PARCIAL") return 1;
  if (estado === "PENDIENTE") return 2;
  return 3;
}

function ordenarCartera(a: FacturaCartera, b: FacturaCartera): number {
  const porEstado = rankEstado(a.estado) - rankEstado(b.estado);
  if (porEstado !== 0) return porEstado;
  if (b.antiguedadDias !== a.antiguedadDias) {
    return b.antiguedadDias - a.antiguedadDias;
  }
  const porNombre = a.clienteNombre.localeCompare(b.clienteNombre, "es");
  if (porNombre !== 0) return porNombre;
  return a.correlativo - b.correlativo;
}

function coincideBusqueda(f: FacturaCartera, needle: string): boolean {
  if (!needle) return true;
  if (f.clienteNombre.toLowerCase().includes(needle)) return true;
  if (f.numeroDte?.toLowerCase().includes(needle)) return true;
  if (String(f.correlativo).includes(needle)) return true;
  return false;
}

@Injectable()
export class CarteraService {
  constructor(
    @Inject(DRIZZLE) private readonly db: AppDatabase,
    private readonly calendar: BusinessCalendarService,
  ) {}

  async listar(actor: Actor, query: unknown): Promise<CarteraLista> {
    const q = parseBody(carteraQuerySchema, query ?? {});
    const limit = q.limit ?? CARTERA_PAGE_SIZE_DEFAULT;
    const offset = q.offset ?? 0;
    const lista = await this.materializar(actor, q);

    const counts = {
      todas: lista.length,
      pendientes: lista.filter((f) => f.estado !== "PAGADO").length,
      vencidas: lista.filter((f) => f.estado === "VENCIDO").length,
    };

    let filtrada = lista;
    if (q.estado === "pendientes") {
      filtrada = lista.filter((f) => f.estado !== "PAGADO");
    } else if (q.estado === "vencidas") {
      filtrada = lista.filter((f) => f.estado === "VENCIDO");
    }

    filtrada = [...filtrada].sort(ordenarCartera);
    const total = filtrada.length;
    const items = filtrada.slice(offset, offset + limit);

    return carteraListaSchema.parse({
      items,
      total,
      counts,
      offset,
      limit,
      hasMore: offset + items.length < total,
    });
  }

  /** Filas candidatas con filtros SQL + q/sinDte; sin paginar ni filtrar por tab de estado. */
  private async materializar(
    actor: Actor,
    q: CarteraQuery,
  ): Promise<FacturaCartera[]> {
    const condiciones = [eq(pedido.organizacionId, actor.organizacionId)];
    if (q.clienteId) condiciones.push(eq(pedido.clienteId, q.clienteId));
    if (q.fechaOperacion) {
      condiciones.push(eq(pedido.fechaOperacion, q.fechaOperacion));
    }
    if (q.desde) {
      condiciones.push(
        sql`timezone('America/Guatemala', coalesce(${factura.emitidaAt}, ${factura.createdAt}))::date >= ${q.desde}::date`,
      );
    }
    if (q.hasta) {
      condiciones.push(
        sql`timezone('America/Guatemala', coalesce(${factura.emitidaAt}, ${factura.createdAt}))::date <= ${q.hasta}::date`,
      );
    }
    if (q.metodoPago) {
      condiciones.push(
        sql`exists (select 1 from ${pago} where ${pago.facturaId} = ${factura.id} and ${pago.metodo} = ${q.metodoPago})`,
      );
    }
    if (q.sinDte === "1") {
      condiciones.push(sql`${factura.numeroDte} is null`);
    }

    const rows = await this.db
      .select({
        factura,
        correlativo: pedido.correlativo,
        clienteId: pedido.clienteId,
        clienteNombre: cliente.nombre,
        fechaOperacion: pedido.fechaOperacion,
        fotoAssetId: cliente.fotoAssetId,
        abonado: abonadoSql,
      })
      .from(factura)
      .innerJoin(pedido, eq(pedido.id, factura.pedidoId))
      .innerJoin(cliente, eq(cliente.id, pedido.clienteId))
      .where(and(...condiciones));

    const cal = await this.calendar.load();
    const now = this.calendar.now();
    const needle = (q.q ?? "").trim().toLowerCase();
    const lista: FacturaCartera[] = [];
    for (const row of rows) {
      const abonadoCentavos = Number(row.abonado);
      const emitida = row.factura.emitidaAt ?? row.factura.createdAt;
      const antiguedadDias = antiguedadDiasDe(cal, emitida, now);
      const estado = estadoFactura({
        montoCentavos: row.factura.montoCentavos,
        abonadoCentavos,
        antiguedadDias,
      });
      const item = facturaCarteraSchema.parse({
        id: row.factura.id,
        pedidoId: row.factura.pedidoId,
        numeroDte: row.factura.numeroDte ?? null,
        montoCentavos: row.factura.montoCentavos,
        abonadoCentavos,
        saldoCentavos: Math.max(0, row.factura.montoCentavos - abonadoCentavos),
        emitidaAt: emitida ? instanteAIso(emitida) : null,
        antiguedadDias,
        estado,
        correlativo: row.correlativo,
        clienteId: row.clienteId,
        clienteNombre: row.clienteNombre,
        fechaOperacion: row.fechaOperacion,
        fotoAssetId: row.fotoAssetId ?? null,
      });
      if (!coincideBusqueda(item, needle)) continue;
      lista.push(item);
    }
    return lista;
  }

  async resumen(actor: Actor, query: unknown): Promise<CarteraResumen> {
    const q = parseBody(carteraQuerySchema, query ?? {});
    const cal = await this.calendar.load(actor.organizacionId);
    const ejes = await this.calendar.ejes(actor.organizacionId);
    // Sin filtro, la cartera mira la operación que se está cobrando hoy.
    const fechaOp = q.fechaOperacion ?? ejes.fechaFoco;
    // El cobro vive en el eje de día de calendario. Con una operación explícita es el día de
    // calle de ESA operación (si no, abrir una pasada mostraría lo de hoy).
    // Sin filtro es hoy a secas: derivarlo del foco hacía que a las 15:01
    // «Cobrado hoy» se fuera a Q0 —el foco salta a la ventana que abre, cuya
    // entrega es mañana— y contradijera al cuadre del día, que sí usa día de calendario.
    const diaCobro = q.fechaOperacion
      ? cal.getFechaEntrega(q.fechaOperacion)
      : ejes.hoyCivil;

    const [pend] = await this.db
      .select({
        count: sql<number>`count(*)::int`,
        saldo: sql<number>`coalesce(sum(${factura.montoCentavos} - ${abonadoSql}), 0)::int`,
      })
      .from(factura)
      .innerJoin(pedido, eq(pedido.id, factura.pedidoId))
      .where(
        and(
          eq(pedido.organizacionId, actor.organizacionId),
          sql`${factura.montoCentavos} > ${abonadoSql}`,
        ),
      );

    const [cobrado] = await this.db
      .select({
        total: sql<number>`coalesce(sum(${pago.montoCentavos}), 0)::int`,
      })
      .from(pago)
      .innerJoin(factura, eq(factura.id, pago.facturaId))
      .innerJoin(pedido, eq(pedido.id, factura.pedidoId))
      .where(
        and(
          eq(pedido.organizacionId, actor.organizacionId),
          eq(pago.fecha, diaCobro),
        ),
      );

    const [porCobrar] = await this.db
      .select({
        saldo: sql<number>`coalesce(sum(${factura.montoCentavos} - ${abonadoSql}), 0)::int`,
      })
      .from(factura)
      .innerJoin(pedido, eq(pedido.id, factura.pedidoId))
      .where(
        and(
          eq(pedido.organizacionId, actor.organizacionId),
          eq(pedido.fechaOperacion, fechaOp),
          sql`${factura.montoCentavos} > ${abonadoSql}`,
        ),
      );

    const sobre = await this.db
      .select({
        clienteId: cliente.id,
        nombre: cliente.nombre,
        fotoAssetId: cliente.fotoAssetId,
        pendientes: sql<number>`count(*)::int`,
        limite: cliente.limiteFacturasPendientes,
      })
      .from(factura)
      .innerJoin(pedido, eq(pedido.id, factura.pedidoId))
      .innerJoin(cliente, eq(cliente.id, pedido.clienteId))
      .where(
        and(
          eq(pedido.organizacionId, actor.organizacionId),
          sql`${cliente.limiteFacturasPendientes} is not null`,
          sql`${factura.montoCentavos} > ${abonadoSql}`,
        ),
      )
      .groupBy(
        cliente.id,
        cliente.nombre,
        cliente.fotoAssetId,
        cliente.limiteFacturasPendientes,
      )
      .having(sql`count(*) > ${cliente.limiteFacturasPendientes}`);

    return carteraResumenSchema.parse({
      pendientesCount: Number(pend?.count ?? 0),
      pendientesSaldoCentavos: Number(pend?.saldo ?? 0),
      cobradoHoyCentavos: Number(cobrado?.total ?? 0),
      fechaCobro: diaCobro,
      porCobrarFechaOperacionCentavos: Number(porCobrar?.saldo ?? 0),
      clientesSobreLimite: sobre
        .filter((c) => c.limite != null)
        .map((c) => ({
          clienteId: c.clienteId,
          nombre: c.nombre,
          pendientes: Number(c.pendientes),
          limite: c.limite!,
          fotoAssetId: c.fotoAssetId ?? null,
        })),
    });
  }

  async cuadre(actor: Actor, query: unknown): Promise<CuadreDia> {
    const q = parseBody(cuadreQuerySchema, query ?? {});
    const fecha = q.fecha ?? fechaDeInstante(this.calendar.now());

    const [totales] = await this.db
      .select({
        efectivo: sql<number>`coalesce(sum(${pago.montoCentavos}) filter (where ${pago.metodo} = 'EFECTIVO'), 0)::int`,
        transferencia: sql<number>`coalesce(sum(${pago.montoCentavos}) filter (where ${pago.metodo} = 'TRANSFERENCIA'), 0)::int`,
      })
      .from(pago)
      .innerJoin(factura, eq(factura.id, pago.facturaId))
      .innerJoin(pedido, eq(pedido.id, factura.pedidoId))
      .where(
        and(eq(pedido.organizacionId, actor.organizacionId), eq(pago.fecha, fecha)),
      );

    const porActorRows = await this.db
      .select({
        usuarioId: pago.registradoPor,
        username: usuario.username,
        efectivo: sql<number>`coalesce(sum(${pago.montoCentavos}) filter (where ${pago.metodo} = 'EFECTIVO'), 0)::int`,
        transferencia: sql<number>`coalesce(sum(${pago.montoCentavos}) filter (where ${pago.metodo} = 'TRANSFERENCIA'), 0)::int`,
        count: sql<number>`count(*)::int`,
      })
      .from(pago)
      .innerJoin(factura, eq(factura.id, pago.facturaId))
      .innerJoin(pedido, eq(pedido.id, factura.pedidoId))
      .leftJoin(usuario, eq(usuario.id, pago.registradoPor))
      .where(
        and(eq(pedido.organizacionId, actor.organizacionId), eq(pago.fecha, fecha)),
      )
      .groupBy(pago.registradoPor, usuario.username);

    const lista = await this.db
      .select({
        pago,
        clienteNombre: cliente.nombre,
        numeroDte: factura.numeroDte,
        username: usuario.username,
      })
      .from(pago)
      .innerJoin(factura, eq(factura.id, pago.facturaId))
      .innerJoin(pedido, eq(pedido.id, factura.pedidoId))
      .innerJoin(cliente, eq(cliente.id, pedido.clienteId))
      .leftJoin(usuario, eq(usuario.id, pago.registradoPor))
      .where(
        and(eq(pedido.organizacionId, actor.organizacionId), eq(pago.fecha, fecha)),
      );

    const efectivo = Number(totales?.efectivo ?? 0);
    const transferencia = Number(totales?.transferencia ?? 0);
    return cuadreDiaSchema.parse({
      fecha,
      totalEfectivoCentavos: efectivo,
      totalTransferenciaCentavos: transferencia,
      totalCentavos: efectivo + transferencia,
      porActor: porActorRows.map((r) => ({
        usuarioId: r.usuarioId,
        username: r.username ?? "sistema",
        efectivoCentavos: Number(r.efectivo),
        transferenciaCentavos: Number(r.transferencia),
        count: Number(r.count),
      })),
      pagos: lista.map((r) => ({
        id: r.pago.id,
        facturaId: r.pago.facturaId,
        montoCentavos: r.pago.montoCentavos,
        metodo: r.pago.metodo,
        fecha: r.pago.fecha,
        registradoPor: r.pago.registradoPor,
        registradoPorNombre: r.username ?? null,
        comprobanteAssetId: r.pago.comprobanteAssetId,
        clienteNombre: r.clienteNombre,
        numeroDte: r.numeroDte,
      })),
    });
  }

  async cuenta(clienteId: string, actor: Actor): Promise<PortalCuenta> {
    const [cli] = await this.db
      .select()
      .from(cliente)
      .where(
        and(eq(cliente.id, clienteId), eq(cliente.organizacionId, actor.organizacionId)),
      )
      .limit(1);
    if (!cli) {
      throw new DomainException("NO_ENCONTRADO", "Cliente no encontrado", 404);
    }
    return this.cuentaDeCliente(cli);
  }

  async cuentaDeCliente(cli: typeof cliente.$inferSelect): Promise<PortalCuenta> {
    const cal = await this.calendar.load();
    const now = this.calendar.now();
    const filas = await this.db
      .select({ factura, pedido })
      .from(factura)
      .innerJoin(pedido, eq(factura.pedidoId, pedido.id))
      .where(eq(pedido.clienteId, cli.id));
    const ids = filas.map((f) => f.factura.id);
    const pagos = ids.length
      ? await this.db.select().from(pago).where(inArray(pago.facturaId, ids))
      : [];
    const abonoPor = new Map<string, number>();
    for (const p of pagos) {
      abonoPor.set(p.facturaId, (abonoPor.get(p.facturaId) ?? 0) + p.montoCentavos);
    }
    const pendientes = [];
    for (const fila of filas) {
      const fac = fila.factura;
      const abonado = abonoPor.get(fac.id) ?? 0;
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
        saldoCentavos: fac.montoCentavos - abonado,
        emitidaAt: emitida ? instanteAIso(emitida) : null,
        antiguedadDias,
        estado: estado === "VENCIDO" ? ("VENCIDO" as const) : estado === "ABONO_PARCIAL" ? ("ABONO_PARCIAL" as const) : ("PENDIENTE" as const),
      });
    }
    return portalCuentaSchema.parse({
      facturasPendientes: pendientes.length,
      limiteFacturasPendientes: cli.limiteFacturasPendientes,
      saldoCentavos: pendientes.reduce((acc, f) => acc + f.saldoCentavos, 0),
      facturas: pendientes,
    });
  }
}
