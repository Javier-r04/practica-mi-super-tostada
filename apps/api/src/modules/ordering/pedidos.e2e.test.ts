import { describe, expect, test } from "bun:test";
import { and, eq } from "drizzle-orm";
import { DateTime } from "luxon";
import {
  auditLog,
  organizacion,
  outbox,
  pedido,
  usuario,
} from "@misupertostada/db";
import {
  COPY_PEDIDO_ANULADO,
  MENSAJE_PRECIO_AUSENTE,
  ZONA_NEGOCIO,
  fixedClock,
  permisosEfectivos,
  type Clock,
  type PedidoSseEvent,
} from "@misupertostada/shared";
import { AuditWriter } from "../shared/audit.writer";
import { OutboxWriter } from "../shared/outbox.writer";
import { BusinessCalendarService } from "../shared/calendar.service";
import {
  crearOrgDePrueba,
  openTestDb,
  postgresListo,
} from "../../test/db";
import type { Actor } from "../identity/actor";
import { ProductosService } from "../catalog/productos.service";
import { ClientesService } from "../catalog/clientes.service";
import { ClienteProductoService } from "../catalog/cliente-producto.service";
import { PortalTokenService } from "./portal-token.service";
import { PedidoService } from "./pedido.service";
import { PedidoEvents } from "./pedido-events";

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
  const events = new PedidoEvents();
  const productos = new ProductosService(db, audit);
  const clientes = new ClientesService(db, audit);
  const ligas = new ClienteProductoService(db, audit, clientes);
  const pedidos = new PedidoService(db, audit, outboxWriter, calendar, events);

  const org = await crearOrgDePrueba(db, "org-e3-");

  const username = `cristian-${crypto.randomUUID().slice(0, 8)}`;
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
    userAgent: "test-panel",
  };

  const alexUser = `alex-${crypto.randomUUID().slice(0, 8)}`;
  const [alex] = await db
    .insert(usuario)
    .values({
      organizacionId: org!.id,
      username: alexUser,
      rol: "PRODUCCION",
      activo: true,
    })
    .returning({ id: usuario.id });

  const actorProduccion: Actor = {
    usuarioId: alex!.id,
    organizacionId: org!.id,
    username: alexUser,
    rol: "PRODUCCION",
    permisos: permisosEfectivos("PRODUCCION"),
    sesionId: crypto.randomUUID(),
    ip: "127.0.0.1",
    userAgent: "test-alex",
  };

  return {
    client,
    db,
    actor,
    actorProduccion,
    orgId: org!.id,
    productos,
    clientes,
    ligas,
    pedidos,
    events,
    calendar,
  };
}

async function catalogoTienda6(
  f: Awaited<ReturnType<typeof fixture>>,
  extras?: { horario?: string; notaProduccion?: string },
) {
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
  const papalinas = await f.productos.crear(
    {
      sku: `PAP-${crypto.randomUUID().slice(0, 6)}`,
      nombreCanonico: "Papalinas barbacoa",
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
      nombre: `Tienda 6 ${crypto.randomUUID().slice(0, 8)}`,
      horarioEntregaFijo: extras?.horario ?? "09:00",
      notasPermanentes: "llevar junto con las tortillas de la mañana",
    },
    f.actor,
  );
  await f.ligas.upsert(
    cli.id,
    tortilla.id,
    {
      alias: "tortilla grande",
      precioCentavos: 1250,
      notaProduccion: extras?.notaProduccion ?? "GRUESAS",
    },
    f.actor,
  );
  await f.ligas.upsert(
    cli.id,
    papalinas.id,
    { alias: "papalinas", precioCentavos: 1500 },
    f.actor,
  );
  return { tortilla, papalinas, sinPrecio, cli };
}

describe.skipIf(!listo)("panel E3 pedidos", () => {
  test("F-301 filtra por fecha (default calendario), cliente y estado", async () => {
    const clock = relojControlado(instanteGT("2026-08-20T10:00:00"));
    const f = await fixture(clock);
    try {
      const { tortilla, cli } = await catalogoTienda6(f);
      const otro = await f.clientes.crear(
        { nombre: `Otro ${crypto.randomUUID().slice(0, 8)}` },
        f.actor,
      );
      await f.ligas.upsert(
        otro.id,
        tortilla.id,
        { precioCentavos: 1250 },
        f.actor,
      );

      const deHoy = await f.pedidos.crearManual(
        {
          clienteId: cli.id,
          items: [{ productoId: tortilla.id, cantidad: 40 }],
        },
        f.actor,
      );
      expect(deHoy.fechaOperacion).toBe("2026-08-20");

      const otroCliente = await f.pedidos.crearManual(
        {
          clienteId: otro.id,
          items: [{ productoId: tortilla.id, cantidad: 10 }],
        },
        f.actor,
      );

      clock.set(instanteGT("2026-08-21T10:00:00"));
      const del21 = await f.pedidos.crearManual(
        {
          clienteId: cli.id,
          items: [{ productoId: tortilla.id, cantidad: 5 }],
        },
        f.actor,
      );

      clock.set(instanteGT("2026-08-20T10:00:00"));
      const porDefecto = await f.pedidos.listar(f.actor, {});
      expect(porDefecto.every((p) => p.fechaOperacion === "2026-08-20")).toBe(
        true,
      );
      expect(porDefecto.map((p) => p.id).sort()).toEqual(
        [deHoy.id, otroCliente.id].sort(),
      );

      const porCliente = await f.pedidos.listar(f.actor, { clienteId: cli.id });
      expect(porCliente).toHaveLength(1);
      expect(porCliente[0]?.id).toBe(deHoy.id);

      const rango = await f.pedidos.listar(f.actor, {
        desde: "2026-08-20",
        hasta: "2026-08-21",
      });
      expect(rango.map((p) => p.id).sort()).toEqual(
        [deHoy.id, otroCliente.id, del21.id].sort(),
      );

      await f.pedidos.anular(deHoy.id, { motivo: "Duplicado de llamada" }, f.actor);
      const anulados = await f.pedidos.listar(f.actor, { estado: "ANULADO" });
      expect(anulados).toHaveLength(1);
      expect(anulados[0]?.id).toBe(deHoy.id);
      expect(anulados[0]?.estado).toBe("ANULADO");
    } finally {
      await f.client.end({ timeout: 1 });
    }
  });

  test("F-301 un PORTAL y dos MANUAL del mismo cliente el mismo día son tres filas", async () => {
    const clock = relojControlado(instanteGT("2026-08-20T15:00:00"));
    const f = await fixture(clock);
    try {
      const { tortilla, papalinas, cli } = await catalogoTienda6(f);
      const { token } = await f.clientes.rotarTokenPortal(cli.id, f.actor);
      const tokens = new PortalTokenService(f.db);
      const clienteRow = await tokens.resolver(token);

      const portal = await f.pedidos.upsertPortal(
        clienteRow,
        { items: [{ productoId: tortilla.id, cantidad: 50 }] },
        { ip: "10.0.0.2", userAgent: "portal" },
      );
      const manual1 = await f.pedidos.crearManual(
        {
          clienteId: cli.id,
          items: [{ productoId: papalinas.id, cantidad: 8 }],
        },
        f.actor,
      );
      const manual2 = await f.pedidos.crearManual(
        {
          clienteId: cli.id,
          items: [{ productoId: papalinas.id, cantidad: 2 }],
        },
        f.actor,
      );

      const bandeja = await f.pedidos.listar(f.actor, {
        fechaOperacion: "2026-08-20",
        clienteId: cli.id,
      });
      expect(bandeja).toHaveLength(3);
      expect(bandeja.map((p) => p.correlativo).sort()).toEqual([1, 2, 3]);
      expect(bandeja.filter((p) => p.origen === "PORTAL")).toHaveLength(1);
      expect(bandeja.filter((p) => p.origen === "MANUAL")).toHaveLength(2);
      expect(portal.correlativo).not.toBe(manual1.correlativo);
      expect(manual1.correlativo).not.toBe(manual2.correlativo);
      expect(bandeja.every((p) => p.fechaOperacion === "2026-08-20")).toBe(true);

      const outboxFilas = await f.db
        .select()
        .from(outbox)
        .where(
          and(
            eq(outbox.tipo, "PedidoConfirmado"),
            eq(outbox.destinatarioId, cli.id),
            eq(outbox.fechaOperacion, "2026-08-20"),
          ),
        );
      expect(outboxFilas).toHaveLength(1);
    } finally {
      await f.client.end({ timeout: 1 });
    }
  });

  test("F-302 manual a las 10:00 salta la ventana, origen MANUAL y capturadoPor", async () => {
    const f = await fixture(fixedClock(instanteGT("2026-08-20T10:00:00")));
    try {
      const { tortilla, cli } = await catalogoTienda6(f);
      const cal = await f.calendar.load();
      expect(cal.isVentanaAbierta(f.calendar.now())).toBe(false);

      const creado = await f.pedidos.crearManual(
        {
          clienteId: cli.id,
          items: [{ productoId: tortilla.id, cantidad: 20 }],
        },
        f.actor,
      );
      expect(creado.estado).toBe("CONFIRMADO");
      expect(creado.origen).toBe("MANUAL");
      expect(creado.capturadoPor).toBe(f.actor.usuarioId);
      expect(creado.fechaOperacion).toBe("2026-08-20");
      expect(creado.totalCentavos).toBe(20 * 1250);
    } finally {
      await f.client.end({ timeout: 1 });
    }
  });

  test("F-302 PRODUCCION sin permiso recibe 403 al capturar", async () => {
    const f = await fixture(fixedClock(instanteGT("2026-08-20T10:00:00")));
    try {
      const { tortilla, cli } = await catalogoTienda6(f);
      await expect(
        f.pedidos.crearManual(
          {
            clienteId: cli.id,
            items: [{ productoId: tortilla.id, cantidad: 1 }],
          },
          f.actorProduccion,
        ),
      ).rejects.toMatchObject({ code: "PERMISO_DENEGADO", httpStatus: 403 });

      const bandeja = await f.pedidos.listar(f.actorProduccion, {});
      expect(bandeja).toEqual([]);
    } finally {
      await f.client.end({ timeout: 1 });
    }
  });

  test("F-302 producto sin precio → 409 PRECIO_AUSENTE", async () => {
    const f = await fixture(fixedClock(instanteGT("2026-08-20T10:00:00")));
    try {
      const { sinPrecio, cli } = await catalogoTienda6(f);
      await expect(
        f.pedidos.crearManual(
          {
            clienteId: cli.id,
            items: [{ productoId: sinPrecio.id, cantidad: 1 }],
          },
          f.actor,
        ),
      ).rejects.toMatchObject({
        code: "PRECIO_AUSENTE",
        httpStatus: 409,
        message: MENSAJE_PRECIO_AUSENTE,
      });
    } finally {
      await f.client.end({ timeout: 1 });
    }
  });

  test("snapshot: alza de precio no mueve el total histórico ni la edición de ítems", async () => {
    const f = await fixture(fixedClock(instanteGT("2026-08-20T10:00:00")));
    try {
      const { tortilla, papalinas, cli } = await catalogoTienda6(f);
      const creado = await f.pedidos.crearManual(
        {
          clienteId: cli.id,
          items: [
            { productoId: tortilla.id, cantidad: 50 },
            { productoId: papalinas.id, cantidad: 8 },
          ],
        },
        f.actor,
      );
      expect(creado.totalCentavos).toBe(74500);

      await f.ligas.upsert(
        cli.id,
        tortilla.id,
        { precioCentavos: 9999 },
        f.actor,
      );
      const mismo = await f.pedidos.obtener(creado.id, f.actor);
      expect(mismo.totalCentavos).toBe(74500);
      expect(
        mismo.items.find((i) => i.productoId === tortilla.id)
          ?.precioUnitarioCentavos,
      ).toBe(1250);

      const editado = await f.pedidos.editarItems(
        creado.id,
        {
          items: [
            { productoId: tortilla.id, cantidad: 40 },
            { productoId: papalinas.id, cantidad: 6 },
          ],
        },
        f.actor,
      );
      expect(editado.totalCentavos).toBe(40 * 1250 + 6 * 1500);
      expect(
        editado.items.find((i) => i.productoId === tortilla.id)
          ?.precioUnitarioCentavos,
      ).toBe(1250);
    } finally {
      await f.client.end({ timeout: 1 });
    }
  });

  test("F-304 notasAdmin libre; horario y grosor salen del catálogo", async () => {
    const f = await fixture(fixedClock(instanteGT("2026-08-20T10:00:00")));
    try {
      const { tortilla, cli } = await catalogoTienda6(f, {
        horario: "09:00",
        notaProduccion: "GRUESAS",
      });
      const creado = await f.pedidos.crearManual(
        {
          clienteId: cli.id,
          items: [{ productoId: tortilla.id, cantidad: 150 }],
          notasAdmin: "llevar junto con las tortillas de la mañana",
        },
        f.actor,
      );

      const detalle = await f.pedidos.obtener(creado.id, f.actor);
      expect(detalle.notasAdmin).toBe(
        "llevar junto con las tortillas de la mañana",
      );
      expect(detalle.horarioEntregaFijo).toBe("09:00");
      expect(detalle.notasPermanentes).toBe(
        "llevar junto con las tortillas de la mañana",
      );
      expect(detalle.items[0]?.notaProduccion).toBe("GRUESAS");
      expect(detalle.items[0]?.puntoCarga).toBe("DEMOCRACIA");
      expect(detalle.items[0]?.nombreCanonico).toBe("Tortilla No. 16 (grande)");

      const notas = await f.pedidos.editarNotas(
        creado.id,
        { notasAdmin: "Confirmó por WhatsApp a las 21:02" },
        f.actor,
      );
      expect(notas.notasAdmin).toBe("Confirmó por WhatsApp a las 21:02");
      expect(notas.horarioEntregaFijo).toBe("09:00");
      expect(notas.items[0]?.notaProduccion).toBe("GRUESAS");
    } finally {
      await f.client.end({ timeout: 1 });
    }
  });

  test("sábado: punto de carga efectivo es PLANTA aunque el SKU sea DEMOCRACIA", async () => {
    const f = await fixture(fixedClock(instanteGT("2026-08-22T10:00:00")));
    try {
      const { tortilla, cli } = await catalogoTienda6(f);
      const creado = await f.pedidos.crearManual(
        {
          clienteId: cli.id,
          items: [{ productoId: tortilla.id, cantidad: 40 }],
        },
        f.actor,
      );
      expect(creado.fechaOperacion).toBe("2026-08-22");
      expect(creado.items[0]?.puntoCarga).toBe("PLANTA");
    } finally {
      await f.client.end({ timeout: 1 });
    }
  });

  test("D2 anular: ANULADO con motivo, sin borrar, copy Anulado en audit", async () => {
    const f = await fixture(fixedClock(instanteGT("2026-08-20T10:00:00")));
    try {
      const { tortilla, cli } = await catalogoTienda6(f);
      const creado = await f.pedidos.crearManual(
        {
          clienteId: cli.id,
          items: [{ productoId: tortilla.id, cantidad: 12 }],
        },
        f.actor,
      );

      await expect(
        f.pedidos.anular(creado.id, { motivo: "   " }, f.actor),
      ).rejects.toMatchObject({ code: "VALIDACION" });

      const anulado = await f.pedidos.anular(
        creado.id,
        { motivo: "Cliente pidió por duplicado" },
        f.actor,
      );
      expect(anulado.estado).toBe("ANULADO");
      expect(anulado.anuladoAt).toBeTruthy();
      expect(anulado.motivoAnulacion).toBe("Cliente pidió por duplicado");

      const fila = await f.db
        .select()
        .from(pedido)
        .where(eq(pedido.id, creado.id));
      expect(fila).toHaveLength(1);

      const bandeja = await f.pedidos.listar(f.actor, {});
      expect(bandeja.some((p) => p.id === creado.id && p.estado === "ANULADO")).toBe(
        true,
      );

      const audits = await f.db
        .select()
        .from(auditLog)
        .where(eq(auditLog.entidadId, creado.id));
      const deAnular = audits.find((a) => a.accion === "pedidos.anular");
      expect(deAnular?.despues).toMatchObject({
        motivo: "Cliente pidió por duplicado",
        estado: "ANULADO",
      });
      expect(JSON.stringify(deAnular)).not.toMatch(/cancelad/i);
      expect(COPY_PEDIDO_ANULADO).toBe("Anulado");

      await expect(
        f.pedidos.editarNotas(
          creado.id,
          { notasAdmin: "no debería" },
          f.actor,
        ),
      ).rejects.toMatchObject({ code: "PEDIDO_ANULADO" });
    } finally {
      await f.client.end({ timeout: 1 });
    }
  });

  test("anular un ENTREGADO se rechaza: la factura se calcula sobre lo entregado", async () => {
    const f = await fixture(fixedClock(instanteGT("2026-08-20T10:00:00")));
    try {
      const { cli } = await catalogoTienda6(f);
      const [entregado] = await f.db
        .insert(pedido)
        .values({
          organizacionId: f.orgId,
          correlativo: 90,
          fechaOperacion: "2026-08-21",
          fechaEntrega: "2026-08-22",
          clienteId: cli.id,
          estado: "ENTREGADO",
          origen: "MANUAL",
        })
        .returning({ id: pedido.id });

      await expect(
        f.pedidos.anular(
          entregado!.id,
          { motivo: "Ya lo llevamos" },
          f.actor,
        ),
      ).rejects.toMatchObject({ code: "PEDIDO_ENTREGADO", httpStatus: 409 });

      const [fila] = await f.db
        .select()
        .from(pedido)
        .where(eq(pedido.id, entregado!.id));
      expect(fila?.estado).toBe("ENTREGADO");
      expect(fila?.anuladoAt).toBeNull();
    } finally {
      await f.client.end({ timeout: 1 });
    }
  });

  test("F-303 el bus emite pedido.creado, pedido.editado y pedido.anulado", async () => {
    const f = await fixture(fixedClock(instanteGT("2026-08-20T10:00:00")));
    try {
      const { tortilla, papalinas, cli } = await catalogoTienda6(f);
      const vistos: PedidoSseEvent[] = [];
      const sub = f.events.observe(f.orgId).subscribe((e) => vistos.push(e));

      const creado = await f.pedidos.crearManual(
        {
          clienteId: cli.id,
          items: [{ productoId: tortilla.id, cantidad: 10 }],
        },
        f.actor,
      );
      await f.pedidos.editarItems(
        creado.id,
        {
          items: [
            { productoId: tortilla.id, cantidad: 10 },
            { productoId: papalinas.id, cantidad: 4 },
          ],
        },
        f.actor,
      );
      await f.pedidos.anular(
        creado.id,
        { motivo: "Ya no lo necesita" },
        f.actor,
      );
      sub.unsubscribe();

      expect(vistos.map((e) => e.tipo)).toEqual([
        "pedido.creado",
        "pedido.editado",
        "pedido.anulado",
      ]);
      expect(vistos.every((e) => e.pedidoId === creado.id)).toBe(true);
      expect(vistos.every((e) => e.fechaOperacion === "2026-08-20")).toBe(true);
    } finally {
      await f.client.end({ timeout: 1 });
    }
  });
});
