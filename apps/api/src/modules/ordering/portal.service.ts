import { Inject, Injectable } from "@nestjs/common";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import {
  clienteProducto,
  factura,
  pago,
  pedido,
  pedidoItem,
  producto,
} from "@misupertostada/db";
import {
  instanteAIso,
  portalCuentaSchema,
  portalHistorialSchema,
  portalPedidoDetalleClienteSchema,
  portalPedidoResumenSchema,
  portalProductoSchema,
  portalSesionSchema,
  estadoFactura,
  saludoPortalDe,
  totalPedidoCentavos,
  MENSAJE_PEDIDO_PORTAL_NO_ENCONTRADO,
  type PortalCuenta,
  type PortalHistorial,
  type PortalPedidoDetalleCliente,
  type PortalPedidoResumen,
  type PortalSesion,
} from "@misupertostada/shared";
import { DRIZZLE } from "../shared/tokens";
import type { AppDatabase } from "../shared/database.module";
import { AuditWriter } from "../shared/audit.writer";
import { BusinessCalendarService } from "../shared/calendar.service";
import { DomainException } from "../shared/domain.exception";
import { AssetsService } from "../shared/storage/assets.service";
import { PedidoService, type PortalMeta } from "./pedido.service";
import { horarioDe } from "./pedido-reglas";
import type { ClientePortal } from "./portal-token.service";
import { leerEstadoDia } from "../shared/dia-operacion";

const HISTORIAL_DEFAULT = 20;

@Injectable()
export class PortalService {
  constructor(
    @Inject(DRIZZLE) private readonly db: AppDatabase,
    private readonly audit: AuditWriter,
    private readonly calendar: BusinessCalendarService,
    private readonly pedidos: PedidoService,
    private readonly assets: AssetsService,
  ) {}

  async abrirSesion(
    clienteRow: ClientePortal,
    meta: PortalMeta,
  ): Promise<PortalSesion> {
    await this.audit.insert({
      actorTipo: "cliente",
      actorId: clienteRow.id,
      accion: "portal.abrir",
      entidad: "cliente",
      entidadId: clienteRow.id,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    const cal = await this.calendar.load();
    const now = this.calendar.now();
    const fechaOperacion = cal.getFechaOperacion(now);
    const horario = horarioDe(clienteRow);
    const { diaEstado } = await leerEstadoDia(
      this.db,
      clienteRow.organizacionId,
      fechaOperacion,
    );
    const [catalogo, pedidoAbierto, cuenta, ultimoPedido] = await Promise.all([
      this.catalogoDe(clienteRow),
      this.pedidos.portalAbierto(clienteRow.id, fechaOperacion, horario),
      this.cuentaDe(clienteRow),
      this.ultimoPedidoDe(clienteRow.id),
    ]);

    return portalSesionSchema.parse({
      cliente: {
        id: clienteRow.id,
        nombre: clienteRow.nombre,
        horarioEntregaFijo: horario,
      },
      ventana: {
        abierta: cal.isVentanaAbierta(now) && diaEstado !== "CERRADO",
        fechaOperacion,
        cierraAt: instanteAIso(cal.getCierreVentana(now)),
        proximaAperturaAt: instanteAIso(cal.getProximaApertura(now)),
        horarioEntregaFijo: horario,
      },
      catalogo,
      pedidoAbierto,
      cuenta,
      ahoraIso: instanteAIso(now),
      saludo: saludoPortalDe(now),
      ultimoPedido,
    });
  }

  async cuentaDe(clienteRow: ClientePortal): Promise<PortalCuenta> {
    const cal = await this.calendar.load();
    const now = this.calendar.now();
    const filas = await this.db
      .select({
        factura: factura,
        pedido: pedido,
      })
      .from(factura)
      .innerJoin(pedido, eq(factura.pedidoId, pedido.id))
      .where(eq(pedido.clienteId, clienteRow.id));

    const ids = filas.map((fila) => fila.factura.id);
    const pagos = ids.length
      ? await this.db.select().from(pago).where(inArray(pago.facturaId, ids))
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
      const antiguedadDias = emitida ? cal.diasCalendarioEntre(emitida, now) : 0;
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

    return portalCuentaSchema.parse({
      facturasPendientes: pendientes.length,
      limiteFacturasPendientes: clienteRow.limiteFacturasPendientes,
      saldoCentavos: pendientes.reduce((acc, f) => acc + f.saldoCentavos, 0),
      facturas: pendientes,
    });
  }

  async listarPedidos(
    clienteRow: ClientePortal,
    meta: PortalMeta,
    opts?: { limit?: number; offset?: number },
  ): Promise<PortalHistorial> {
    await this.audit.insert({
      actorTipo: "cliente",
      actorId: clienteRow.id,
      accion: "portal.historial",
      entidad: "cliente",
      entidadId: clienteRow.id,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    const limit = Math.min(Math.max(opts?.limit ?? HISTORIAL_DEFAULT, 1), 50);
    const offset = Math.max(opts?.offset ?? 0, 0);

    const rows = await this.db
      .select({
        id: pedido.id,
        correlativo: pedido.correlativo,
        fechaOperacion: pedido.fechaOperacion,
        estado: pedido.estado,
        origen: pedido.origen,
      })
      .from(pedido)
      .where(eq(pedido.clienteId, clienteRow.id))
      .orderBy(desc(pedido.fechaOperacion), desc(pedido.correlativo))
      .limit(limit + 1)
      .offset(offset);

    const page = rows.slice(0, limit);
    const totales = await this.totalesDe(page.map((r) => r.id));
    const items = page.map((row) =>
      portalPedidoResumenSchema.parse({
        id: row.id,
        correlativo: row.correlativo,
        fechaOperacion: row.fechaOperacion,
        estado: row.estado,
        totalCentavos: totales.get(row.id) ?? 0,
        origen: row.origen,
      }),
    );

    return portalHistorialSchema.parse({
      items,
      nextOffset: rows.length > limit ? offset + limit : null,
    });
  }

  async obtenerPedido(
    clienteRow: ClientePortal,
    pedidoId: string,
    meta: PortalMeta,
  ): Promise<PortalPedidoDetalleCliente> {
    const [row] = await this.db
      .select()
      .from(pedido)
      .where(eq(pedido.id, pedidoId))
      .limit(1);

    if (!row || row.clienteId !== clienteRow.id) {
      throw new DomainException(
        "NO_ENCONTRADO",
        MENSAJE_PEDIDO_PORTAL_NO_ENCONTRADO,
        404,
      );
    }

    await this.audit.insert({
      actorTipo: "cliente",
      actorId: clienteRow.id,
      accion: "portal.pedido.ver",
      entidad: "pedido",
      entidadId: row.id,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    const itemsRows = await this.db
      .select({
        item: pedidoItem,
        fotoAssetId: producto.fotoAssetId,
      })
      .from(pedidoItem)
      .leftJoin(producto, eq(producto.id, pedidoItem.productoId))
      .where(eq(pedidoItem.pedidoId, row.id));

    const items = itemsRows.map(({ item, fotoAssetId }) => ({
      productoId: item.productoId,
      cantidad: item.cantidadPedida,
      nombreMostrado: item.nombreMostrado,
      unidadMedida: item.unidadMedida,
      precioUnitarioCentavos: item.precioUnitarioCentavos,
      subtotalCentavos: item.cantidadPedida * item.precioUnitarioCentavos,
      fotoAssetId: fotoAssetId ?? null,
    }));

    const totalCentavos = totalPedidoCentavos(
      items.map((i) => ({
        cantidad: i.cantidad,
        precioUnitarioCentavos: i.precioUnitarioCentavos,
      })),
    );

    const facturaInfo = await this.facturaDePedido(row.id);

    return portalPedidoDetalleClienteSchema.parse({
      id: row.id,
      correlativo: row.correlativo,
      fechaOperacion: row.fechaOperacion,
      estado: row.estado,
      totalCentavos,
      origen: row.origen,
      items,
      factura: facturaInfo,
    });
  }

  /**
   * Bytes de un asset solo si es foto de producto activo de la org
   * o foto del propio cliente. Cualquier otro UUID → 404 genérico.
   */
  async assetContent(
    clienteRow: ClientePortal,
    assetId: string,
    variante?: "thumb" | "card",
  ): Promise<{ bytes: Buffer; mime: string }> {
    const permitido = await this.assetPermitido(clienteRow, assetId);
    if (!permitido) {
      throw new DomainException("NO_ENCONTRADO", "Archivo no encontrado", 404);
    }
    return this.assets.getContent(assetId, variante);
  }

  private async assetPermitido(
    clienteRow: ClientePortal,
    assetId: string,
  ): Promise<boolean> {
    if (clienteRow.fotoAssetId === assetId) return true;

    const [prod] = await this.db
      .select({ id: producto.id })
      .from(producto)
      .where(
        and(
          eq(producto.fotoAssetId, assetId),
          eq(producto.organizacionId, clienteRow.organizacionId),
          eq(producto.activo, true),
        ),
      )
      .limit(1);
    return Boolean(prod);
  }

  private async ultimoPedidoDe(
    clienteId: string,
  ): Promise<PortalPedidoResumen | null> {
    const [row] = await this.db
      .select({
        id: pedido.id,
        correlativo: pedido.correlativo,
        fechaOperacion: pedido.fechaOperacion,
        estado: pedido.estado,
        origen: pedido.origen,
      })
      .from(pedido)
      .where(eq(pedido.clienteId, clienteId))
      .orderBy(desc(pedido.fechaOperacion), desc(pedido.correlativo))
      .limit(1);
    if (!row) return null;
    const totales = await this.totalesDe([row.id]);
    return portalPedidoResumenSchema.parse({
      id: row.id,
      correlativo: row.correlativo,
      fechaOperacion: row.fechaOperacion,
      estado: row.estado,
      totalCentavos: totales.get(row.id) ?? 0,
      origen: row.origen,
    });
  }

  private async totalesDe(ids: string[]): Promise<Map<string, number>> {
    const totales = new Map<string, number>();
    if (ids.length === 0) return totales;
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
    return totales;
  }

  private async facturaDePedido(pedidoId: string) {
    const [fac] = await this.db
      .select()
      .from(factura)
      .where(eq(factura.pedidoId, pedidoId))
      .limit(1);
    if (!fac) return null;

    const pagos = await this.db
      .select()
      .from(pago)
      .where(eq(pago.facturaId, fac.id));
    const abonado = pagos.reduce((acc, p) => acc + p.montoCentavos, 0);
    const saldo = Math.max(0, fac.montoCentavos - abonado);
    const cal = await this.calendar.load();
    const now = this.calendar.now();
    const emitida = fac.emitidaAt ?? fac.createdAt;
    const antiguedadDias = emitida ? cal.diasCalendarioEntre(emitida, now) : 0;
    const estado = estadoFactura({
      montoCentavos: fac.montoCentavos,
      abonadoCentavos: abonado,
      antiguedadDias,
    });

    return {
      id: fac.id,
      numeroDte: fac.numeroDte ?? null,
      saldoCentavos: saldo,
      estado,
    };
  }

  private async catalogoDe(clienteRow: ClientePortal) {
    const productos = await this.db
      .select()
      .from(producto)
      .where(
        and(
          eq(producto.organizacionId, clienteRow.organizacionId),
          eq(producto.activo, true),
        ),
      )
      .orderBy(asc(producto.familia), asc(producto.orden));

    const ligas = await this.db
      .select()
      .from(clienteProducto)
      .where(eq(clienteProducto.clienteId, clienteRow.id));
    const ligaPorProducto = new Map(ligas.map((l) => [l.productoId, l]));

    const filas = productos.map((p) => {
      const liga = ligaPorProducto.get(p.id);
      const precioCentavos = liga?.precioCentavos ?? null;
      const alias = liga?.alias?.trim() || p.nombreCanonico;
      return portalProductoSchema.parse({
        productoId: p.id,
        alias,
        nombreCanonico: p.nombreCanonico,
        unidadMedida: p.unidadMedida,
        precioCentavos,
        favorito: liga?.favorito ?? false,
        familia: p.familia,
        orden: liga?.orden ?? p.orden,
        pedible: precioCentavos != null,
        fotoAssetId: p.fotoAssetId ?? null,
      });
    });

    return [...filas].sort((a, b) => {
      if (a.favorito !== b.favorito) return a.favorito ? -1 : 1;
      if (a.familia !== b.familia) return a.familia.localeCompare(b.familia);
      return a.orden - b.orden;
    });
  }
}
