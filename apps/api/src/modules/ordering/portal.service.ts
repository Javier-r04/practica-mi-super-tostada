import { Inject, Injectable } from "@nestjs/common";
import { and, asc, eq, inArray } from "drizzle-orm";
import {
  clienteProducto,
  factura,
  pago,
  pedido,
  producto,
} from "@misupertostada/db";
import {
  instanteAIso,
  portalCuentaSchema,
  portalProductoSchema,
  portalSesionSchema,
  type PortalCuenta,
  type PortalSesion,
} from "@misupertostada/shared";
import { DRIZZLE } from "../shared/tokens";
import type { AppDatabase } from "../shared/database.module";
import { AuditWriter } from "../shared/audit.writer";
import { BusinessCalendarService } from "../shared/calendar.service";
import { PedidoService, type PortalMeta } from "./pedido.service";
import { horarioDe } from "./pedido-reglas";
import type { ClientePortal } from "./portal-token.service";

@Injectable()
export class PortalService {
  constructor(
    @Inject(DRIZZLE) private readonly db: AppDatabase,
    private readonly audit: AuditWriter,
    private readonly calendar: BusinessCalendarService,
    private readonly pedidos: PedidoService,
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
    const [catalogo, pedidoAbierto, cuenta] = await Promise.all([
      this.catalogoDe(clienteRow),
      this.pedidos.portalAbierto(clienteRow.id, fechaOperacion, horario),
      this.cuentaDe(clienteRow),
    ]);

    return portalSesionSchema.parse({
      cliente: {
        id: clienteRow.id,
        nombre: clienteRow.nombre,
        horarioEntregaFijo: horario,
      },
      ventana: {
        abierta: cal.isVentanaAbierta(now),
        fechaOperacion,
        cierraAt: instanteAIso(cal.getCierreVentana(now)),
        proximaAperturaAt: instanteAIso(cal.getProximaApertura(now)),
        horarioEntregaFijo: horario,
      },
      catalogo,
      pedidoAbierto,
      cuenta,
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
      pendientes.push({
        id: fac.id,
        numeroDte: fac.numeroDte ?? null,
        montoCentavos: fac.montoCentavos,
        abonadoCentavos: abonado,
        saldoCentavos: saldo,
        emitidaAt: emitida ? instanteAIso(emitida) : null,
        antiguedadDias: cal.diasCalendarioEntre(emitida, now),
        estado: abonado > 0 ? ("ABONO_PARCIAL" as const) : ("PENDIENTE" as const),
      });
    }

    return portalCuentaSchema.parse({
      facturasPendientes: pendientes.length,
      limiteFacturasPendientes: clienteRow.limiteFacturasPendientes,
      saldoCentavos: pendientes.reduce((acc, f) => acc + f.saldoCentavos, 0),
      facturas: pendientes,
    });
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
      });
    });

    return [...filas].sort((a, b) => {
      if (a.favorito !== b.favorito) return a.favorito ? -1 : 1;
      if (a.familia !== b.familia) return a.familia.localeCompare(b.familia);
      return a.orden - b.orden;
    });
  }
}
