import { Inject, Injectable } from "@nestjs/common";
import { and, asc, desc, eq, isNull } from "drizzle-orm";
import {
  cliente,
  clienteProducto,
  hojaProduccion,
  pedido,
  pedidoItem,
  producto,
} from "@misupertostada/db";
import {
  MENSAJE_HOJA_NO_MATERIALIZADA,
  diffHojas,
  gruposPorPuntoCarga,
  hojaPublicaSchema,
  hojaSnapshotSchema,
  instanteAIso,
  textoHoja,
  type BloqueCliente,
  type HojaPublica,
  type HojaSnapshot,
  type LineaClienteItem,
  type LineaProducto,
} from "@misupertostada/shared";
import { renderHojaPdf } from "@misupertostada/pdf";
import { DRIZZLE } from "../shared/tokens";
import type { AppDatabase } from "../shared/database.module";
import { BusinessCalendarService } from "../shared/calendar.service";
import { DomainException } from "../shared/domain.exception";
import { leerEstadoDia } from "../shared/dia-operacion";
import type { BusinessCalendar } from "@misupertostada/shared";

@Injectable()
export class HojaService {
  constructor(
    @Inject(DRIZZLE) private readonly db: AppDatabase,
    private readonly calendar: BusinessCalendarService,
  ) {}

  async construirSnapshot(
    organizacionId: string,
    fechaOperacion: string,
    version: number,
    cal: BusinessCalendar,
    tx: AppDatabase = this.db,
  ): Promise<HojaSnapshot> {
    const filas = await tx
      .select({
        clienteId: cliente.id,
        clienteNombre: cliente.nombre,
        horario: cliente.horarioEntregaFijo,
        notasPermanentes: cliente.notasPermanentes,
        notasAdmin: pedido.notasAdmin,
        productoId: producto.id,
        // Nomenclatura de producción (catálogo vivo), no el alias del pedido.
        nombreCanonico: producto.nombreCanonico,
        unidadMedida: producto.unidadMedida,
        puntoCarga: producto.puntoCarga,
        familia: producto.familia,
        cantidad: pedidoItem.cantidadPedida,
        notaProduccion: clienteProducto.notaProduccion,
      })
      .from(pedido)
      .innerJoin(cliente, eq(cliente.id, pedido.clienteId))
      .innerJoin(pedidoItem, eq(pedidoItem.pedidoId, pedido.id))
      .innerJoin(producto, eq(producto.id, pedidoItem.productoId))
      .leftJoin(
        clienteProducto,
        and(
          eq(clienteProducto.clienteId, pedido.clienteId),
          eq(clienteProducto.productoId, pedidoItem.productoId),
        ),
      )
      .where(
        and(
          eq(pedido.organizacionId, organizacionId),
          eq(pedido.fechaOperacion, fechaOperacion),
          eq(pedido.estado, "CONFIRMADO"),
          isNull(pedido.anuladoAt),
        ),
      )
      .orderBy(asc(cliente.nombre), asc(producto.nombreCanonico));

    const clientesMap = new Map<string, BloqueCliente>();
    const productoAgg = new Map<
      string,
      LineaProducto & { notas: Set<string> }
    >();

    for (const fila of filas) {
      const puntoCargaEfectivo = cal.puntoCargaEfectivo(
        fila.puntoCarga,
        fechaOperacion,
      );
      const horario = fila.horario ? String(fila.horario).slice(0, 5) : null;
      const nota = fila.notaProduccion?.trim() || null;

      let bloque = clientesMap.get(fila.clienteId);
      if (!bloque) {
        bloque = {
          clienteId: fila.clienteId,
          nombre: fila.clienteNombre,
          horarioEntregaFijo: horario,
          notasPermanentes: fila.notasPermanentes,
          notasAdmin: null,
          items: [],
        };
        clientesMap.set(fila.clienteId, bloque);
      }
      if (fila.notasAdmin?.trim()) {
        const actuales = bloque.notasAdmin
          ? bloque.notasAdmin.split(" · ")
          : [];
        if (!actuales.includes(fila.notasAdmin.trim())) {
          actuales.push(fila.notasAdmin.trim());
          bloque.notasAdmin = actuales.join(" · ");
        }
      }

      const itemExistente = bloque.items.find(
        (i) => i.productoId === fila.productoId,
      );
      if (itemExistente) {
        itemExistente.cantidad += fila.cantidad;
      } else {
        const item: LineaClienteItem = {
          productoId: fila.productoId,
          nombreCanonico: fila.nombreCanonico,
          unidadMedida: fila.unidadMedida,
          cantidad: fila.cantidad,
          puntoCargaEfectivo,
          notaProduccion: nota,
        };
        bloque.items.push(item);
      }

      const prod = productoAgg.get(fila.productoId);
      const notaProducto = nota ? `${nota} · ${fila.clienteNombre}` : null;
      if (prod) {
        prod.cantidad += fila.cantidad;
        if (notaProducto) prod.notas.add(notaProducto);
      } else {
        productoAgg.set(fila.productoId, {
          productoId: fila.productoId,
          nombreCanonico: fila.nombreCanonico,
          unidadMedida: fila.unidadMedida,
          cantidad: fila.cantidad,
          puntoCargaEfectivo,
          notaProduccion: null,
          familia: fila.familia,
          notas: new Set(notaProducto ? [notaProducto] : []),
        });
      }
    }

    const productos: LineaProducto[] = [...productoAgg.values()]
      .map(({ notas, ...linea }) => ({
        ...linea,
        notaProduccion: notas.size > 0 ? [...notas].join("; ") : null,
      }))
      .sort((a, b) => a.nombreCanonico.localeCompare(b.nombreCanonico, "es"));

    const clientes = [...clientesMap.values()].sort((a, b) =>
      a.nombre.localeCompare(b.nombre, "es"),
    );

    return hojaSnapshotSchema.parse({
      fechaOperacion,
      fechaEntrega: cal.getFechaEntrega(fechaOperacion),
      esSabado: cal.isSabado(fechaOperacion),
      version,
      productos,
      clientes,
    });
  }

  async materializar(
    organizacionId: string,
    fechaOperacion: string,
    version: number,
    generadoPor: string | null,
    cal: BusinessCalendar,
    tx: AppDatabase,
  ): Promise<{ snapshot: HojaSnapshot; texto: string }> {
    let snapshot = await this.construirSnapshot(
      organizacionId,
      fechaOperacion,
      version,
      cal,
      tx,
    );

    let previa: HojaSnapshot | null = null;
    if (version > 1) {
      const [row] = await tx
        .select()
        .from(hojaProduccion)
        .where(
          and(
            eq(hojaProduccion.organizacionId, organizacionId),
            eq(hojaProduccion.fechaOperacion, fechaOperacion),
            eq(hojaProduccion.version, version - 1),
          ),
        )
        .limit(1);
      if (row) previa = hojaSnapshotSchema.parse(row.snapshot);
    }
    if (previa) snapshot = diffHojas(previa, snapshot);

    const texto = textoHoja(snapshot, { soloCambios: version > 1 });
    await tx.insert(hojaProduccion).values({
      organizacionId,
      fechaOperacion,
      version,
      snapshot,
      texto,
      generadoPor,
    });
    return { snapshot, texto };
  }

  async obtener(
    organizacionId: string,
    fechaOperacion: string,
  ): Promise<HojaPublica> {
    const [row] = await this.db
      .select()
      .from(hojaProduccion)
      .where(
        and(
          eq(hojaProduccion.organizacionId, organizacionId),
          eq(hojaProduccion.fechaOperacion, fechaOperacion),
        ),
      )
      .orderBy(desc(hojaProduccion.version))
      .limit(1);
    if (!row) {
      throw new DomainException(
        "HOJA_NO_MATERIALIZADA",
        MENSAJE_HOJA_NO_MATERIALIZADA,
        404,
      );
    }
    const snapshot = hojaSnapshotSchema.parse(row.snapshot);
    const { diaEstado, motivoReapertura } = await leerEstadoDia(
      this.db,
      organizacionId,
      fechaOperacion,
    );
    const dia =
      diaEstado === "SIN_CIERRE"
        ? "ABIERTO"
        : diaEstado === "CERRADO"
          ? "CERRADO"
          : "REABIERTO";
    return hojaPublicaSchema.parse({
      fechaOperacion,
      version: row.version,
      esSabado: snapshot.esSabado,
      diaEstado: dia,
      motivoReapertura,
      generadoAt: instanteAIso(row.generadoAt),
      texto: row.texto,
      snapshot,
      grupos: gruposPorPuntoCarga(snapshot),
    });
  }

  async textoPlano(
    organizacionId: string,
    fechaOperacion: string,
  ): Promise<string> {
    const hoja = await this.obtener(organizacionId, fechaOperacion);
    return hoja.texto;
  }

  async pdf(
    organizacionId: string,
    fechaOperacion: string,
  ): Promise<Buffer> {
    const hoja = await this.obtener(organizacionId, fechaOperacion);
    return renderHojaPdf({
      snapshot: hoja.snapshot,
      texto: hoja.texto,
      version: hoja.version,
      generadoAt: hoja.generadoAt,
    });
  }
}
