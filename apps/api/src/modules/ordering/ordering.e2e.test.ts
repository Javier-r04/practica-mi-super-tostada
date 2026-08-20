import { describe, expect, test } from "bun:test";
import { and, eq } from "drizzle-orm";
import { DateTime } from "luxon";
import {
  auditLog,
  factura,
  organizacion,
  outbox,
  pago,
  pedido,
  pedidoItem,
  usuario,
} from "@misupertostada/db";
import {
  MENSAJE_PORTAL_NO_ENCONTRADO,
  ZONA_NEGOCIO,
  fixedClock,
  permisosEfectivos,
  type Clock,
} from "@misupertostada/shared";
import { AuditWriter } from "../shared/audit.writer";
import { OutboxWriter } from "../shared/outbox.writer";
import { BusinessCalendarService } from "../shared/calendar.service";
import { openTestDb, postgresListo } from "../../test/db";
import type { Actor } from "../identity/actor";
import { ProductosService } from "../catalog/productos.service";
import { ClientesService } from "../catalog/clientes.service";
import { ClienteProductoService } from "../catalog/cliente-producto.service";
import { PortalTokenService } from "./portal-token.service";
import { PortalService } from "./portal.service";
import { PedidoService } from "./pedido.service";

const listo = await postgresListo();

function instanteGT(isoLocal: string): Date {
  const dt = DateTime.fromISO(isoLocal, { zone: ZONA_NEGOCIO });
  if (!dt.isValid) throw new Error(`instante inválido: ${isoLocal}`);
  return dt.toJSDate();
}

function relojControlado(inicial: Date): Clock & { set(d: Date): void } {
  let actual = inicial;
  return {
    now: () => actual,
    set: (d: Date) => {
      actual = d;
    },
  };
}

async function fixture(clock: Clock) {
  const { client, db } = openTestDb();
  const audit = new AuditWriter(db);
  const outboxWriter = new OutboxWriter(db);
  const calendar = new BusinessCalendarService(db, clock);
  const productos = new ProductosService(db, audit);
  const clientes = new ClientesService(db, audit);
  const ligas = new ClienteProductoService(db, audit, clientes);
  const tokens = new PortalTokenService(db);
  const pedidos = new PedidoService(db, audit, outboxWriter, calendar);
  const portal = new PortalService(db, audit, calendar, pedidos);

  const [org] = await db
    .insert(organizacion)
    .values({ nombre: `org-e2-${crypto.randomUUID()}` })
    .returning({ id: organizacion.id });

  const username = `jefe-${crypto.randomUUID().slice(0, 8)}`;
  const [jefe] = await db
    .insert(usuario)
    .values({
      organizacionId: org!.id,
      username,
      rol: "ADMIN_JEFE",
      activo: true,
    })
    .returning({ id: usuario.id });

  const actor: Actor = {
    usuarioId: jefe!.id,
    organizacionId: org!.id,
    username,
    rol: "ADMIN_JEFE",
    permisos: permisosEfectivos("ADMIN_JEFE"),
    sesionId: crypto.randomUUID(),
    ip: "127.0.0.1",
    userAgent: "test",
  };

  return {
    client,
    db,
    actor,
    orgId: org!.id,
    productos,
    clientes,
    ligas,
    tokens,
    pedidos,
    portal,
    calendar,
  };
}

const meta = { ip: "10.0.0.2", userAgent: "Mozilla/5.0 portal-test" };

describe.skipIf(!listo)("portal E2", () => {
  test("token basura, rotado e inactivo responden el mismo 404 genérico", async () => {
    const f = await fixture(fixedClock(instanteGT("2026-08-20T16:00:00")));
    try {
      const cli = await f.clientes.crear(
        { nombre: `Portal 404 ${crypto.randomUUID().slice(0, 8)}` },
        f.actor,
      );
      const { token } = await f.clientes.rotarTokenPortal(cli.id, f.actor);

      const basura = f.tokens.resolver("token-que-no-existe-nunca-jamas");
      await expect(basura).rejects.toMatchObject({
        code: "NO_ENCONTRADO",
        httpStatus: 404,
        message: MENSAJE_PORTAL_NO_ENCONTRADO,
      });

      const { token: segundo } = await f.clientes.rotarTokenPortal(
        cli.id,
        f.actor,
      );
      await expect(f.tokens.resolver(token)).rejects.toMatchObject({
        code: "NO_ENCONTRADO",
        message: MENSAJE_PORTAL_NO_ENCONTRADO,
      });
      const vigente = await f.tokens.resolver(segundo);
      expect(vigente.id).toBe(cli.id);

      await f.clientes.desactivar(cli.id, f.actor);
      await expect(f.tokens.resolver(segundo)).rejects.toMatchObject({
        code: "NO_ENCONTRADO",
        message: MENSAJE_PORTAL_NO_ENCONTRADO,
      });
    } finally {
      await f.client.end({ timeout: 1 });
    }
  });

  test("apertura audita portal.abrir sin el token crudo", async () => {
    const f = await fixture(fixedClock(instanteGT("2026-08-20T16:00:00")));
    try {
      const cli = await f.clientes.crear(
        { nombre: `Portal audit ${crypto.randomUUID().slice(0, 8)}` },
        f.actor,
      );
      const { token } = await f.clientes.rotarTokenPortal(cli.id, f.actor);
      const clienteRow = await f.tokens.resolver(token);
      const sesion = await f.portal.abrirSesion(clienteRow, meta);

      expect(sesion.cliente.nombre).toBe(cli.nombre);
      expect(JSON.stringify(sesion)).not.toContain(token);
      expect(sesion.catalogo.every((p) => !("sku" in p))).toBe(true);
      expect(sesion.catalogo.every((p) => !("puntoCarga" in p))).toBe(true);

      const audits = await f.db
        .select()
        .from(auditLog)
        .where(eq(auditLog.entidadId, cli.id));
      const apertura = audits.find((a) => a.accion === "portal.abrir");
      expect(apertura?.actorTipo).toBe("cliente");
      expect(apertura?.actorId).toBe(cli.id);
      expect(apertura?.ip).toBe(meta.ip);
      expect(JSON.stringify(apertura)).not.toContain(token);
    } finally {
      await f.client.end({ timeout: 1 });
    }
  });

  test("14:59 rechaza; 15:00 confirma snapshot; edición no duplica pedido ni outbox", async () => {
    const clock = relojControlado(instanteGT("2026-08-20T14:59:00"));
    const f = await fixture(clock);
    try {
      const tortilla = await f.productos.crear(
        {
          sku: `T16-${crypto.randomUUID().slice(0, 6)}`,
          nombreCanonico: "Tortilla No. 16 (grande)",
          familia: "TORTILLA",
          unidadMedida: "LIBRA",
          puntoCarga: "DEMOCRACIA",
        },
        f.actor,
      );
      const nachos = await f.productos.crear(
        {
          sku: `NACH-${crypto.randomUUID().slice(0, 6)}`,
          nombreCanonico: "Nachos blancos",
          familia: "FRITURA",
          unidadMedida: "BOLSA",
          puntoCarga: "PLANTA",
        },
        f.actor,
      );
      const sinPrecio = await f.productos.crear(
        {
          sku: `FAJ-${crypto.randomUUID().slice(0, 6)}`,
          nombreCanonico: "Fajitas",
          familia: "FRITURA",
          unidadMedida: "BOLSA",
          puntoCarga: "PLANTA",
        },
        f.actor,
      );
      const cli = await f.clientes.crear(
        {
          nombre: `Tabasco E2 ${crypto.randomUUID().slice(0, 8)}`,
          horarioEntregaFijo: "08:30",
        },
        f.actor,
      );
      await f.ligas.upsert(
        cli.id,
        tortilla.id,
        { alias: "tortilla grande", precioCentavos: 1250, favorito: true },
        f.actor,
      );
      await f.ligas.upsert(
        cli.id,
        nachos.id,
        { alias: "nachos blancos", precioCentavos: 1500 },
        f.actor,
      );

      const { token } = await f.clientes.rotarTokenPortal(cli.id, f.actor);
      const clienteRow = await f.tokens.resolver(token);

      await expect(
        f.pedidos.upsertPortal(
          clienteRow,
          {
            items: [{ productoId: tortilla.id, cantidad: 50 }],
          },
          meta,
        ),
      ).rejects.toMatchObject({ code: "VENTANA_CERRADA", httpStatus: 409 });

      clock.set(instanteGT("2026-08-20T15:00:00"));
      const sesionCerradaAntes = await f.portal.abrirSesion(clienteRow, meta);
      expect(sesionCerradaAntes.ventana.abierta).toBe(true);
      expect(sesionCerradaAntes.ventana.fechaOperacion).toBe("2026-08-21");
      expect(
        sesionCerradaAntes.catalogo.find((p) => p.productoId === tortilla.id)
          ?.alias,
      ).toBe("tortilla grande");
      expect(
        sesionCerradaAntes.catalogo.find((p) => p.productoId === sinPrecio.id)
          ?.pedible,
      ).toBe(false);

      await expect(
        f.pedidos.upsertPortal(
          clienteRow,
          { items: [{ productoId: sinPrecio.id, cantidad: 1 }] },
          meta,
        ),
      ).rejects.toMatchObject({ code: "PRECIO_AUSENTE" });

      const confirmado = await f.pedidos.upsertPortal(
        clienteRow,
        {
          items: [
            { productoId: tortilla.id, cantidad: 50, precioCentavos: 1 },
            { productoId: nachos.id, cantidad: 8 },
          ],
        },
        meta,
      );
      expect(confirmado.estado).toBe("CONFIRMADO");
      expect(confirmado.origen).toBe("PORTAL");
      expect(confirmado.fechaOperacion).toBe("2026-08-21");
      expect(confirmado.totalCentavos).toBe(74500);
      expect(confirmado.items[0]?.precioUnitarioCentavos).toBe(1250);
      expect(JSON.stringify(confirmado)).not.toContain(token);

      await f.ligas.upsert(
        cli.id,
        tortilla.id,
        { precioCentavos: 9999 },
        f.actor,
      );
      const sesionTrasAlza = await f.portal.abrirSesion(clienteRow, meta);
      expect(sesionTrasAlza.pedidoAbierto?.totalCentavos).toBe(74500);
      expect(
        sesionTrasAlza.pedidoAbierto?.items.find(
          (i) => i.productoId === tortilla.id,
        )?.precioUnitarioCentavos,
      ).toBe(1250);

      const editado = await f.pedidos.upsertPortal(
        clienteRow,
        {
          items: [
            { productoId: tortilla.id, cantidad: 40 },
            { productoId: nachos.id, cantidad: 8 },
          ],
        },
        meta,
      );
      expect(editado.correlativo).toBe(confirmado.correlativo);
      expect(editado.totalCentavos).toBe(40 * 1250 + 8 * 1500);

      const pedidosFilas = await f.db
        .select()
        .from(pedido)
        .where(
          and(
            eq(pedido.clienteId, cli.id),
            eq(pedido.fechaOperacion, "2026-08-21"),
            eq(pedido.origen, "PORTAL"),
          ),
        );
      expect(pedidosFilas).toHaveLength(1);

      const outboxFilas = await f.db
        .select()
        .from(outbox)
        .where(
          and(
            eq(outbox.tipo, "PedidoConfirmado"),
            eq(outbox.destinatarioId, cli.id),
            eq(outbox.fechaOperacion, "2026-08-21"),
          ),
        );
      expect(outboxFilas).toHaveLength(1);

      const audits = await f.db
        .select()
        .from(auditLog)
        .where(eq(auditLog.entidadId, pedidosFilas[0]!.id));
      expect(audits.some((a) => a.accion === "portal.confirmar")).toBe(true);
      expect(audits.some((a) => a.accion === "portal.editar")).toBe(true);
      const editar = audits.find((a) => a.accion === "portal.editar");
      expect(editar?.antes).not.toEqual(editar?.despues);

      const items = await f.db
        .select()
        .from(pedidoItem)
        .where(eq(pedidoItem.pedidoId, pedidosFilas[0]!.id));
      expect(items.every((i) => i.cantidadEntregada === i.cantidadPedida)).toBe(
        true,
      );

      clock.set(instanteGT("2026-08-21T00:00:00"));
      const sesionCerrada = await f.portal.abrirSesion(clienteRow, meta);
      expect(sesionCerrada.ventana.abierta).toBe(false);
      await expect(
        f.pedidos.upsertPortal(
          clienteRow,
          { items: [{ productoId: tortilla.id, cantidad: 10 }] },
          meta,
        ),
      ).rejects.toMatchObject({ code: "VENTANA_CERRADA", httpStatus: 409 });
    } finally {
      await f.client.end({ timeout: 1 });
    }
  });

  test("F-205 cuenta facturas: 10000 − 3000 = 7000, una pendiente", async () => {
    const now = instanteGT("2026-08-20T16:00:00");
    const f = await fixture(fixedClock(now));
    try {
      const prod = await f.productos.crear(
        {
          sku: `CUE-${crypto.randomUUID().slice(0, 6)}`,
          nombreCanonico: "Tostada grande",
          familia: "TOSTADA",
          unidadMedida: "LIBRA",
          puntoCarga: "PLANTA",
        },
        f.actor,
      );
      const cli = await f.clientes.crear(
        {
          nombre: `Cuenta E2 ${crypto.randomUUID().slice(0, 8)}`,
          limiteFacturasPendientes: 4,
        },
        f.actor,
      );
      await f.ligas.upsert(
        cli.id,
        prod.id,
        { precioCentavos: 1000 },
        f.actor,
      );

      const [pedidoPendiente] = await f.db
        .insert(pedido)
        .values({
          organizacionId: f.orgId,
          correlativo: 1,
          fechaOperacion: "2026-08-05",
          clienteId: cli.id,
          estado: "ENTREGADO",
          origen: "MANUAL",
        })
        .returning();
      const [pedidoPagado] = await f.db
        .insert(pedido)
        .values({
          organizacionId: f.orgId,
          correlativo: 2,
          fechaOperacion: "2026-08-01",
          clienteId: cli.id,
          estado: "ENTREGADO",
          origen: "MANUAL",
        })
        .returning();

      const [facPend] = await f.db
        .insert(factura)
        .values({
          pedidoId: pedidoPendiente!.id,
          numeroDte: "DTE-100",
          montoCentavos: 10000,
          emitidaAt: instanteGT("2026-08-05T10:00:00"),
        })
        .returning();
      await f.db.insert(pago).values({
        facturaId: facPend!.id,
        montoCentavos: 3000,
        metodo: "EFECTIVO",
        fecha: "2026-08-10",
      });

      const [facPagada] = await f.db
        .insert(factura)
        .values({
          pedidoId: pedidoPagado!.id,
          numeroDte: "DTE-200",
          montoCentavos: 1000,
          emitidaAt: instanteGT("2026-08-01T10:00:00"),
        })
        .returning();
      await f.db.insert(pago).values({
        facturaId: facPagada!.id,
        montoCentavos: 1000,
        metodo: "TRANSFERENCIA",
        fecha: "2026-08-02",
      });

      const { token } = await f.clientes.rotarTokenPortal(cli.id, f.actor);
      const clienteRow = await f.tokens.resolver(token);
      const cuenta = await f.portal.cuentaDe(clienteRow);

      expect(cuenta.facturasPendientes).toBe(1);
      expect(cuenta.limiteFacturasPendientes).toBe(4);
      expect(cuenta.saldoCentavos).toBe(7000);
      expect(cuenta.facturas).toHaveLength(1);
      expect(cuenta.facturas[0]?.saldoCentavos).toBe(7000);
      expect(cuenta.facturas[0]?.antiguedadDias).toBe(15);
      expect(cuenta.facturas[0]?.estado).toBe("ABONO_PARCIAL");
      expect(JSON.stringify(cuenta)).not.toMatch(/cancelad/i);
    } finally {
      await f.client.end({ timeout: 1 });
    }
  });
});
