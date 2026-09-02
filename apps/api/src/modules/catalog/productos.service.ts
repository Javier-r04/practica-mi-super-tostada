import { Inject, Injectable } from "@nestjs/common";
import { and, asc, eq } from "drizzle-orm";
import { producto } from "@misupertostada/db";
import {
  crearProductoRequestSchema,
  editarProductoRequestSchema,
  productoPublicoSchema,
  reordenarProductosRequestSchema,
  tienePermiso,
  type ProductoPublico,
} from "@misupertostada/shared";
import { DRIZZLE } from "../shared/tokens";
import type { AppDatabase } from "../shared/database.module";
import { AuditWriter } from "../shared/audit.writer";
import { PedidoEvents } from "../shared/panel-events";
import { DomainException } from "../shared/domain.exception";
import { parseBody } from "../shared/zod-body";
import type { Actor } from "../identity/actor";
import { esViolacionUnica } from "./catalog.util";

@Injectable()
export class ProductosService {
  constructor(
    @Inject(DRIZZLE) private readonly db: AppDatabase,
    private readonly audit: AuditWriter,
    private readonly events: PedidoEvents,
  ) {}

  async listar(actor: Actor): Promise<ProductoPublico[]> {
    const rows = await this.db
      .select()
      .from(producto)
      .where(eq(producto.organizacionId, actor.organizacionId))
      .orderBy(asc(producto.familia), asc(producto.orden), asc(producto.nombreCanonico));
    return rows.map(presentarProducto);
  }

  async crear(body: unknown, actor: Actor): Promise<ProductoPublico> {
    const input = parseBody(crearProductoRequestSchema, body);
    const cambiaPrecioBase =
      Object.prototype.hasOwnProperty.call(input, "precioBaseCentavos") &&
      input.precioBaseCentavos != null;
    if (cambiaPrecioBase && !tienePermiso(actor.permisos, "precios.cambiar")) {
      throw new DomainException(
        "PERMISO_DENEGADO",
        "No tiene permiso para cambiar precios",
        403,
      );
    }
    const orden =
      input.orden ?? (await this.siguienteOrden(actor.organizacionId, input.familia));
    try {
      const [row] = await this.db
        .insert(producto)
        .values({
          organizacionId: actor.organizacionId,
          sku: input.sku,
          nombreCanonico: input.nombreCanonico,
          familia: input.familia,
          unidadMedida: input.unidadMedida,
          puntoCarga: input.puntoCarga,
          esProducido: input.esProducido,
          precioBaseCentavos: input.precioBaseCentavos ?? null,
          fotoAssetId: input.fotoAssetId ?? null,
          orden,
          activo: true,
        })
        .returning();
      if (!row) {
        throw new DomainException("SKU_EN_USO", "Ya existe un producto con ese SKU", 409);
      }
      await this.audit.insert({
        actorTipo: "usuario",
        actorId: actor.usuarioId,
        accion: "productos.crear",
        entidad: "producto",
        entidadId: row.id,
        despues: presentarProducto(row),
        ip: actor.ip,
        userAgent: actor.userAgent,
      });
      if (row.precioBaseCentavos != null) {
        await this.audit.insert({
          actorTipo: "usuario",
          actorId: actor.usuarioId,
          accion: "productos.precio",
          entidad: "producto",
          entidadId: row.id,
          antes: { precioBaseCentavos: null },
          despues: { precioBaseCentavos: row.precioBaseCentavos },
          ip: actor.ip,
          userAgent: actor.userAgent,
        });
        this.events.emit({
          organizacionId: actor.organizacionId,
          tipo: "producto.precio",
          productoId: row.id,
        });
      }
      return presentarProducto(row);
    } catch (err) {
      if (esViolacionUnica(err)) {
        throw new DomainException("SKU_EN_USO", "Ya existe un producto con ese SKU", 409);
      }
      throw err;
    }
  }

  async editar(id: string, body: unknown, actor: Actor): Promise<ProductoPublico> {
    const input = parseBody(editarProductoRequestSchema, body);
    const actual = await this.owned(id, actor.organizacionId);
    const precioBaseAnterior = actual.precioBaseCentavos ?? null;
    const cambiaPrecioBase =
      Object.prototype.hasOwnProperty.call(input, "precioBaseCentavos") &&
      input.precioBaseCentavos !== precioBaseAnterior;
    if (cambiaPrecioBase && !tienePermiso(actor.permisos, "precios.cambiar")) {
      throw new DomainException(
        "PERMISO_DENEGADO",
        "No tiene permiso para cambiar precios",
        403,
      );
    }
    try {
      const [row] = await this.db
        .update(producto)
        .set({
          sku: input.sku ?? actual.sku,
          nombreCanonico: input.nombreCanonico ?? actual.nombreCanonico,
          familia: input.familia ?? actual.familia,
          unidadMedida: input.unidadMedida ?? actual.unidadMedida,
          puntoCarga: input.puntoCarga ?? actual.puntoCarga,
          esProducido: input.esProducido ?? actual.esProducido,
          precioBaseCentavos: cambiaPrecioBase
            ? (input.precioBaseCentavos ?? null)
            : precioBaseAnterior,
          fotoAssetId:
            input.fotoAssetId === undefined ? actual.fotoAssetId : input.fotoAssetId,
          orden: input.orden ?? actual.orden,
        })
        .where(eq(producto.id, id))
        .returning();
      if (!row) {
        throw new DomainException("NO_ENCONTRADO", "Producto no encontrado", 404);
      }
      await this.audit.insert({
        actorTipo: "usuario",
        actorId: actor.usuarioId,
        accion: "productos.editar",
        entidad: "producto",
        entidadId: id,
        antes: presentarProducto(actual),
        despues: presentarProducto(row),
        ip: actor.ip,
        userAgent: actor.userAgent,
      });
      if (cambiaPrecioBase) {
        await this.audit.insert({
          actorTipo: "usuario",
          actorId: actor.usuarioId,
          accion: "productos.precio",
          entidad: "producto",
          entidadId: id,
          antes: { precioBaseCentavos: precioBaseAnterior },
          despues: { precioBaseCentavos: input.precioBaseCentavos ?? null },
          ip: actor.ip,
          userAgent: actor.userAgent,
        });
        this.events.emit({
          organizacionId: actor.organizacionId,
          tipo: "producto.precio",
          productoId: id,
        });
      }
      return presentarProducto(row);
    } catch (err) {
      if (esViolacionUnica(err)) {
        throw new DomainException("SKU_EN_USO", "Ya existe un producto con ese SKU", 409);
      }
      throw err;
    }
  }

  async desactivar(id: string, actor: Actor): Promise<ProductoPublico> {
    return this.setActivo(id, false, actor, "productos.desactivar");
  }

  async activar(id: string, actor: Actor): Promise<ProductoPublico> {
    return this.setActivo(id, true, actor, "productos.activar");
  }

  async reordenar(body: unknown, actor: Actor): Promise<ProductoPublico[]> {
    const input = parseBody(reordenarProductosRequestSchema, body);
    const deFamilia = await this.db
      .select()
      .from(producto)
      .where(
        and(
          eq(producto.organizacionId, actor.organizacionId),
          eq(producto.familia, input.familia),
        ),
      );
    const idsSet = new Set(input.ids);
    if (
      deFamilia.length !== input.ids.length ||
      deFamilia.some((p) => !idsSet.has(p.id))
    ) {
      throw new DomainException(
        "VALIDACION",
        "La lista no coincide con los productos de esa familia",
        400,
      );
    }
    await this.db.transaction(async (tx) => {
      for (let i = 0; i < input.ids.length; i++) {
        await tx
          .update(producto)
          .set({ orden: i + 1 })
          .where(eq(producto.id, input.ids[i]!));
      }
      await this.audit.insert(
        {
          actorTipo: "usuario",
          actorId: actor.usuarioId,
          accion: "productos.reordenar",
          entidad: "producto",
          entidadId: actor.organizacionId,
          despues: { familia: input.familia, ids: input.ids },
          ip: actor.ip,
          userAgent: actor.userAgent,
        },
        tx,
      );
    });
    return this.listar(actor);
  }

  private async setActivo(
    id: string,
    activo: boolean,
    actor: Actor,
    accion: string,
  ): Promise<ProductoPublico> {
    const actual = await this.owned(id, actor.organizacionId);
    const [row] = await this.db
      .update(producto)
      .set({ activo })
      .where(eq(producto.id, id))
      .returning();
    if (!row) {
      throw new DomainException("NO_ENCONTRADO", "Producto no encontrado", 404);
    }
    await this.audit.insert({
      actorTipo: "usuario",
      actorId: actor.usuarioId,
      accion,
      entidad: "producto",
      entidadId: id,
      antes: { activo: actual.activo },
      despues: { activo },
      ip: actor.ip,
      userAgent: actor.userAgent,
    });
    return presentarProducto(row);
  }

  private async siguienteOrden(
    organizacionId: string,
    familia: ProductoPublico["familia"],
  ): Promise<number> {
    const rows = await this.db
      .select({ orden: producto.orden })
      .from(producto)
      .where(
        and(
          eq(producto.organizacionId, organizacionId),
          eq(producto.familia, familia),
        ),
      );
    return rows.reduce((max, r) => Math.max(max, r.orden), 0) + 1;
  }

  private async owned(id: string, organizacionId: string) {
    const [row] = await this.db
      .select()
      .from(producto)
      .where(and(eq(producto.id, id), eq(producto.organizacionId, organizacionId)))
      .limit(1);
    if (!row) {
      throw new DomainException("NO_ENCONTRADO", "Producto no encontrado", 404);
    }
    return row;
  }
}

function presentarProducto(row: typeof producto.$inferSelect): ProductoPublico {
  return productoPublicoSchema.parse({
    id: row.id,
    sku: row.sku,
    nombreCanonico: row.nombreCanonico,
    familia: row.familia,
    unidadMedida: row.unidadMedida,
    puntoCarga: row.puntoCarga,
    esProducido: row.esProducido,
    precioBaseCentavos: row.precioBaseCentavos ?? null,
    fotoAssetId: row.fotoAssetId ?? null,
    orden: row.orden,
    activo: row.activo,
  });
}
