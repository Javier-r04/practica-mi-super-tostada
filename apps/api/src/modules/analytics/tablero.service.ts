import { Inject, Injectable } from "@nestjs/common";
import { and, eq, inArray, sql, type SQL } from "drizzle-orm";
import {
  cliente,
  factura,
  pago,
  pedido,
  pedidoItem,
  producto,
} from "@misupertostada/db";
import {
  DIAS_CALENDARIO_HABITO,
  DIAS_HABILES_DEJO_DE_PEDIR,
  TRAMOS_ANTIGUEDAD,
  desplazarFecha,
  evaluaDejoDePedir,
  etiquetaPeriodo,
  fechasEnRango,
  instanteDeFecha,
  medianaEntera,
  puntosBase,
  repartirPuntosBase,
  rangoAnterior,
  reporteTablero,
  resolverRangoTablero,
  tableroQuerySchema,
  tableroSchema,
  ticketPromedioCentavos,
  tramoAntiguedad,
  ultimosDiasHabiles,
  type FiltrosAplicados,
  type Tablero,
  type TableroQuery,
} from "@misupertostada/shared";
import { renderQuincenaPdf } from "@misupertostada/pdf";
import { DRIZZLE } from "../shared/tokens";
import type { AppDatabase } from "../shared/database.module";
import { BusinessCalendarService } from "../shared/calendar.service";
import { AuditWriter } from "../shared/audit.writer";
import { parseBody } from "../shared/zod-body";
import type { Actor } from "../identity/actor";

const abonadoSql = sql<number>`coalesce((
  select sum(${pago.montoCentavos}) from ${pago} where ${pago.facturaId} = ${factura.id}
), 0)::int`;

function combinar(...partes: Array<SQL | undefined>): SQL {
  return and(...partes.filter((p): p is SQL => p !== undefined))!;
}

type FiltrosInternos = FiltrosAplicados & {
  recorteProducto: boolean;
};

@Injectable()
export class TableroService {
  constructor(
    @Inject(DRIZZLE) private readonly db: AppDatabase,
    private readonly calendar: BusinessCalendarService,
    private readonly audit: AuditWriter,
  ) {}

  async consultar(actor: Actor, query: unknown): Promise<Tablero> {
    const q = parseBody(tableroQuerySchema, query ?? {});
    const cal = await this.calendar.load();
    const now = this.calendar.now();
    const filtros = this.resolverFiltros(q, now);
    const orgId = actor.organizacionId;

    const [
      operacion,
      cartera,
      ventasActual,
      ventasPrev,
      cobradoPorDia,
      productos,
      clientes,
    ] = await Promise.all([
      this.bloqueOperacion(orgId, filtros),
      this.bloqueCartera(orgId, filtros, cal, now),
      this.bloqueVentas(orgId, filtros),
      this.bloqueVentas(orgId, {
        ...filtros,
        ...rangoAnterior({
          periodo: filtros.periodo,
          desde: filtros.desde,
          hasta: filtros.hasta,
          cal,
        }),
      }),
      this.bloqueCobradoPorDia(orgId, filtros),
      this.bloqueProductos(orgId, filtros),
      this.bloqueClientes(orgId, filtros, cal, now),
    ]);

    const deltaCentavos =
      ventasActual.totalCentavos - ventasPrev.totalCentavos;
    const deltaPuntosBase = puntosBase(
      Math.abs(deltaCentavos),
      ventasPrev.totalCentavos,
    ) * (deltaCentavos < 0 ? -1 : 1);

    const alertaTipo =
      filtros.desde === filtros.hasta ? "SIN_PEDIDO" : "DEJO_DE_PEDIR";
    const clientesAlertaCount =
      alertaTipo === "SIN_PEDIDO"
        ? operacion.clientesSinPedido.length
        : clientes.filter((c) => c.dejoDePedir).length;

    return tableroSchema.parse({
      filtrosAplicados: {
        periodo: filtros.periodo,
        desde: filtros.desde,
        hasta: filtros.hasta,
        clienteId: filtros.clienteId,
        familia: filtros.familia,
        puntoCarga: filtros.puntoCarga,
        origen: filtros.origen,
        etiqueta: filtros.etiqueta,
        carteraAplica: filtros.carteraAplica,
      },
      kpis: {
        ventasCentavos: ventasActual.totalCentavos,
        ventasDeltaCentavos: deltaCentavos,
        ventasDeltaPuntosBase: ventasPrev.totalCentavos === 0 ? 0 : deltaPuntosBase,
        pedidos: operacion.pedidos,
        portal: operacion.portal,
        manual: operacion.manual,
        porCobrarCentavos: cartera.saldoCentavos,
        cobradoCentavos:
          cartera.cobradoEnRango.efectivoCentavos +
          cartera.cobradoEnRango.transferenciaCentavos +
          cartera.cobradoEnRango.chequeCentavos,
        cobradoEfectivoCentavos: cartera.cobradoEnRango.efectivoCentavos,
        cobradoTransferenciaCentavos: cartera.cobradoEnRango.transferenciaCentavos,
        cobradoChequeCentavos: cartera.cobradoEnRango.chequeCentavos,
        clientesAlertaCount,
        clientesAlertaTipo: alertaTipo,
        adopcionPuntosBase: operacion.adopcionPuntosBase,
      },
      operacion: {
        pedidos: operacion.pedidos,
        montoCentavos: operacion.montoCentavos,
        portal: operacion.portal,
        manual: operacion.manual,
        ruta: operacion.ruta,
        clientesSinPedido: operacion.clientesSinPedido,
      },
      cartera,
      ventas: {
        totalCentavos: ventasActual.totalCentavos,
        anterior: {
          desde: ventasPrev.desde,
          hasta: ventasPrev.hasta,
          totalCentavos: ventasPrev.totalCentavos,
          deltaCentavos,
          deltaPuntosBase:
            ventasPrev.totalCentavos === 0 ? 0 : deltaPuntosBase,
        },
        porDia: ventasActual.porDia,
        porCliente: ventasActual.porCliente,
      },
      cobradoPorDia,
      productos,
      clientes,
      adopcion: {
        portal: operacion.portal,
        manual: operacion.manual,
        puntosBasePortal: operacion.adopcionPuntosBase,
      },
    });
  }

  /**
   * Reporte del recorte actual, no siempre «la quincena». El título y el
   * nombre del archivo salen del rango ya resuelto (`reporteTablero`), así que
   * un día suelto baja como «Resumen del día» y no pisa el cierre del mes.
   */
  async exportarPdf(
    actor: Actor,
    query: unknown,
  ): Promise<{ buffer: Buffer; nombreArchivo: string }> {
    const data = await this.consultar(actor, query);
    const f = data.filtrosAplicados;
    const { nombreArchivo } = reporteTablero({
      periodo: f.periodo,
      desde: f.desde,
      hasta: f.hasta,
    });
    await this.audit.insert({
      actorTipo: "usuario",
      actorId: actor.usuarioId,
      accion: "tablero.exportar_pdf",
      entidad: "tablero",
      entidadId: `${actor.organizacionId}:${f.desde}:${f.hasta}`,
      despues: f,
      ip: actor.ip,
      userAgent: actor.userAgent,
    });
    const buffer = await renderQuincenaPdf(data, {
      generadoAt: this.calendar.now(),
    });
    return { buffer, nombreArchivo };
  }

  private resolverFiltros(
    q: TableroQuery,
    now: Date,
  ): FiltrosInternos {
    const { periodo, desde, hasta } = resolverRangoTablero({
      periodo: q.periodo,
      desde: q.desde,
      hasta: q.hasta,
      now,
    });
    const recorteProducto = Boolean(q.familia || q.puntoCarga);
    return {
      periodo,
      desde,
      hasta,
      clienteId: q.clienteId ?? null,
      familia: q.familia ?? null,
      puntoCarga: q.puntoCarga ?? null,
      origen: q.origen ?? null,
      etiqueta: etiquetaPeriodo({ periodo, desde, hasta }),
      carteraAplica: !recorteProducto,
      recorteProducto,
    };
  }

  private pedidoRango(orgId: string, filtros: FiltrosInternos): SQL {
    const partes: SQL[] = [
      eq(pedido.organizacionId, orgId),
      sql`${pedido.fechaOperacion} >= ${filtros.desde}`,
      sql`${pedido.fechaOperacion} <= ${filtros.hasta}`,
    ];
    if (filtros.clienteId) partes.push(eq(pedido.clienteId, filtros.clienteId));
    if (filtros.origen) partes.push(eq(pedido.origen, filtros.origen));
    return combinar(...partes);
  }

  private productoRecorte(filtros: FiltrosInternos): SQL | undefined {
    const partes: SQL[] = [];
    if (filtros.familia) partes.push(eq(producto.familia, filtros.familia));
    if (filtros.puntoCarga) {
      partes.push(eq(producto.puntoCarga, filtros.puntoCarga));
    }
    if (partes.length === 0) return undefined;
    return combinar(...partes);
  }

  private async bloqueOperacion(orgId: string, filtros: FiltrosInternos) {
    const recorte = this.productoRecorte(filtros);
    const pedidosRows = await this.db
      .select({
        id: pedido.id,
        origen: pedido.origen,
        estado: pedido.estado,
        clienteId: pedido.clienteId,
      })
      .from(pedido)
      .where(this.pedidoRango(orgId, filtros));

    let idsConItem: Set<string> | null = null;
    if (recorte) {
      const conItem = await this.db
        .select({ pedidoId: pedidoItem.pedidoId })
        .from(pedidoItem)
        .innerJoin(pedido, eq(pedido.id, pedidoItem.pedidoId))
        .innerJoin(producto, eq(producto.id, pedidoItem.productoId))
        .where(and(this.pedidoRango(orgId, filtros), recorte));
      idsConItem = new Set(conItem.map((r) => r.pedidoId));
    }
    const enRecorte = (id: string) => !idsConItem || idsConItem.has(id);
    const visibles = pedidosRows.filter((p) => enRecorte(p.id));
    const vivos = visibles.filter((p) => p.estado !== "ANULADO");
    const portal = vivos.filter((p) => p.origen === "PORTAL").length;
    const manual = vivos.filter((p) => p.origen === "MANUAL").length;

    const montoWhere = [
      this.pedidoRango(orgId, filtros),
      sql`${pedido.estado} <> 'ANULADO'`,
    ];
    if (recorte) montoWhere.push(recorte);
    const [monto] = await this.db
      .select({
        total: sql<number>`coalesce(sum(${pedidoItem.cantidadPedida} * ${pedidoItem.precioUnitarioCentavos}), 0)::int`,
      })
      .from(pedidoItem)
      .innerJoin(pedido, eq(pedido.id, pedidoItem.pedidoId))
      .innerJoin(producto, eq(producto.id, pedidoItem.productoId))
      .where(and(...montoWhere));

    let clientesSinPedido: { clienteId: string; nombre: string }[] = [];
    if (filtros.desde === filtros.hasta) {
      const activos = await this.db
        .select({ clienteId: cliente.id, nombre: cliente.nombre })
        .from(cliente)
        .where(
          and(
            eq(cliente.organizacionId, orgId),
            eq(cliente.activo, true),
            filtros.clienteId
              ? eq(cliente.id, filtros.clienteId)
              : undefined,
          ),
        );
      const conPedido = new Set(vivos.map((p) => p.clienteId));
      clientesSinPedido = activos
        .filter((c) => !conPedido.has(c.clienteId))
        .map((c) => ({ clienteId: c.clienteId, nombre: c.nombre }));
    }

    return {
      pedidos: vivos.length,
      montoCentavos: Number(monto?.total ?? 0),
      portal,
      manual,
      adopcionPuntosBase: puntosBase(portal, portal + manual),
      ruta: {
        confirmados: visibles.filter((p) => p.estado === "CONFIRMADO").length,
        enProduccion: visibles.filter((p) => p.estado === "EN_PRODUCCION").length,
        entregados: visibles.filter((p) => p.estado === "ENTREGADO").length,
        anulados: visibles.filter((p) => p.estado === "ANULADO").length,
      },
      clientesSinPedido,
    };
  }

  private async bloqueCartera(
    orgId: string,
    filtros: FiltrosInternos,
    cal: Awaited<ReturnType<BusinessCalendarService["load"]>>,
    now: Date,
  ) {
    const orgPedido = [
      eq(pedido.organizacionId, orgId),
      filtros.clienteId ? eq(pedido.clienteId, filtros.clienteId) : undefined,
      filtros.origen ? eq(pedido.origen, filtros.origen) : undefined,
    ];

    const [pend] = await this.db
      .select({
        saldo: sql<number>`coalesce(sum(${factura.montoCentavos} - ${abonadoSql}), 0)::int`,
      })
      .from(factura)
      .innerJoin(pedido, eq(pedido.id, factura.pedidoId))
      .where(and(...orgPedido, sql`${factura.montoCentavos} > ${abonadoSql}`));

    const [cobrado] = await this.db
      .select({
        efectivo: sql<number>`coalesce(sum(${pago.montoCentavos}) filter (where ${pago.metodo} = 'EFECTIVO'), 0)::int`,
        transferencia: sql<number>`coalesce(sum(${pago.montoCentavos}) filter (where ${pago.metodo} = 'TRANSFERENCIA'), 0)::int`,
        cheque: sql<number>`coalesce(sum(${pago.montoCentavos}) filter (where ${pago.metodo} = 'CHEQUE'), 0)::int`,
      })
      .from(pago)
      .innerJoin(factura, eq(factura.id, pago.facturaId))
      .innerJoin(pedido, eq(pedido.id, factura.pedidoId))
      .where(
        and(
          ...orgPedido,
          sql`${pago.fecha} >= ${filtros.desde}`,
          sql`${pago.fecha} <= ${filtros.hasta}`,
        ),
      );

    const sobre = await this.db
      .select({
        clienteId: cliente.id,
        nombre: cliente.nombre,
        pendientes: sql<number>`count(*)::int`,
        limite: cliente.limiteFacturasPendientes,
      })
      .from(factura)
      .innerJoin(pedido, eq(pedido.id, factura.pedidoId))
      .innerJoin(cliente, eq(cliente.id, pedido.clienteId))
      .where(
        and(
          eq(pedido.organizacionId, orgId),
          filtros.clienteId ? eq(pedido.clienteId, filtros.clienteId) : undefined,
          sql`${cliente.limiteFacturasPendientes} is not null`,
          sql`${factura.montoCentavos} > ${abonadoSql}`,
        ),
      )
      .groupBy(cliente.id, cliente.nombre, cliente.limiteFacturasPendientes)
      .having(sql`count(*) > ${cliente.limiteFacturasPendientes}`);

    const facturasSaldo = await this.db
      .select({
        monto: factura.montoCentavos,
        abonado: abonadoSql,
        emitidaAt: factura.emitidaAt,
        createdAt: factura.createdAt,
      })
      .from(factura)
      .innerJoin(pedido, eq(pedido.id, factura.pedidoId))
      .where(and(...orgPedido, sql`${factura.montoCentavos} > ${abonadoSql}`));

    const tramosMap = new Map(
      TRAMOS_ANTIGUEDAD.map((clave) => [
        clave,
        { clave, facturas: 0, saldoCentavos: 0 },
      ]),
    );
    for (const row of facturasSaldo) {
      const emitida = row.emitidaAt ?? row.createdAt;
      const dias = emitida
        ? Math.max(0, cal.diasCalendarioEntre(emitida, now))
        : 0;
      const clave = tramoAntiguedad(dias);
      const slot = tramosMap.get(clave)!;
      slot.facturas += 1;
      slot.saldoCentavos += row.monto - Number(row.abonado);
    }

    return {
      saldoCentavos: Number(pend?.saldo ?? 0),
      cobradoEnRango: {
        efectivoCentavos: Number(cobrado?.efectivo ?? 0),
        transferenciaCentavos: Number(cobrado?.transferencia ?? 0),
        chequeCentavos: Number(cobrado?.cheque ?? 0),
      },
      sobreLimite: sobre
        .filter((c) => c.limite != null)
        .map((c) => ({
          clienteId: c.clienteId,
          nombre: c.nombre,
          pendientes: Number(c.pendientes),
          limite: c.limite!,
        })),
      tramos: TRAMOS_ANTIGUEDAD.map((clave) => tramosMap.get(clave)!),
    };
  }

  private async bloqueVentas(orgId: string, filtros: FiltrosInternos) {
    const dias = fechasEnRango(filtros.desde, filtros.hasta);
    const recorte = this.productoRecorte(filtros);

    type FilaDia = { fecha: string; monto: number; pedidos: number };
    type FilaCliente = {
      clienteId: string;
      nombre: string;
      pedidos: number;
      monto: number;
    };
    let porDiaRows: FilaDia[] = [];
    let porClienteRows: FilaCliente[] = [];
    let totalCentavos = 0;

    if (recorte) {
      porDiaRows = await this.db
        .select({
          fecha: pedido.fechaOperacion,
          monto: sql<number>`coalesce(sum(${pedidoItem.cantidadEntregada} * ${pedidoItem.precioUnitarioCentavos}), 0)::int`,
          pedidos: sql<number>`count(distinct ${pedido.id})::int`,
        })
        .from(pedidoItem)
        .innerJoin(pedido, eq(pedido.id, pedidoItem.pedidoId))
        .innerJoin(producto, eq(producto.id, pedidoItem.productoId))
        .innerJoin(factura, eq(factura.pedidoId, pedido.id))
        .where(and(this.pedidoRango(orgId, filtros), recorte))
        .groupBy(pedido.fechaOperacion);

      porClienteRows = await this.db
        .select({
          clienteId: cliente.id,
          nombre: cliente.nombre,
          pedidos: sql<number>`count(distinct ${pedido.id})::int`,
          monto: sql<number>`coalesce(sum(${pedidoItem.cantidadEntregada} * ${pedidoItem.precioUnitarioCentavos}), 0)::int`,
        })
        .from(pedidoItem)
        .innerJoin(pedido, eq(pedido.id, pedidoItem.pedidoId))
        .innerJoin(producto, eq(producto.id, pedidoItem.productoId))
        .innerJoin(factura, eq(factura.pedidoId, pedido.id))
        .innerJoin(cliente, eq(cliente.id, pedido.clienteId))
        .where(and(this.pedidoRango(orgId, filtros), recorte))
        .groupBy(cliente.id, cliente.nombre);
    } else {
      porDiaRows = await this.db
        .select({
          fecha: pedido.fechaOperacion,
          monto: sql<number>`coalesce(sum(${factura.montoCentavos}), 0)::int`,
          pedidos: sql<number>`count(distinct ${pedido.id})::int`,
        })
        .from(factura)
        .innerJoin(pedido, eq(pedido.id, factura.pedidoId))
        .where(this.pedidoRango(orgId, filtros))
        .groupBy(pedido.fechaOperacion);

      porClienteRows = await this.db
        .select({
          clienteId: cliente.id,
          nombre: cliente.nombre,
          pedidos: sql<number>`count(distinct ${pedido.id})::int`,
          monto: sql<number>`coalesce(sum(${factura.montoCentavos}), 0)::int`,
        })
        .from(factura)
        .innerJoin(pedido, eq(pedido.id, factura.pedidoId))
        .innerJoin(cliente, eq(cliente.id, pedido.clienteId))
        .where(this.pedidoRango(orgId, filtros))
        .groupBy(cliente.id, cliente.nombre);
    }

    const diaMap = new Map(porDiaRows.map((r) => [r.fecha, r]));
    const porDia = dias.map((fecha) => {
      const row = diaMap.get(fecha);
      const monto = Number(row?.monto ?? 0);
      totalCentavos += monto;
      return {
        fecha,
        montoCentavos: monto,
        pedidos: Number(row?.pedidos ?? 0),
      };
    });

    const montos = porClienteRows.map((r) => Number(r.monto));
    const bases = repartirPuntosBase(montos);
    const porCliente = porClienteRows
      .map((r, i) => ({
        clienteId: r.clienteId,
        nombre: r.nombre,
        pedidos: Number(r.pedidos),
        montoCentavos: Number(r.monto),
        puntosBase: bases[i] ?? 0,
      }))
      .sort((a, b) => b.montoCentavos - a.montoCentavos);

    return {
      desde: filtros.desde,
      hasta: filtros.hasta,
      totalCentavos,
      porDia,
      porCliente,
    };
  }

  private async bloqueCobradoPorDia(
    orgId: string,
    filtros: FiltrosInternos,
  ) {
    const dias = fechasEnRango(filtros.desde, filtros.hasta);
    const rows = await this.db
      .select({
        fecha: pago.fecha,
        efectivo: sql<number>`coalesce(sum(${pago.montoCentavos}) filter (where ${pago.metodo} = 'EFECTIVO'), 0)::int`,
        transferencia: sql<number>`coalesce(sum(${pago.montoCentavos}) filter (where ${pago.metodo} = 'TRANSFERENCIA'), 0)::int`,
        cheque: sql<number>`coalesce(sum(${pago.montoCentavos}) filter (where ${pago.metodo} = 'CHEQUE'), 0)::int`,
      })
      .from(pago)
      .innerJoin(factura, eq(factura.id, pago.facturaId))
      .innerJoin(pedido, eq(pedido.id, factura.pedidoId))
      .where(
        and(
          eq(pedido.organizacionId, orgId),
          filtros.clienteId ? eq(pedido.clienteId, filtros.clienteId) : undefined,
          filtros.origen ? eq(pedido.origen, filtros.origen) : undefined,
          sql`${pago.fecha} >= ${filtros.desde}`,
          sql`${pago.fecha} <= ${filtros.hasta}`,
        ),
      )
      .groupBy(pago.fecha);
    const map = new Map(rows.map((r) => [r.fecha, r]));
    return dias.map((fecha) => {
      const row = map.get(fecha);
      return {
        fecha,
        efectivoCentavos: Number(row?.efectivo ?? 0),
        transferenciaCentavos: Number(row?.transferencia ?? 0),
        chequeCentavos: Number(row?.cheque ?? 0),
      };
    });
  }

  private async bloqueProductos(orgId: string, filtros: FiltrosInternos) {
    const recorte = this.productoRecorte(filtros);
    const rows = await this.db
      .select({
        nombreMostrado: producto.nombreCanonico,
        unidadMedida: pedidoItem.unidadMedida,
        puntoCarga: producto.puntoCarga,
        familia: producto.familia,
        cantidad: sql<number>`coalesce(sum(${pedidoItem.cantidadPedida}), 0)::int`,
        monto: sql<number>`coalesce(sum(${pedidoItem.cantidadPedida} * ${pedidoItem.precioUnitarioCentavos}), 0)::int`,
      })
      .from(pedidoItem)
      .innerJoin(pedido, eq(pedido.id, pedidoItem.pedidoId))
      .innerJoin(producto, eq(producto.id, pedidoItem.productoId))
      .where(
        and(
          this.pedidoRango(orgId, filtros),
          sql`${pedido.estado} <> 'ANULADO'`,
          recorte,
        ),
      )
      .groupBy(
        producto.nombreCanonico,
        pedidoItem.unidadMedida,
        producto.puntoCarga,
        producto.familia,
      );
    return rows
      .map((r) => ({
        nombreMostrado: r.nombreMostrado,
        unidadMedida: r.unidadMedida,
        puntoCarga: r.puntoCarga,
        familia: r.familia,
        cantidad: Number(r.cantidad),
        montoCentavos: Number(r.monto),
      }))
      .sort((a, b) => b.cantidad - a.cantidad);
  }

  private async bloqueClientes(
    orgId: string,
    filtros: FiltrosInternos,
    cal: Awaited<ReturnType<BusinessCalendarService["load"]>>,
    now: Date,
  ) {
    const fechaOp = cal.isVentanaAbierta(now)
      ? cal.getFechaOperacion(now)
      : cal.getFechaOperacionDeVentanaReciente(now);
    const corte = fechaOp < filtros.hasta ? fechaOp : filtros.hasta;
    const silencio = ultimosDiasHabiles(
      cal,
      corte,
      DIAS_HABILES_DEJO_DE_PEDIR,
    );
    const ultimoSilencio = silencio.at(-1);
    const habitoHasta = ultimoSilencio
      ? desplazarFecha(ultimoSilencio, -1)
      : corte;
    const habito = ultimosDiasHabiles(
      cal,
      habitoHasta,
      DIAS_HABILES_DEJO_DE_PEDIR,
    );
    const desde30 = desplazarFecha(corte, -DIAS_CALENDARIO_HABITO);

    const activos = await this.db
      .select({ id: cliente.id, nombre: cliente.nombre })
      .from(cliente)
      .where(
        and(
          eq(cliente.organizacionId, orgId),
          eq(cliente.activo, true),
          filtros.clienteId ? eq(cliente.id, filtros.clienteId) : undefined,
        ),
      );

    const pedidosHist = await this.db
      .select({
        clienteId: pedido.clienteId,
        fecha: pedido.fechaOperacion,
        id: pedido.id,
        estado: pedido.estado,
      })
      .from(pedido)
      .where(
        and(
          eq(pedido.organizacionId, orgId),
          sql`${pedido.fechaOperacion} >= ${desde30}`,
          sql`${pedido.fechaOperacion} <= ${corte}`,
          filtros.clienteId ? eq(pedido.clienteId, filtros.clienteId) : undefined,
          filtros.origen ? eq(pedido.origen, filtros.origen) : undefined,
        ),
      );

    const facturasRango = await this.db
      .select({
        id: factura.id,
        clienteId: pedido.clienteId,
        monto: factura.montoCentavos,
        emitidaAt: factura.emitidaAt,
        createdAt: factura.createdAt,
        fechaOperacion: pedido.fechaOperacion,
      })
      .from(factura)
      .innerJoin(pedido, eq(pedido.id, factura.pedidoId))
      .where(this.pedidoRango(orgId, filtros));

    const facturaIds = facturasRango.map((f) => f.id);
    const pagosRows = facturaIds.length
      ? await this.db.select().from(pago).where(inArray(pago.facturaId, facturaIds))
      : [];
    const pagosPorFac = new Map<string, typeof pagosRows>();
    for (const p of pagosRows) {
      const list = pagosPorFac.get(p.facturaId) ?? [];
      list.push(p);
      pagosPorFac.set(p.facturaId, list);
    }

    const vivosRango = pedidosHist.filter(
      (p) =>
        p.estado !== "ANULADO" &&
        p.fecha >= filtros.desde &&
        p.fecha <= filtros.hasta,
    );

    return activos
      .map((cli) => {
        const hist = pedidosHist.filter(
          (p) => p.clienteId === cli.id && p.estado !== "ANULADO",
        );
        const enRango = vivosRango.filter((p) => p.clienteId === cli.id);
        const facs = facturasRango.filter((f) => f.clienteId === cli.id);
        const sumaFac = facs.reduce((acc, f) => acc + f.monto, 0);
        const diasPago: number[] = [];
        for (const fac of facs) {
          const lista = (pagosPorFac.get(fac.id) ?? []).slice().sort((a, b) =>
            a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : 0,
          );
          let acc = 0;
          const emitida = fac.emitidaAt ?? fac.createdAt;
          for (const p of lista) {
            acc += p.montoCentavos;
            if (acc >= fac.monto && emitida) {
              diasPago.push(
                Math.max(
                  0,
                  cal.diasCalendarioEntre(emitida, instanteDeFecha(p.fecha)),
                ),
              );
              break;
            }
          }
        }
        const fechasPedido = [...new Set(hist.map((p) => p.fecha))];
        const dejoDePedir = evaluaDejoDePedir({
          fechasPedido,
          silencio,
          habito,
        });
        const ultimo = fechasPedido.sort().at(-1) ?? null;
        return {
          clienteId: cli.id,
          nombre: cli.nombre,
          pedidos: enRango.length,
          ticketPromedioCentavos: ticketPromedioCentavos(sumaFac, facs.length),
          diasPagoMediana: medianaEntera(diasPago),
          ultimoPedidoFecha: ultimo,
          dejoDePedir,
        };
      })
      .filter((c) => c.pedidos > 0 || c.dejoDePedir || c.ultimoPedidoFecha != null)
      .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  }
}
