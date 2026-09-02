import { eq, like, or, inArray, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "../schema";
import { MEGA_SEED_MARKER } from "./marker";

type Db = PostgresJsDatabase<typeof schema>;

/**
 * Borra solo datos del mega-seed (marcados con [MEGA_SEED]).
 * No toca org, usuarios, productos ni clientes del catálogo base.
 * Si quedaron clientes ficticios de versiones anteriores del mega-seed, también los elimina.
 */
export async function clearMegaSeed(db: Db): Promise<{
  pedidos: number;
  clientes: number;
  hojas: number;
}> {
  return db.transaction(async (tx) => {
    const megaClientes = await tx
      .select({ id: schema.cliente.id })
      .from(schema.cliente)
      .where(
        like(schema.cliente.notasPermanentes, `%${MEGA_SEED_MARKER}%`),
      );
    const clienteIds = megaClientes.map((c) => c.id);

    const pedidosPorNota = await tx
      .select({
        id: schema.pedido.id,
        fechaOperacion: schema.pedido.fechaOperacion,
      })
      .from(schema.pedido)
      .where(like(schema.pedido.notasAdmin, `%${MEGA_SEED_MARKER}%`));

    const pedidosPorCliente =
      clienteIds.length > 0
        ? await tx
            .select({
              id: schema.pedido.id,
              fechaOperacion: schema.pedido.fechaOperacion,
            })
            .from(schema.pedido)
            .where(inArray(schema.pedido.clienteId, clienteIds))
        : [];

    const pedidoRows = [...pedidosPorNota, ...pedidosPorCliente];
    const pedidoIds = [...new Set(pedidoRows.map((p) => p.id))];
    const fechasMega = [
      ...new Set(pedidoRows.map((p) => p.fechaOperacion)),
    ];

    if (pedidoIds.length > 0) {
      const facturas = await tx
        .select({ id: schema.factura.id })
        .from(schema.factura)
        .where(inArray(schema.factura.pedidoId, pedidoIds));
      const facturaIds = facturas.map((f) => f.id);
      if (facturaIds.length > 0) {
        const pagosMega = await tx
          .select({ abonoId: schema.pago.abonoId })
          .from(schema.pago)
          .where(inArray(schema.pago.facturaId, facturaIds));
        const abonoIds = [
          ...new Set(pagosMega.map((p) => p.abonoId)),
        ];
        await tx
          .delete(schema.pago)
          .where(inArray(schema.pago.facturaId, facturaIds));
        if (abonoIds.length > 0) {
          await tx
            .delete(schema.abono)
            .where(inArray(schema.abono.id, abonoIds));
        }
      }
      await tx
        .delete(schema.factura)
        .where(inArray(schema.factura.pedidoId, pedidoIds));
      await tx
        .delete(schema.pedidoItem)
        .where(inArray(schema.pedidoItem.pedidoId, pedidoIds));
      await tx
        .delete(schema.pedido)
        .where(inArray(schema.pedido.id, pedidoIds));
    }

    if (clienteIds.length > 0) {
      const conversaciones = await tx
        .select({ id: schema.conversacion.id })
        .from(schema.conversacion)
        .where(inArray(schema.conversacion.clienteId, clienteIds));
      const conversacionIds = conversaciones.map((c) => c.id);
      if (conversacionIds.length > 0) {
        await tx
          .delete(schema.mensaje)
          .where(inArray(schema.mensaje.conversacionId, conversacionIds));
        await tx
          .delete(schema.conversacion)
          .where(inArray(schema.conversacion.id, conversacionIds));
      }
      const abonos = await tx
        .select({ id: schema.abono.id })
        .from(schema.abono)
        .where(inArray(schema.abono.clienteId, clienteIds));
      const abonoIds = abonos.map((a) => a.id);
      if (abonoIds.length > 0) {
        await tx
          .delete(schema.pago)
          .where(inArray(schema.pago.abonoId, abonoIds));
        await tx
          .delete(schema.abono)
          .where(inArray(schema.abono.id, abonoIds));
      }
      await tx
        .delete(schema.clienteProducto)
        .where(inArray(schema.clienteProducto.clienteId, clienteIds));
      await tx
        .delete(schema.outbox)
        .where(inArray(schema.outbox.destinatarioId, clienteIds));
      await tx
        .delete(schema.cliente)
        .where(inArray(schema.cliente.id, clienteIds));
    }

    await tx
      .delete(schema.mensaje)
      .where(
        or(
          like(schema.mensaje.bodyRenderizado, `%${MEGA_SEED_MARKER}%`),
          sql`${schema.mensaje.params}::text LIKE ${"%" + MEGA_SEED_MARKER + "%"}`,
        ),
      );

    const hojasBorradas = await tx
      .delete(schema.hojaProduccion)
      .where(like(schema.hojaProduccion.texto, `%${MEGA_SEED_MARKER}%`))
      .returning({ id: schema.hojaProduccion.id });

    await tx
      .delete(schema.domainEvents)
      .where(
        sql`${schema.domainEvents.payload}::text LIKE ${"%" + MEGA_SEED_MARKER + "%"}`,
      );

    // audit_log es append-only (trigger DB): no se borra. Queda traza del mega-seed.

    await tx
      .delete(schema.outbox)
      .where(
        sql`${schema.outbox.payload}::text LIKE ${"%" + MEGA_SEED_MARKER + "%"}`,
      );

    await tx
      .delete(schema.diaOperacion)
      .where(
        like(schema.diaOperacion.motivoReapertura, `%${MEGA_SEED_MARKER}%`),
      );

    // Abonos huérfanos de corridas fallidas (p. ej. sin pago por constraint).
    const abonosMega = await tx
      .select({ id: schema.abono.id })
      .from(schema.abono)
      .where(like(schema.abono.idempotencyKey, "mega-abono-%"));
    const abonoMegaIds = abonosMega.map((a) => a.id);
    if (abonoMegaIds.length > 0) {
      await tx
        .delete(schema.pago)
        .where(inArray(schema.pago.abonoId, abonoMegaIds));
      await tx
        .delete(schema.abono)
        .where(inArray(schema.abono.id, abonoMegaIds));
    }

    // Días que quedaron sin pedidos tras borrar el mega-seed.
    for (const fecha of fechasMega) {
      const [{ n }] = await tx
        .select({ n: sql<number>`count(*)::int` })
        .from(schema.pedido)
        .where(eq(schema.pedido.fechaOperacion, fecha));
      if (Number(n) === 0) {
        await tx
          .delete(schema.diaOperacion)
          .where(eq(schema.diaOperacion.fechaOperacion, fecha));
        await tx
          .delete(schema.hojaProduccion)
          .where(eq(schema.hojaProduccion.fechaOperacion, fecha));
      }
    }

    return {
      pedidos: pedidoIds.length,
      clientes: clienteIds.length,
      hojas: hojasBorradas.length,
    };
  });
}
