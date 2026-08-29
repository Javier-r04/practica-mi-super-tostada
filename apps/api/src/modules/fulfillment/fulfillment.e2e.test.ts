import { describe, expect, test } from "bun:test";
import { and, eq } from "drizzle-orm";
import { DateTime } from "luxon";
import {
  auditLog,
  diaOperacion,
  domainEvents,
  hojaProduccion,
  organizacion,
  outbox,
  pedido,
  ventanaSemanal,
  usuario,
} from "@misupertostada/db";
import {
  MENSAJE_HOJA_NO_MATERIALIZADA,
  TIPO_EVENTO_VENTANA_CERRADA,
  ZONA_NEGOCIO,
  permisosEfectivos,
  type Clock,
} from "@misupertostada/shared";
import { AuditWriter } from "../shared/audit.writer";
import { OutboxWriter } from "../shared/outbox.writer";
import { DomainEventWriter } from "../shared/domain-event.writer";
import { BusinessCalendarService } from "../shared/calendar.service";
import { PedidoEvents } from "../shared/panel-events";
import {
  crearOrgDePrueba,
  openTestDb,
  postgresListo,
} from "../../test/db";
import type { Actor } from "../identity/actor";
import { ProductosService } from "../catalog/productos.service";
import { ClientesService } from "../catalog/clientes.service";
import { ClienteProductoService } from "../catalog/cliente-producto.service";
import { PortalTokenService } from "../ordering/portal-token.service";
import { PedidoService } from "../ordering/pedido.service";
import { CierreService } from "./cierre.service";
import { HojaService } from "./hoja.service";

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
  const domainEventsWriter = new DomainEventWriter(db);
  const calendar = new BusinessCalendarService(db, clock);
  const events = new PedidoEvents();
  const productos = new ProductosService(db, audit);
  const clientes = new ClientesService(db, audit);
  const ligas = new ClienteProductoService(db, audit, clientes);
  const pedidos = new PedidoService(db, audit, outboxWriter, calendar, events);
  const hoja = new HojaService(db, calendar);
  const cierre = new CierreService(
    db,
    audit,
    outboxWriter,
    domainEventsWriter,
    calendar,
    hoja,
    events,
  );

  const org = await crearOrgDePrueba(db, "org-e4-");

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
    userAgent: "test-e4",
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

  const adminUser = `admin-${crypto.randomUUID().slice(0, 8)}`;
  const [admin] = await db
    .insert(usuario)
    .values({
      organizacionId: org!.id,
      username: adminUser,
      rol: "ADMIN",
      activo: true,
    })
    .returning({ id: usuario.id });

  const actorAdmin: Actor = {
    usuarioId: admin!.id,
    organizacionId: org!.id,
    username: adminUser,
    rol: "ADMIN",
    permisos: permisosEfectivos("ADMIN"),
    sesionId: crypto.randomUUID(),
    ip: "127.0.0.1",
    userAgent: "test-admin",
  };

  return {
    client,
    db,
    actor,
    actorProduccion,
    actorAdmin,
    orgId: org!.id,
    productos,
    clientes,
    ligas,
    pedidos,
    hoja,
    cierre,
    calendar,
    events,
  };
}

async function catalogoBasico(f: Awaited<ReturnType<typeof fixture>>) {
  const t16 = await f.productos.crear(
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
      sku: `NAC-${crypto.randomUUID().slice(0, 6)}`,
      nombreCanonico: "Nachos blancos",
      familia: "FRITURA",
      unidadMedida: "BOLSA",
      puntoCarga: "PLANTA",
    },
    f.actor,
  );
  const tabasco = await f.clientes.crear(
    { nombre: `Tabasco Casa Vieja ${crypto.randomUUID().slice(0, 6)}` },
    f.actor,
  );
  await f.ligas.upsert(
    tabasco.id,
    t16.id,
    { precioCentavos: 1250, notaProduccion: "GRUESAS" },
    f.actor,
  );
  await f.ligas.upsert(
    tabasco.id,
    nachos.id,
    { precioCentavos: 1500 },
    f.actor,
  );
  return { t16, nachos, tabasco };
}

async function estadoDia(
  f: Awaited<ReturnType<typeof fixture>>,
  fecha: string,
): Promise<string | undefined> {
  const [dia] = await f.db
    .select({ estado: diaOperacion.estado })
    .from(diaOperacion)
    .where(
      and(
        eq(diaOperacion.organizacionId, f.orgId),
        eq(diaOperacion.fechaOperacion, fecha),
      ),
    );
  return dia?.estado;
}

describe.skipIf(!listo)("E4 operación diaria", () => {
  test("los tres ejes de fecha se separan y cada uno apunta a lo suyo", async () => {
    // Jueves 20 a las 22:00: ventana abierta. Captura y foco son el jueves;
    // lo que se repartió hoy fue la operación del miércoles.
    const clock = relojControlado(instanteGT("2026-08-20T22:00:00"));
    const f = await fixture(clock);
    try {
      // Sin sobrescribir nada: el horario sembrado ya es 15:00 → 03:00 del día
      // siguiente. Que este test dejara de necesitar el override es la prueba
      // de que `ventana_semanal` es la única fuente.
      const abierta = await f.calendar.ejes(f.orgId);
      expect(abierta.ventanaAbierta).toBe(true);
      expect(abierta.captura).toBe("2026-08-20");
      expect(abierta.enCurso).toBe("2026-08-19");
      expect(abierta.hoyCivil).toBe("2026-08-20");
      expect(abierta.fechaFoco).toBe("2026-08-20");
      expect(abierta.mismaOperacion).toBe(false);

      // Viernes 21 a las 02:00: la ventana del jueves sigue abierta hasta las
      // 03:00. El día de calendario ya cambió, pero la operación no.
      clock.set(instanteGT("2026-08-21T02:00:00"));
      const madrugada = await f.calendar.ejes(f.orgId);
      expect(madrugada.captura).toBe("2026-08-20");
      expect(madrugada.enCurso).toBe("2026-08-20");
      expect(madrugada.hoyCivil).toBe("2026-08-21");
      expect(madrugada.mismaOperacion).toBe(true);

      // Viernes 21 a las 08:00: la ventana cerró. Se reparte lo del jueves y
      // la próxima captura es el viernes. El foco es el reparto: abrir aquí
      // en la ventana del viernes mostraría una operación vacía.
      clock.set(instanteGT("2026-08-21T08:00:00"));
      const manana = await f.calendar.ejes(f.orgId);
      expect(manana.ventanaAbierta).toBe(false);
      expect(manana.captura).toBe("2026-08-21");
      expect(manana.enCurso).toBe("2026-08-20");
      expect(manana.fechaFoco).toBe("2026-08-20");

      // Viernes 21 a las 15:30: abre la ventana del viernes. El reparto en
      // curso NO cambia; solo se mueve el foco hacia la captura.
      clock.set(instanteGT("2026-08-21T15:30:00"));
      const tarde = await f.calendar.ejes(f.orgId);
      expect(tarde.captura).toBe("2026-08-21");
      expect(tarde.enCurso).toBe("2026-08-20");
      expect(tarde.fechaFoco).toBe("2026-08-21");
    } finally {
      await f.client.end({ timeout: 1 });
    }
  });

  test("el resumen sin fecha sigue el foco: reparto de mañana, captura de tarde", async () => {
    const clock = relojControlado(instanteGT("2026-08-20T22:00:00"));
    const f = await fixture(clock);
    try {
      const { t16, tabasco } = await catalogoBasico(f);
      await f.pedidos.crearManual(
        { clienteId: tabasco.id, items: [{ productoId: t16.id, cantidad: 50 }] },
        f.actor,
      );
      await f.cierre.cerrar({}, f.actor);

      // Ventana abierta: el resumen mira lo que se está capturando.
      expect((await f.cierre.resumen(f.actor)).fechaOperacion).toBe(
        "2026-08-20",
      );

      // Viernes 08:00: el resumen mira lo que se reparte, no la ventana del
      // viernes, que todavía no ha recibido nada.
      clock.set(instanteGT("2026-08-21T08:00:00"));
      const enReparto = await f.cierre.resumen(f.actor);
      expect(enReparto.fechaOperacion).toBe("2026-08-20");
      expect(enReparto.pedidosManual).toBe(1);
    } finally {
      await f.client.end({ timeout: 1 });
    }
  });

  test("F-401 la hoja no existe hasta el cierre", async () => {
    const f = await fixture(relojControlado(instanteGT("2026-08-20T22:00:00")));
    try {
      await expect(f.hoja.obtener(f.orgId, "2026-08-20")).rejects.toMatchObject({
        code: "HOJA_NO_MATERIALIZADA",
        httpStatus: 404,
        message: MENSAJE_HOJA_NO_MATERIALIZADA,
      });
      const hojas = await f.db
        .select()
        .from(hojaProduccion)
        .where(eq(hojaProduccion.organizacionId, f.orgId));
      expect(hojas).toHaveLength(0);
    } finally {
      await f.client.end({ timeout: 1 });
    }
  });

  test("F-401 cerrar a las 22:00 materializa v1, EN_PRODUCCION, evento + outbox + audit", async () => {
    const f = await fixture(relojControlado(instanteGT("2026-08-20T22:00:00")));
    try {
      const { t16, tabasco } = await catalogoBasico(f);
      await f.pedidos.crearManual(
        { clienteId: tabasco.id, items: [{ productoId: t16.id, cantidad: 50 }] },
        f.actor,
      );

      const result = await f.cierre.cerrar({}, f.actor);
      expect(result.version).toBe(1);
      expect(result.idempotente).toBe(false);

      const hoja = await f.hoja.obtener(f.orgId, "2026-08-20");
      expect(hoja.version).toBe(1);
      expect(hoja.snapshot.productos[0]?.cantidad).toBe(50);

      const pedidos = await f.db
        .select()
        .from(pedido)
        .where(eq(pedido.organizacionId, f.orgId));
      expect(pedidos.every((p) => p.estado === "EN_PRODUCCION")).toBe(true);

      const eventos = await f.db
        .select()
        .from(domainEvents)
        .where(eq(domainEvents.tipo, TIPO_EVENTO_VENTANA_CERRADA));
      expect(
        eventos.some(
          (e) =>
            e.payload &&
            typeof e.payload === "object" &&
            "organizacionId" in e.payload &&
            e.payload.organizacionId === f.orgId,
        ),
      ).toBe(true);

      const [ob] = await f.db
        .select()
        .from(outbox)
        .where(
          and(
            eq(outbox.tipo, TIPO_EVENTO_VENTANA_CERRADA),
            eq(outbox.destinatarioId, f.orgId),
          ),
        );
      expect(ob).toBeTruthy();

      const audits = await f.db
        .select()
        .from(auditLog)
        .where(eq(auditLog.accion, "ventana.cerrar"));
      expect(audits.length).toBeGreaterThan(0);
    } finally {
      await f.client.end({ timeout: 1 });
    }
  });

  test("F-401 portal PUT tras cierre anticipado → 409 DIA_CERRADO", async () => {
    const clock = relojControlado(instanteGT("2026-08-20T22:00:00"));
    const f = await fixture(clock);
    try {
      const { t16, tabasco } = await catalogoBasico(f);
      const { token } = await f.clientes.rotarTokenPortal(tabasco.id, f.actor);
      const clienteRow = await new PortalTokenService(f.db).resolver(token);
      await f.pedidos.upsertPortal(
        clienteRow,
        { items: [{ productoId: t16.id, cantidad: 40 }] },
        { ip: "10.0.0.2", userAgent: "portal" },
      );
      await f.cierre.cerrar({}, f.actor);
      await expect(
        f.pedidos.upsertPortal(
          clienteRow,
          { items: [{ productoId: t16.id, cantidad: 41 }] },
          { ip: "10.0.0.2", userAgent: "portal" },
        ),
      ).rejects.toMatchObject({ code: "DIA_CERRADO", httpStatus: 409 });
    } finally {
      await f.client.end({ timeout: 1 });
    }
  });

  test("F-401 manual POST tras cierre → 409 DIA_CERRADO", async () => {
    const f = await fixture(relojControlado(instanteGT("2026-08-20T22:00:00")));
    try {
      const { t16, tabasco } = await catalogoBasico(f);
      await f.pedidos.crearManual(
        { clienteId: tabasco.id, items: [{ productoId: t16.id, cantidad: 10 }] },
        f.actor,
      );
      await f.cierre.cerrar({}, f.actor);
      await expect(
        f.pedidos.crearManual(
          { clienteId: tabasco.id, items: [{ productoId: t16.id, cantidad: 5 }] },
          f.actor,
        ),
      ).rejects.toMatchObject({ code: "DIA_CERRADO", httpStatus: 409 });
    } finally {
      await f.client.end({ timeout: 1 });
    }
  });

  test("F-401 segundo cerrar es idempotente: una hoja v1, un outbox", async () => {
    const f = await fixture(relojControlado(instanteGT("2026-08-20T22:00:00")));
    try {
      const { t16, tabasco } = await catalogoBasico(f);
      await f.pedidos.crearManual(
        { clienteId: tabasco.id, items: [{ productoId: t16.id, cantidad: 10 }] },
        f.actor,
      );
      const a = await f.cierre.cerrar({}, f.actor);
      const b = await f.cierre.cerrar({}, f.actor);
      expect(a.version).toBe(1);
      expect(b.idempotente).toBe(true);
      expect(b.version).toBe(1);
      const hojas = await f.db
        .select()
        .from(hojaProduccion)
        .where(eq(hojaProduccion.organizacionId, f.orgId));
      expect(hojas).toHaveLength(1);
      const obs = await f.db
        .select()
        .from(outbox)
        .where(
          and(
            eq(outbox.tipo, TIPO_EVENTO_VENTANA_CERRADA),
            eq(outbox.destinatarioId, f.orgId),
          ),
        );
      expect(obs).toHaveLength(1);
    } finally {
      await f.client.end({ timeout: 1 });
    }
  });

  test("F-402 sábado: DEMOCRACIA aparece bajo PLANTA", async () => {
    const f = await fixture(relojControlado(instanteGT("2026-08-22T16:00:00")));
    try {
      const { t16, tabasco } = await catalogoBasico(f);
      await f.pedidos.crearManual(
        { clienteId: tabasco.id, items: [{ productoId: t16.id, cantidad: 80 }] },
        f.actor,
      );
      await f.cierre.cerrar({}, f.actor);
      const hoja = await f.hoja.obtener(f.orgId, "2026-08-22");
      expect(hoja.esSabado).toBe(true);
      expect(hoja.grupos.map((g) => g.puntoCarga)).toEqual(["PLANTA"]);
      expect(hoja.snapshot.productos[0]?.puntoCargaEfectivo).toBe("PLANTA");
    } finally {
      await f.client.end({ timeout: 1 });
    }
  });

  test("F-402 snapshot inmune a cambio de nota_produccion después del cierre", async () => {
    const f = await fixture(relojControlado(instanteGT("2026-08-20T22:00:00")));
    try {
      const { t16, tabasco } = await catalogoBasico(f);
      await f.pedidos.crearManual(
        { clienteId: tabasco.id, items: [{ productoId: t16.id, cantidad: 50 }] },
        f.actor,
      );
      await f.cierre.cerrar({}, f.actor);
      await f.ligas.upsert(
        tabasco.id,
        t16.id,
        { precioCentavos: 1250, notaProduccion: "FINAS" },
        f.actor,
      );
      const hoja = await f.hoja.obtener(f.orgId, "2026-08-20");
      expect(hoja.snapshot.clientes[0]?.items[0]?.notaProduccion).toBe("GRUESAS");
    } finally {
      await f.client.end({ timeout: 1 });
    }
  });

  test("F-403 PRODUCCION no cierra; sí lee la hoja", async () => {
    const f = await fixture(relojControlado(instanteGT("2026-08-20T22:00:00")));
    try {
      const { t16, tabasco } = await catalogoBasico(f);
      await f.pedidos.crearManual(
        { clienteId: tabasco.id, items: [{ productoId: t16.id, cantidad: 12 }] },
        f.actor,
      );
      await expect(f.cierre.cerrar({}, f.actorProduccion)).rejects.toMatchObject({
        code: "PERMISO_DENEGADO",
        httpStatus: 403,
      });
      await f.cierre.cerrar({}, f.actor);
      const hoja = await f.hoja.obtener(f.orgId, "2026-08-20");
      expect(hoja.version).toBe(1);
    } finally {
      await f.client.end({ timeout: 1 });
    }
  });

  test("F-405 ADMIN no reabre; jefe sin motivo → 400", async () => {
    const f = await fixture(relojControlado(instanteGT("2026-08-20T22:00:00")));
    try {
      const { t16, tabasco } = await catalogoBasico(f);
      await f.pedidos.crearManual(
        { clienteId: tabasco.id, items: [{ productoId: t16.id, cantidad: 12 }] },
        f.actor,
      );
      await f.cierre.cerrar({}, f.actor);
      await expect(
        f.cierre.reabrir({ motivo: "faltó Tabascos" }, f.actorAdmin),
      ).rejects.toMatchObject({ code: "PERMISO_DENEGADO", httpStatus: 403 });
      await expect(f.cierre.reabrir({ motivo: "corto" }, f.actor)).rejects.toMatchObject({
        code: "VALIDACION",
        httpStatus: 400,
      });
    } finally {
      await f.client.end({ timeout: 1 });
    }
  });

  test("F-405 reabrir + extra + recerrar → v2 nuevo; outbox sigue 1", async () => {
    const f = await fixture(relojControlado(instanteGT("2026-08-20T22:00:00")));
    try {
      const { t16, nachos, tabasco } = await catalogoBasico(f);
      await f.pedidos.crearManual(
        { clienteId: tabasco.id, items: [{ productoId: t16.id, cantidad: 50 }] },
        f.actor,
      );
      await f.cierre.cerrar({}, f.actor);
      await f.cierre.reabrir(
        { motivo: "faltó el pedido de Tabascos" },
        f.actor,
      );
      await f.pedidos.crearManual(
        {
          clienteId: tabasco.id,
          items: [{ productoId: nachos.id, cantidad: 8 }],
        },
        f.actor,
      );
      const v2 = await f.cierre.cerrar({}, f.actor);
      expect(v2.version).toBe(2);
      const hoja = await f.hoja.obtener(f.orgId, "2026-08-20");
      expect(hoja.version).toBe(2);
      const nuevo = hoja.snapshot.clientes[0]?.items.find(
        (i) => i.productoId === nachos.id,
      );
      expect(nuevo?.cambio).toBe("nuevo");
      const obs = await f.db
        .select()
        .from(outbox)
        .where(
          and(
            eq(outbox.tipo, TIPO_EVENTO_VENTANA_CERRADA),
            eq(outbox.destinatarioId, f.orgId),
          ),
        );
      expect(obs).toHaveLength(1);
      const events = await f.db
        .select()
        .from(domainEvents)
        .where(eq(domainEvents.tipo, TIPO_EVENTO_VENTANA_CERRADA));
      expect(
        events.filter(
          (e) =>
            e.payload &&
            typeof e.payload === "object" &&
            "organizacionId" in e.payload &&
            e.payload.organizacionId === f.orgId,
        ).length,
      ).toBeGreaterThanOrEqual(2);
    } finally {
      await f.client.end({ timeout: 1 });
    }
  });

  test("F-405 a las 00:30 el manual extra cae en el día reabierto, no en el siguiente", async () => {
    const clock = relojControlado(instanteGT("2026-08-20T22:00:00"));
    const f = await fixture(clock);
    try {
      const { t16, nachos, tabasco } = await catalogoBasico(f);
      await f.pedidos.crearManual(
        { clienteId: tabasco.id, items: [{ productoId: t16.id, cantidad: 50 }] },
        f.actor,
      );
      await f.cierre.cerrar({}, f.actor);
      clock.set(instanteGT("2026-08-21T00:30:00"));
      await f.cierre.reabrir(
        { motivo: "faltó el pedido de Tabascos" },
        f.actor,
      );
      const extra = await f.pedidos.crearManual(
        {
          clienteId: tabasco.id,
          items: [{ productoId: nachos.id, cantidad: 8 }],
        },
        f.actor,
      );
      expect(extra.fechaOperacion).toBe("2026-08-20");
      const v2 = await f.cierre.cerrar({}, f.actor);
      expect(v2.fechaOperacion).toBe("2026-08-20");
      expect(v2.version).toBe(2);
    } finally {
      await f.client.end({ timeout: 1 });
    }
  });

  test("cerrarSiToca: la ventana abierta de una organización no frena a la otra", async () => {
    // El `isVentanaAbierta` estaba fuera del bucle y con el calendario de la
    // primera organización, así que una sola ventana viva bloqueaba el cierre
    // de todas las demás y les aplicaba una fecha ajena.
    const clock = relojControlado(instanteGT("2026-08-21T03:00:00"));
    const f = await fixture(clock);
    try {
      // La otra organización cierra más tarde: a las 03:00 sigue capturando.
      const otra = await crearOrgDePrueba(f.db, "org-e4-abierta-");
      await f.db
        .update(ventanaSemanal)
        .set({ cierre: "06:00" })
        .where(eq(ventanaSemanal.organizacionId, otra.id));

      // Cada organización se evalúa con SU calendario: la que cierra a las
      // 06:00 sigue abierta y no se toca; la otra sí cierra, con su fecha.
      await f.cierre.cerrarSiToca(otra.id);
      await f.cierre.cerrarSiToca(f.orgId);

      const [dia] = await f.db
        .select()
        .from(diaOperacion)
        .where(eq(diaOperacion.organizacionId, f.orgId));
      expect(dia?.fechaOperacion).toBe("2026-08-20");
      expect(dia?.estado).toBe("CERRADO");

      const deLaOtra = await f.db
        .select()
        .from(diaOperacion)
        .where(eq(diaOperacion.organizacionId, otra.id));
      expect(deLaOtra).toHaveLength(0);

      await f.db
        .delete(ventanaSemanal)
        .where(eq(ventanaSemanal.organizacionId, otra.id));
      await f.db.delete(organizacion).where(eq(organizacion.id, otra.id));
    } finally {
      await f.client.end({ timeout: 1 });
    }
  });

  test("F-401 al cierre real (03:00): cerrarSiToca cierra el 20, no el 21", async () => {
    // A las 00:00 la ventana del 20 sigue abierta —cierra a las 03:00—, así que
    // el cron no debe cerrar nada todavía. El corte es a las 03:00.
    const clock = relojControlado(instanteGT("2026-08-21T00:00:00"));
    const f = await fixture(clock);
    try {
      await f.cierre.cerrarSiToca(f.orgId);
      const aMedianoche = await f.db
        .select()
        .from(diaOperacion)
        .where(eq(diaOperacion.organizacionId, f.orgId));
      expect(aMedianoche).toHaveLength(0);

      clock.set(instanteGT("2026-08-21T03:00:00"));
      await f.cierre.cerrarSiToca(f.orgId);
      const [dia] = await f.db
        .select()
        .from(diaOperacion)
        .where(eq(diaOperacion.organizacionId, f.orgId));
      expect(dia?.fechaOperacion).toBe("2026-08-20");
      expect(dia?.estado).toBe("CERRADO");
      const del21 = await f.db
        .select()
        .from(diaOperacion)
        .where(
          and(
            eq(diaOperacion.organizacionId, f.orgId),
            eq(diaOperacion.fechaOperacion, "2026-08-21"),
          ),
        );
      expect(del21).toHaveLength(0);
    } finally {
      await f.client.end({ timeout: 1 });
    }
  });

  test("cerrarSiToca recupera una operación atrasada dos días, no solo la última", async () => {
    // El caso real de la operación del sábado 22 de agosto de 2026: el proceso
    // no estaba vivo a la hora del cierre, y el barrido viejo solo miraba
    // `getFechaOperacionDeVentanaReciente(now)`. El lunes esa operación seguía
    // abierta, sin hoja y con los pedidos en CONFIRMADO: producción y reparto
    // salían en blanco el día del reparto.
    const clock = relojControlado(instanteGT("2026-08-20T22:00:00"));
    const f = await fixture(clock);
    try {
      const { t16, tabasco } = await catalogoBasico(f);
      await f.pedidos.crearManual(
        { clienteId: tabasco.id, items: [{ productoId: t16.id, cantidad: 40 }] },
        f.actor,
      );

      // Dos días sin que el cron corra: la ventana del 20 venció hace rato.
      clock.set(instanteGT("2026-08-22T09:00:00"));
      await f.cierre.cerrarSiToca(f.orgId);

      const [dia] = await f.db
        .select()
        .from(diaOperacion)
        .where(
          and(
            eq(diaOperacion.organizacionId, f.orgId),
            eq(diaOperacion.fechaOperacion, "2026-08-20"),
          ),
        );
      expect(dia?.estado).toBe("CERRADO");

      const hoja = await f.hoja.obtener(f.orgId, "2026-08-20");
      expect(hoja.version).toBe(1);
      expect(hoja.snapshot.productos[0]?.cantidad).toBe(40);

      const pedidos = await f.db
        .select()
        .from(pedido)
        .where(
          and(
            eq(pedido.organizacionId, f.orgId),
            eq(pedido.fechaOperacion, "2026-08-20"),
          ),
        );
      expect(pedidos.every((p) => p.estado === "EN_PRODUCCION")).toBe(true);
    } finally {
      await f.client.end({ timeout: 1 });
    }
  });

  test("cerrarSiToca no toca una operación cuya ventana sigue corriendo", async () => {
    // El barrido de atrasados no puede convertirse en un cierre anticipado:
    // mientras la ventana del día esté viva se sigue capturando.
    const clock = relojControlado(instanteGT("2026-08-20T22:00:00"));
    const f = await fixture(clock);
    try {
      const { t16, tabasco } = await catalogoBasico(f);
      await f.pedidos.crearManual(
        { clienteId: tabasco.id, items: [{ productoId: t16.id, cantidad: 10 }] },
        f.actor,
      );

      await f.cierre.cerrarSiToca(f.orgId);

      const dias = await f.db
        .select()
        .from(diaOperacion)
        .where(eq(diaOperacion.organizacionId, f.orgId));
      expect(dias).toHaveLength(0);
      await expect(
        f.hoja.obtener(f.orgId, "2026-08-20"),
      ).rejects.toMatchObject({ code: "HOJA_NO_MATERIALIZADA" });
    } finally {
      await f.client.end({ timeout: 1 });
    }
  });

  test("F-405 el barrido respeta la reapertura hasta que vence, y entonces cierra", async () => {
    // Reabrir es una corrección manual en curso: cerrarla por debajo le borra
    // el trabajo a quien la abrió. Pero dejarla abierta para siempre es como la
    // operación del 22 de agosto de 2026 llegó a su día de reparto sin hoja y
    // con los pedidos en CONFIRMADO. El corte es el cierre de su propia
    // ventana: el último instante que deja la hoja lista antes de que Alex
    // produzca de madrugada.
    const clock = relojControlado(instanteGT("2026-08-20T22:00:00"));
    const f = await fixture(clock);
    try {
      const { t16, tabasco } = await catalogoBasico(f);
      await f.pedidos.crearManual(
        { clienteId: tabasco.id, items: [{ productoId: t16.id, cantidad: 25 }] },
        f.actor,
      );
      await f.cierre.cerrar({}, f.actor);

      clock.set(instanteGT("2026-08-20T22:30:00"));
      await f.cierre.reabrir(
        { motivo: "faltó el pedido de Buen Camarón" },
        f.actor,
      );

      // 02:59: la ventana del jueves sigue viva, no hay nada que cerrar.
      clock.set(instanteGT("2026-08-21T02:59:00"));
      await f.cierre.cerrarSiToca(f.orgId);
      expect(await estadoDia(f, "2026-08-20")).toBe("REABIERTO");

      // 03:00: cierra su ventana y la reapertura vence con ella. La hoja queda
      // lista antes de la madrugada de producción.
      clock.set(instanteGT("2026-08-21T03:00:00"));
      await f.cierre.cerrarSiToca(f.orgId);
      expect(await estadoDia(f, "2026-08-20")).toBe("CERRADO");

      const hoja = await f.hoja.obtener(f.orgId, "2026-08-20");
      expect(hoja.version).toBe(2);
    } finally {
      await f.client.end({ timeout: 1 });
    }
  });

  test("F-405 el piso de gracia protege una reapertura tardía", async () => {
    // La ventana del jueves cerró a las 03:00 del viernes. Reabrir a las 14:50
    // para corregir da una hora de gracia, no un cierre en el siguiente tick.
    const clock = relojControlado(instanteGT("2026-08-20T22:00:00"));
    const f = await fixture(clock);
    try {
      const { t16, tabasco } = await catalogoBasico(f);
      await f.pedidos.crearManual(
        { clienteId: tabasco.id, items: [{ productoId: t16.id, cantidad: 12 }] },
        f.actor,
      );
      await f.cierre.cerrar({}, f.actor);

      clock.set(instanteGT("2026-08-21T14:50:00"));
      await f.cierre.reabrir(
        { fechaOperacion: "2026-08-20", motivo: "corrección de última hora" },
        f.actor,
      );

      clock.set(instanteGT("2026-08-21T15:00:00"));
      await f.cierre.cerrarSiToca(f.orgId);
      expect(await estadoDia(f, "2026-08-20")).toBe("REABIERTO");

      clock.set(instanteGT("2026-08-21T15:50:00"));
      await f.cierre.cerrarSiToca(f.orgId);
      expect(await estadoDia(f, "2026-08-20")).toBe("CERRADO");
    } finally {
      await f.client.end({ timeout: 1 });
    }
  });

  test("F-402/F-404 texto golden y PDF con header %PDF", async () => {
    const f = await fixture(relojControlado(instanteGT("2026-08-22T16:00:00")));
    try {
      const t16 = await f.productos.crear(
        {
          sku: `T16-${crypto.randomUUID().slice(0, 6)}`,
          nombreCanonico: "Tortilla No. 16 (grande)",
          familia: "TORTILLA",
          unidadMedida: "LIBRA",
          puntoCarga: "DEMOCRACIA",
        },
        f.actor,
      );
      const t14 = await f.productos.crear(
        {
          sku: `T14-${crypto.randomUUID().slice(0, 6)}`,
          nombreCanonico: "Tortilla No. 14 (mediana)",
          familia: "TORTILLA",
          unidadMedida: "LIBRA",
          puntoCarga: "DEMOCRACIA",
        },
        f.actor,
      );
      const tabasco = await f.clientes.crear(
        { nombre: "Tabasco Casa Vieja" },
        f.actor,
      );
      const metro = await f.clientes.crear(
        { nombre: "Metroplaza", horarioEntregaFijo: "09:00" },
        f.actor,
      );
      const tienda = await f.clientes.crear({ nombre: "Tienda 6" }, f.actor);
      for (const cli of [tabasco, metro, tienda]) {
        await f.ligas.upsert(
          cli.id,
          t16.id,
          {
            precioCentavos: 1250,
            notaProduccion: cli.id === tabasco.id ? "GRUESAS" : undefined,
          },
          f.actor,
        );
        await f.ligas.upsert(
          cli.id,
          t14.id,
          { precioCentavos: 1200 },
          f.actor,
        );
      }
      await f.pedidos.crearManual(
        {
          clienteId: tabasco.id,
          items: [
            { productoId: t16.id, cantidad: 150 },
            { productoId: t14.id, cantidad: 50 },
          ],
        },
        f.actor,
      );
      await f.pedidos.crearManual(
        {
          clienteId: metro.id,
          items: [{ productoId: t16.id, cantidad: 40 }],
        },
        f.actor,
      );
      await f.pedidos.crearManual(
        {
          clienteId: tienda.id,
          items: [{ productoId: t16.id, cantidad: 10 }],
          notasAdmin: "llevar junto con las tortillas de la mañana",
        },
        f.actor,
      );
      const anulado = await f.pedidos.crearManual(
        {
          clienteId: tienda.id,
          items: [{ productoId: t14.id, cantidad: 99 }],
        },
        f.actor,
      );
      await f.pedidos.anular(anulado.id, { motivo: "se equivocaron en la llamada" }, f.actor);

      await f.cierre.cerrar({}, f.actor);
      const texto = await f.hoja.textoPlano(f.orgId, "2026-08-22");
      expect(texto).toContain("PEDIDO PARA SÁBADO");
      expect(texto).toContain("TABASCO CASA VIEJA");
      expect(texto).toContain("GRUESAS");
      expect(texto).toContain("METROPLAZA — ENTREGAR 9:00 AM");
      expect(texto).toContain("llevar junto con las tortillas de la mañana");
      expect(texto).not.toContain("99");
      expect(texto).not.toContain("cargar en planta");

      const pdf = await f.hoja.pdf(f.orgId, "2026-08-22");
      expect(pdf.subarray(0, 4).toString()).toBe("%PDF");
    } finally {
      await f.client.end({ timeout: 1 });
    }
  });

  test("F-601 resumen: monto snapshot, ruta y clientes sin pedido", async () => {
    const f = await fixture(relojControlado(instanteGT("2026-08-20T22:00:00")));
    try {
      const { t16, tabasco } = await catalogoBasico(f);
      const otro = await f.clientes.crear(
        { nombre: `14 Avenida ${crypto.randomUUID().slice(0, 6)}` },
        f.actor,
      );
      await f.ligas.upsert(otro.id, t16.id, { precioCentavos: 1250 }, f.actor);
      await f.pedidos.crearManual(
        { clienteId: tabasco.id, items: [{ productoId: t16.id, cantidad: 50 }] },
        f.actor,
      );
      const op = await f.cierre.resumen(f.actor);
      expect(op.montoPedidosCentavos).toBe(62500);
      expect(op.ruta.confirmados).toBe(1);
      expect(op.ruta.anulados).toBe(0);
      expect(op.clientesSinPedido.some((c) => c.clienteId === otro.id)).toBe(
        true,
      );
      expect(op.clientesSinPedido.some((c) => c.clienteId === tabasco.id)).toBe(
        false,
      );
    } finally {
      await f.client.end({ timeout: 1 });
    }
  });
});
