/**
 * Vacía pedidos, hojas, días de operación, cobranza y outbox de la org seed.
 * Deja catálogo, clientes, usuarios y configuración intactos.
 *
 *   bun packages/db/src/limpiar-operacion-dev.ts
 */
import { resolve } from "node:path";
import { config } from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq, inArray, or, sql } from "drizzle-orm";
import postgres from "postgres";
import * as schema from "./schema";

config({ path: resolve(import.meta.dir, "../../../.env") });

const ORG_ID = "00000000-0000-4000-a000-000000000001";
const url =
  process.env.DATABASE_URL ??
  "postgresql://postgres:postgres@localhost:5432/misupertostada";

const client = postgres(url, { max: 1 });
const db = drizzle(client, { schema });

try {
  const clientes = await db
    .select({ id: schema.cliente.id })
    .from(schema.cliente)
    .where(eq(schema.cliente.organizacionId, ORG_ID));
  const clienteIds = clientes.map((c) => c.id);

  const pedidos = await db
    .select({ id: schema.pedido.id })
    .from(schema.pedido)
    .where(eq(schema.pedido.organizacionId, ORG_ID));
  const pedidoIds = pedidos.map((p) => p.id);

  const facturas =
    pedidoIds.length === 0
      ? []
      : await db
          .select({ id: schema.factura.id })
          .from(schema.factura)
          .where(inArray(schema.factura.pedidoId, pedidoIds));
  const facturaIds = facturas.map((f) => f.id);

  const abonos =
    clienteIds.length === 0
      ? []
      : await db
          .select({ id: schema.abono.id })
          .from(schema.abono)
          .where(inArray(schema.abono.clienteId, clienteIds));
  const abonoIds = abonos.map((a) => a.id);

  const conversaciones =
    clienteIds.length === 0
      ? []
      : await db
          .select({ id: schema.conversacion.id })
          .from(schema.conversacion)
          .where(inArray(schema.conversacion.clienteId, clienteIds));
  const conversacionIds = conversaciones.map((c) => c.id);

  await db.transaction(async (tx) => {
    if (abonoIds.length > 0) {
      await tx
        .delete(schema.pago)
        .where(inArray(schema.pago.abonoId, abonoIds));
      await tx.delete(schema.abono).where(inArray(schema.abono.id, abonoIds));
    }
    if (facturaIds.length > 0) {
      await tx
        .delete(schema.pago)
        .where(inArray(schema.pago.facturaId, facturaIds));
    }
    if (pedidoIds.length > 0) {
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
    if (conversacionIds.length > 0) {
      await tx
        .delete(schema.mensaje)
        .where(inArray(schema.mensaje.conversacionId, conversacionIds));
      await tx
        .delete(schema.conversacion)
        .where(inArray(schema.conversacion.id, conversacionIds));
    }
    await tx
      .delete(schema.hojaProduccion)
      .where(eq(schema.hojaProduccion.organizacionId, ORG_ID));
    await tx
      .delete(schema.diaOperacion)
      .where(eq(schema.diaOperacion.organizacionId, ORG_ID));
    await tx.delete(schema.outbox).where(
      or(
        eq(schema.outbox.destinatarioId, ORG_ID),
        clienteIds.length > 0
          ? inArray(schema.outbox.destinatarioId, clienteIds)
          : sql`false`,
      ),
    );
  });

  console.log(
    `[limpiar-operacion-dev] pedidos=${pedidoIds.length} abonos=${abonoIds.length} conversaciones=${conversacionIds.length}`,
  );
} finally {
  await client.end({ timeout: 5 });
}
