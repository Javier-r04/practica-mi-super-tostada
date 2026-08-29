import { createHash, createCipheriv, randomBytes } from "node:crypto";
import { and, asc, eq, inArray, isNull, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import {
  createBusinessCalendar,
  hojaSnapshotSchema,
  textoHoja,
  ZONA_NEGOCIO,
  type BloqueCliente,
  type BusinessCalendar,
  type HojaSnapshot,
  type LineaClienteItem,
  type LineaProducto,
} from "@misupertostada/shared";
import { DateTime } from "luxon";
import * as schema from "../schema";
import {
  ALIAS_DEMO,
  CLIENTES_MEGA,
  CONTACTOS_BASE_ENRICH,
  PRECIOS_DEMO_CENTAVOS,
  type PerfilCliente,
} from "./catalog";
import { MEGA_SEED_MARKER, conMarcador } from "./marker";

type Db = PostgresJsDatabase<typeof schema>;

type ProductoRow = typeof schema.producto.$inferSelect;
type ClienteRow = typeof schema.cliente.$inferSelect;
type UsuarioRow = typeof schema.usuario.$inferSelect;

const ORG_ID = "00000000-0000-4000-a000-000000000001";

/** Cuántos días hábiles hacia atrás generar (incluye hoy). */
const DIAS_HABILES = 45;

export type MegaSeedStats = {
  clientesNuevos: number;
  pedidos: number;
  facturas: number;
  pagos: number;
  conversaciones: number;
  mensajes: number;
  hojas: number;
  fechaOperacionHoy: string;
};

export async function runMegaSeed(db: Db): Promise<MegaSeedStats> {
  const now = new Date();
  const feriados = await db
    .select({ fecha: schema.diaNoLaborable.fecha })
    .from(schema.diaNoLaborable)
    .where(eq(schema.diaNoLaborable.organizacionId, ORG_ID));
  const cal = createBusinessCalendar({
    diasNoLaborables: feriados.map((f) => f.fecha),
  });

  const productos = await db
    .select()
    .from(schema.producto)
    .where(eq(schema.producto.organizacionId, ORG_ID));
  if (productos.length === 0) {
    throw new Error(
      "No hay productos. Corré primero `bun run db:seed` (seed base).",
    );
  }

  const usuarios = await db
    .select()
    .from(schema.usuario)
    .where(eq(schema.usuario.organizacionId, ORG_ID));
  const cristian = usuarios.find((u) => u.username === "cristian");
  const carla = usuarios.find((u) => u.username === "carla");
  const tony = usuarios.find((u) => u.username === "tony");
  if (!cristian || !carla || !tony) {
    throw new Error(
      "Faltan usuarios seed (cristian/carla/tony). Corré `bun run db:seed`.",
    );
  }

  const fechasHabiles = listarDiasHabilesPasados(cal, DIAS_HABILES, now);
  const fechaHoy = fechasHabiles[0]!;

  const clientesMega = await insertarClientesMega(db, productos);
  const clientesBase = await cargarClientesBaseEnrich(db);
  const todosClientes = [...clientesMega, ...clientesBase];

  await asegurarCatalogoClientes(db, todosClientes, productos);

  const [agg] = await db
    .select({
      max: sql<number>`coalesce(max(${schema.pedido.correlativo}), 0)::int`,
    })
    .from(schema.pedido)
    .where(eq(schema.pedido.organizacionId, ORG_ID));
  let correlativo = Number(agg?.max ?? 0);

  const stats: MegaSeedStats = {
    clientesNuevos: clientesMega.length,
    pedidos: 0,
    facturas: 0,
    pagos: 0,
    conversaciones: 0,
    mensajes: 0,
    hojas: 0,
    fechaOperacionHoy: fechaHoy,
  };

  // —— Pedidos del día operativo actual (ruta / producción / bandeja) ——
  const clientesActivos = todosClientes.filter((c) => c.activo);
  const shuffleHoy = shuffle(clientesActivos);
  const enRuta = shuffleHoy.slice(0, 12);
  const confirmados = shuffleHoy.slice(12, 18);
  const borradores = shuffleHoy.slice(18, 22);
  const entregadosHoy = shuffleHoy.slice(22, 26);

  for (const c of enRuta) {
    correlativo += 1;
    const r = await crearPedidoCompleto(db, {
      correlativo,
      cliente: c,
      productos,
      fechaOperacion: fechaHoy,
      cal,
      estado: "EN_PRODUCCION",
      origen: chance(0.35) ? "PORTAL" : "MANUAL",
      capturadoPor: carla.id,
      createdAt: instanteCaptura(fechaHoy, cal, 0),
      perfil: perfilDe(c),
    });
    stats.pedidos += 1;
    if (r.factura) stats.facturas += 1;
  }

  for (const c of confirmados) {
    correlativo += 1;
    await crearPedidoCompleto(db, {
      correlativo,
      cliente: c,
      productos,
      fechaOperacion: fechaHoy,
      cal,
      estado: "CONFIRMADO",
      origen: chance(0.5) ? "PORTAL" : "MANUAL",
      capturadoPor: carla.id,
      createdAt: instanteCaptura(fechaHoy, cal, 0),
      perfil: perfilDe(c),
    });
    stats.pedidos += 1;
  }

  for (const c of borradores) {
    correlativo += 1;
    await crearPedidoCompleto(db, {
      correlativo,
      cliente: c,
      productos,
      fechaOperacion: fechaHoy,
      cal,
      estado: "BORRADOR",
      origen: "MANUAL",
      capturadoPor: carla.id,
      createdAt: new Date(now.getTime() - randInt(10, 120) * 60_000),
      perfil: perfilDe(c),
    });
    stats.pedidos += 1;
  }

  for (const c of entregadosHoy) {
    correlativo += 1;
    const r = await crearPedidoCompleto(db, {
      correlativo,
      cliente: c,
      productos,
      fechaOperacion: fechaHoy,
      cal,
      estado: "ENTREGADO",
      origen: chance(0.4) ? "PORTAL" : "MANUAL",
      capturadoPor: carla.id,
      createdAt: instanteCaptura(fechaHoy, cal, 0),
      perfil: perfilDe(c),
      pagoMode: chance(0.5) ? "completo" : "ninguno",
      registradoPor: tony.id,
    });
    stats.pedidos += 1;
    if (r.factura) stats.facturas += 1;
    stats.pagos += r.pagos;
  }

  // Un anulado hoy
  if (shuffleHoy[26]) {
    correlativo += 1;
    await crearPedidoCompleto(db, {
      correlativo,
      cliente: shuffleHoy[26],
      productos,
      fechaOperacion: fechaHoy,
      cal,
      estado: "ANULADO",
      origen: "MANUAL",
      capturadoPor: carla.id,
      createdAt: instanteCaptura(fechaHoy, cal, 0),
      perfil: perfilDe(shuffleHoy[26]),
      anulado: true,
      anuladoPor: cristian.id,
    });
    stats.pedidos += 1;
  }

  await upsertDiaOperacion(db, {
    fechaOperacion: fechaHoy,
    estado: "CERRADO",
    cerradoPor: cristian.id,
    cerradoAt: instanteCaptura(fechaHoy, cal, 0),
  });
  await insertarHoja(db, {
    fechaOperacion: fechaHoy,
    version: 1,
    generadoPor: cristian.id,
    cal,
  });
  stats.hojas += 1;

  // —— Histórico: días hábiles anteriores ——
  for (const fecha of fechasHabiles.slice(1)) {
    const cuantos = randInt(8, 18);
    const delDia = shuffle(clientesActivos).slice(0, cuantos);
    const pedidosDia: ClienteRow[] = [];

    for (const c of delDia) {
      if (!debePedirEnFecha(perfilDe(c), fecha, cal)) continue;
      correlativo += 1;
      const pagoMode = modoPagoHistorico(perfilDe(c));
      const r = await crearPedidoCompleto(db, {
        correlativo,
        cliente: c,
        productos,
        fechaOperacion: fecha,
        cal,
        estado: chance(0.04) ? "ANULADO" : "ENTREGADO",
        origen: chance(0.45) ? "PORTAL" : "MANUAL",
        capturadoPor: carla.id,
        createdAt: instanteCaptura(fecha, cal, 0),
        perfil: perfilDe(c),
        pagoMode: chance(0.04) ? undefined : pagoMode,
        registradoPor: chance(0.6) ? tony.id : carla.id,
        anulado: chance(0.04),
        anuladoPor: cristian.id,
      });
      stats.pedidos += 1;
      if (r.factura) stats.facturas += 1;
      stats.pagos += r.pagos;
      if (r.estado !== "ANULADO") pedidosDia.push(c);
    }

    if (pedidosDia.length > 0) {
      await upsertDiaOperacion(db, {
        fechaOperacion: fecha,
        estado: "CERRADO",
        cerradoPor: cristian.id,
        cerradoAt: instanteCaptura(fecha, cal, 0),
      });
      if (chance(0.55)) {
        await insertarHoja(db, {
          fechaOperacion: fecha,
          version: 1,
          generadoPor: cristian.id,
          cal,
        });
        stats.hojas += 1;
      }
    }
  }

  // —— WhatsApp / conversaciones ——
  const sampleWa = shuffle(clientesActivos).slice(0, 20);
  for (const c of sampleWa) {
    const conv = await seedConversacion(db, c, cristian, fechaHoy, now);
    stats.conversaciones += 1;
    stats.mensajes += conv.mensajes;
  }

  // —— Eventos / audit / outbox de muestra ——
  await db.insert(schema.domainEvents).values({
    tipo: "MegaSeedAplicado",
    payload: {
      marker: MEGA_SEED_MARKER,
      fechaOperacionHoy: fechaHoy,
      pedidos: stats.pedidos,
      clientesNuevos: stats.clientesNuevos,
    },
    ocurridoAt: now,
    procesadoAt: now,
  });

  await db.insert(schema.auditLog).values({
    actorTipo: "usuario",
    actorId: cristian.id,
    accion: `${MEGA_SEED_MARKER} seed_mega`,
    entidad: "sistema",
    entidadId: ORG_ID,
    antes: null,
    despues: { ...stats, marker: MEGA_SEED_MARKER },
    ip: "127.0.0.1",
    userAgent: "seed-mega",
    createdAt: now,
  });

  return stats;
}

async function insertarClientesMega(
  db: Db,
  _productos: ProductoRow[],
): Promise<ClienteRow[]> {
  const inserted: ClienteRow[] = [];
  let tel = 55552000;

  for (const def of CLIENTES_MEGA) {
    const tokenPlain = `mega-portal-${slug(def.nombre)}`;
    const [row] = await db
      .insert(schema.cliente)
      .values({
        organizacionId: ORG_ID,
        nombre: def.nombre,
        contacto: def.contacto,
        telefonoWa: `+502${tel++}`,
        horarioEntregaFijo: def.horarioEntregaFijo,
        notasPermanentes: conMarcador(def.notas),
        limiteFacturasPendientes: def.limiteFacturasPendientes,
        tokenPortalHash: createHash("sha256").update(tokenPlain).digest("hex"),
        tokenPortalCifrado: encryptSeed(tokenPlain),
        activo: def.perfil !== "inactivo",
      })
      .onConflictDoNothing()
      .returning();

    if (row) {
      inserted.push(row);
      continue;
    }
    // Ya existía (re-seed parcial): cargar
    const [existing] = await db
      .select()
      .from(schema.cliente)
      .where(
        and(
          eq(schema.cliente.organizacionId, ORG_ID),
          eq(schema.cliente.nombre, def.nombre),
        ),
      );
    if (existing) inserted.push(existing);
  }
  return inserted;
}

async function cargarClientesBaseEnrich(db: Db): Promise<ClienteRow[]> {
  const rows: ClienteRow[] = [];
  for (const nombre of CONTACTOS_BASE_ENRICH) {
    const [c] = await db
      .select()
      .from(schema.cliente)
      .where(
        and(
          eq(schema.cliente.organizacionId, ORG_ID),
          eq(schema.cliente.nombre, nombre),
        ),
      );
    if (c) rows.push(c);
  }
  return rows;
}

async function asegurarCatalogoClientes(
  db: Db,
  clientes: ClienteRow[],
  productos: ProductoRow[],
): Promise<void> {
  for (const c of clientes) {
    const def = CLIENTES_MEGA.find((d) => d.nombre === c.nombre);
    const skus =
      def?.skusPreferidos ??
      shuffle(productos.map((p) => p.sku)).slice(0, randInt(3, 7));
    let orden = 1;
    for (const sku of skus) {
      const producto = productos.find((p) => p.sku === sku);
      if (!producto) continue;
      const precio = PRECIOS_DEMO_CENTAVOS[sku] ?? 1200;
      await db
        .insert(schema.clienteProducto)
        .values({
          clienteId: c.id,
          productoId: producto.id,
          alias: ALIAS_DEMO[sku] ?? producto.nombreCanonico,
          precioCentavos: precio,
          favorito: orden <= 3,
          notaProduccion:
            producto.familia === "TORTILLA" && chance(0.3) ? "GRUESA" : null,
          orden: orden++,
        })
        .onConflictDoNothing();
      await db
        .update(schema.clienteProducto)
        .set({
          alias: ALIAS_DEMO[sku] ?? producto.nombreCanonico,
          precioCentavos: precio,
          favorito: orden <= 4,
        })
        .where(
          and(
            eq(schema.clienteProducto.clienteId, c.id),
            eq(schema.clienteProducto.productoId, producto.id),
          ),
        );
    }
  }
}

type PagoMode = "completo" | "parcial" | "ninguno";

async function crearPedidoCompleto(
  db: Db,
  opts: {
    correlativo: number;
    cliente: ClienteRow;
    productos: ProductoRow[];
    fechaOperacion: string;
    cal: BusinessCalendar;
    estado: "BORRADOR" | "CONFIRMADO" | "EN_PRODUCCION" | "ENTREGADO" | "ANULADO";
    origen: "PORTAL" | "MANUAL";
    capturadoPor: string;
    createdAt: Date;
    perfil: PerfilCliente;
    pagoMode?: PagoMode;
    registradoPor?: string;
    anulado?: boolean;
    anuladoPor?: string;
  },
): Promise<{
  estado: string;
  factura: boolean;
  pagos: number;
}> {
  const itemsDefs = elegirItems(opts.cliente, opts.productos, opts.perfil);
  const anulado = opts.anulado || opts.estado === "ANULADO";

  const [ped] = await db
    .insert(schema.pedido)
    .values({
      organizacionId: ORG_ID,
      correlativo: opts.correlativo,
      fechaOperacion: opts.fechaOperacion,
      fechaEntrega: opts.cal.getFechaEntrega(opts.fechaOperacion),
      clienteId: opts.cliente.id,
      estado: anulado ? "ANULADO" : opts.estado,
      origen: opts.origen,
      notasAdmin: conMarcador(
        anulado ? "Anulado en mega-seed (prueba)" : escenarioNota(opts.estado),
      ),
      capturadoPor: opts.capturadoPor,
      anuladoAt: anulado ? opts.createdAt : null,
      motivoAnulacion: anulado ? "Pedido de prueba anulado en mega-seed" : null,
      createdAt: opts.createdAt,
    })
    .returning();

  if (!ped) throw new Error("No se pudo insertar pedido mega");

  await db.insert(schema.pedidoItem).values(
    itemsDefs.map((it) => ({
      pedidoId: ped.id,
      productoId: it.producto.id,
      cantidadPedida: it.cantidad,
      cantidadEntregada:
        opts.estado === "ENTREGADO"
          ? Math.max(1, it.cantidad - (chance(0.15) ? randInt(0, 2) : 0))
          : it.cantidad,
      precioUnitarioCentavos: it.precio,
      nombreMostrado: it.nombre,
      unidadMedida: it.producto.unidadMedida,
    })),
  );

  if (anulado || opts.estado === "BORRADOR" || opts.estado === "CONFIRMADO") {
    return { estado: ped.estado, factura: false, pagos: 0 };
  }

  // EN_PRODUCCION y ENTREGADO: factura (regla de negocio: factura al entregar;
  // para pruebas de cartera también facturamos entregados; EN_PRODUCCION sin factura).
  if (opts.estado !== "ENTREGADO") {
    return { estado: ped.estado, factura: false, pagos: 0 };
  }

  const items = await db
    .select()
    .from(schema.pedidoItem)
    .where(eq(schema.pedidoItem.pedidoId, ped.id));
  const monto = items.reduce(
    (acc, it) => acc + it.cantidadEntregada * it.precioUnitarioCentavos,
    0,
  );

  const [fac] = await db
    .insert(schema.factura)
    .values({
      pedidoId: ped.id,
      numeroDte: chance(0.75)
        ? `DTE-MEGA-${opts.fechaOperacion.replace(/-/g, "")}-${opts.correlativo}`
        : null,
      montoCentavos: monto,
      emitidaAt: new Date(opts.createdAt.getTime() + 8 * 3600_000),
      createdAt: new Date(opts.createdAt.getTime() + 8 * 3600_000),
    })
    .returning();

  let pagos = 0;
  const mode = opts.pagoMode ?? "completo";
  if (mode === "completo" && fac) {
    await db.insert(schema.pago).values({
      facturaId: fac.id,
      montoCentavos: monto,
      metodo: metodoPago(opts.perfil),
      fecha: opts.fechaOperacion,
      registradoPor: opts.registradoPor ?? null,
      idempotencyKey: `mega-pago-${ped.id}-full`,
      createdAt: new Date(opts.createdAt.getTime() + 12 * 3600_000),
    });
    pagos = 1;
  } else if (mode === "parcial" && fac && monto > 200) {
    const abono = Math.floor(monto * randInt(25, 60) / 100);
    await db.insert(schema.pago).values({
      facturaId: fac.id,
      montoCentavos: abono,
      metodo: metodoPago(opts.perfil),
      fecha: opts.fechaOperacion,
      registradoPor: opts.registradoPor ?? null,
      idempotencyKey: `mega-pago-${ped.id}-parcial`,
      createdAt: new Date(opts.createdAt.getTime() + 12 * 3600_000),
    });
    pagos = 1;
  }

  return { estado: ped.estado, factura: true, pagos };
}

function elegirItems(
  cliente: ClienteRow,
  productos: ProductoRow[],
  perfil: PerfilCliente,
): Array<{
  producto: ProductoRow;
  cantidad: number;
  precio: number;
  nombre: string;
}> {
  const def = CLIENTES_MEGA.find((d) => d.nombre === cliente.nombre);
  const preferidos = (def?.skusPreferidos ?? [])
    .map((sku) => productos.find((p) => p.sku === sku))
    .filter(Boolean) as ProductoRow[];
  const pool =
    preferidos.length > 0
      ? preferidos
      : shuffle(productos).slice(0, randInt(2, 5));
  const n = Math.min(pool.length, randInt(1, Math.min(4, pool.length)));
  const elegidos = shuffle(pool).slice(0, n);
  const mult =
    perfil === "diario" ? 1.2 : perfil === "ocasional" ? 0.7 : 1;

  return elegidos.map((producto) => {
    const base =
      producto.unidadMedida === "LIBRA"
        ? randInt(10, 80)
        : randInt(2, 20);
    const cantidad = Math.max(1, Math.round(base * mult));
    const precio =
      PRECIOS_DEMO_CENTAVOS[producto.sku] ??
      (producto.familia === "TORTILLA" ? 1100 : 1400);
    return {
      producto,
      cantidad,
      precio,
      nombre: ALIAS_DEMO[producto.sku] ?? producto.nombreCanonico,
    };
  });
}

async function upsertDiaOperacion(
  db: Db,
  opts: {
    fechaOperacion: string;
    estado: "ABIERTO" | "CERRADO" | "REABIERTO";
    cerradoPor: string;
    cerradoAt: Date;
  },
): Promise<void> {
  await db
    .insert(schema.diaOperacion)
    .values({
      organizacionId: ORG_ID,
      fechaOperacion: opts.fechaOperacion,
      estado: opts.estado,
      motivoReapertura:
        opts.estado === "REABIERTO" ? conMarcador("reapertura demo") : null,
      cerradoAt: opts.cerradoAt,
      cerradoPor: opts.cerradoPor,
      createdAt: opts.cerradoAt,
    })
    .onConflictDoNothing();
}

async function insertarHoja(
  db: Db,
  opts: {
    fechaOperacion: string;
    version: number;
    generadoPor: string;
    cal: BusinessCalendar;
  },
): Promise<void> {
  const snapshot = await construirSnapshotDesdePedidos(
    db,
    opts.fechaOperacion,
    opts.version,
    opts.cal,
  );
  const texto = `${MEGA_SEED_MARKER}\n${textoHoja(snapshot)}`;

  await db
    .insert(schema.hojaProduccion)
    .values({
      organizacionId: ORG_ID,
      fechaOperacion: opts.fechaOperacion,
      version: opts.version,
      snapshot,
      texto,
      generadoAt: new Date(),
      generadoPor: opts.generadoPor,
    })
    .onConflictDoNothing();
}

/**
 * Misma forma que HojaService.construirSnapshot, pero incluye pedidos ya
 * pasados a EN_PRODUCCION/ENTREGADO (el mega-seed no deja CONFIRMADO al cerrar).
 */
async function construirSnapshotDesdePedidos(
  db: Db,
  fechaOperacion: string,
  version: number,
  cal: BusinessCalendar,
): Promise<HojaSnapshot> {
  const filas = await db
    .select({
      clienteId: schema.cliente.id,
      clienteNombre: schema.cliente.nombre,
      horario: schema.cliente.horarioEntregaFijo,
      notasPermanentes: schema.cliente.notasPermanentes,
      notasAdmin: schema.pedido.notasAdmin,
      productoId: schema.producto.id,
      nombreCanonico: schema.producto.nombreCanonico,
      unidadMedida: schema.producto.unidadMedida,
      puntoCarga: schema.producto.puntoCarga,
      familia: schema.producto.familia,
      cantidad: schema.pedidoItem.cantidadPedida,
      notaProduccion: schema.clienteProducto.notaProduccion,
    })
    .from(schema.pedido)
    .innerJoin(schema.cliente, eq(schema.cliente.id, schema.pedido.clienteId))
    .innerJoin(
      schema.pedidoItem,
      eq(schema.pedidoItem.pedidoId, schema.pedido.id),
    )
    .innerJoin(
      schema.producto,
      eq(schema.producto.id, schema.pedidoItem.productoId),
    )
    .leftJoin(
      schema.clienteProducto,
      and(
        eq(schema.clienteProducto.clienteId, schema.pedido.clienteId),
        eq(schema.clienteProducto.productoId, schema.pedidoItem.productoId),
      ),
    )
    .where(
      and(
        eq(schema.pedido.organizacionId, ORG_ID),
        eq(schema.pedido.fechaOperacion, fechaOperacion),
        isNull(schema.pedido.anuladoAt),
        inArray(schema.pedido.estado, [
          "CONFIRMADO",
          "EN_PRODUCCION",
          "ENTREGADO",
        ]),
      ),
    )
    .orderBy(asc(schema.cliente.nombre), asc(schema.producto.nombreCanonico));

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
    esSabado: cal.isSabado(fechaOperacion),
    version,
    productos,
    clientes,
  });
}

async function seedConversacion(
  db: Db,
  cliente: ClienteRow,
  admin: UsuarioRow,
  fechaHoy: string,
  now: Date,
): Promise<{ mensajes: number }> {
  const ventanaAbierta = chance(0.55);
  const ultimoInbound = new Date(
    now.getTime() - randInt(1, ventanaAbierta ? 20 : 48) * 3600_000,
  );
  const [conv] = await db
    .insert(schema.conversacion)
    .values({
      clienteId: cliente.id,
      ventanaExpiraAt: ventanaAbierta
        ? new Date(ultimoInbound.getTime() + 24 * 3600_000)
        : new Date(ultimoInbound.getTime() + 24 * 3600_000),
      ultimoInboundAt: ultimoInbound,
      noLeidos: ventanaAbierta && chance(0.4) ? randInt(1, 4) : 0,
      createdAt: ultimoInbound,
    })
    .onConflictDoNothing()
    .returning();

  const conversacionId =
    conv?.id ??
    (
      await db
        .select()
        .from(schema.conversacion)
        .where(eq(schema.conversacion.clienteId, cliente.id))
    )[0]?.id;

  if (!conversacionId) return { mensajes: 0 };

  const msgs = [
    {
      direction: "OUTBOUND" as const,
      tipo: "template",
      templateName: "mst_invitacion_v1",
      body: `${MEGA_SEED_MARKER} Invitación a pedir para ${fechaHoy}`,
      status: "delivered",
      enviadoPor: admin.id,
      at: new Date(ultimoInbound.getTime() - 2 * 3600_000),
    },
    {
      direction: "INBOUND" as const,
      tipo: "text",
      templateName: null,
      body: `${MEGA_SEED_MARKER} Ok, ya armamos el pedido`,
      status: "received",
      enviadoPor: null,
      at: ultimoInbound,
    },
  ];
  if (ventanaAbierta && chance(0.5)) {
    msgs.push({
      direction: "OUTBOUND" as const,
      tipo: "text",
      templateName: null,
      body: `${MEGA_SEED_MARKER} Perfecto, queda confirmado.`,
      status: "sent",
      enviadoPor: admin.id,
      at: new Date(ultimoInbound.getTime() + 5 * 60_000),
    });
  }

  let i = 0;
  for (const m of msgs) {
    await db.insert(schema.mensaje).values({
      conversacionId,
      waMessageId: `mega-wa-${cliente.id.slice(0, 8)}-${i++}-${Date.now()}`,
      direction: m.direction,
      tipo: m.tipo,
      templateName: m.templateName,
      params: { marker: MEGA_SEED_MARKER },
      bodyRenderizado: m.body,
      status: m.status,
      enviadoPor: m.enviadoPor,
      createdAt: m.at,
    });
  }

  await db.insert(schema.outbox).values({
    tipo: "INVITACION",
    destinatarioId: cliente.id,
    fechaOperacion: fechaHoy,
    payload: {
      marker: MEGA_SEED_MARKER,
      clienteId: cliente.id,
      fechaOperacion: fechaHoy,
    },
    estado: "ENVIADO",
    intentos: 1,
    createdAt: now,
  }).onConflictDoNothing();

  return { mensajes: msgs.length };
}

// ——— helpers ———

function listarDiasHabilesPasados(
  cal: BusinessCalendar,
  n: number,
  now: Date,
): string[] {
  const fechas: string[] = [];
  let cursor = DateTime.fromJSDate(now, { zone: ZONA_NEGOCIO }).startOf("day");
  // Preferir la fecha_operacion de negocio de “hoy” como primer elemento.
  const hoyOp = cal.getFechaOperacion(now);
  fechas.push(hoyOp);

  // Retroceder desde el día calendario de hoyOp
  cursor = DateTime.fromISO(hoyOp, { zone: ZONA_NEGOCIO }).minus({ days: 1 });
  while (fechas.length < n) {
    const iso = cursor.toISODate()!;
    if (!cal.isDiaNoLaborable(iso)) {
      fechas.push(iso);
    }
    cursor = cursor.minus({ days: 1 });
  }
  return fechas;
}

function instanteCaptura(
  fechaOperacion: string,
  _cal: BusinessCalendar,
  offsetDiasDesdeOp: number,
): Date {
  // Captura la misma noche de la fecha_operacion (ventana 15:00–00:00).
  const entrega = DateTime.fromISO(fechaOperacion, { zone: ZONA_NEGOCIO });
  const captura = entrega
    .plus({ days: offsetDiasDesdeOp })
    .set({ hour: randInt(15, 22), minute: randInt(0, 59), second: 0 });
  return captura.toJSDate();
}

function debePedirEnFecha(
  perfil: PerfilCliente,
  fecha: string,
  cal: BusinessCalendar,
): boolean {
  if (perfil === "inactivo") return false;
  if (perfil === "diario") return chance(0.85);
  if (perfil === "semanal") {
    const wd = DateTime.fromISO(fecha, { zone: ZONA_NEGOCIO }).weekday;
    return wd === 2 || wd === 5 ? chance(0.9) : chance(0.15);
  }
  if (perfil === "ocasional") return chance(0.2);
  if (perfil === "moroso") return chance(0.7);
  if (perfil === "transferencia") return chance(0.75);
  return !cal.isSabado(fecha) && chance(0.5);
}

function modoPagoHistorico(perfil: PerfilCliente): PagoMode {
  if (perfil === "moroso") {
    return pick(["ninguno", "ninguno", "parcial", "parcial", "completo"]);
  }
  if (perfil === "transferencia") {
    return pick(["completo", "completo", "parcial", "ninguno"]);
  }
  return pick(["completo", "completo", "completo", "parcial", "ninguno"]);
}

function metodoPago(perfil: PerfilCliente): "EFECTIVO" | "TRANSFERENCIA" {
  if (perfil === "transferencia") return "TRANSFERENCIA";
  return chance(0.55) ? "EFECTIVO" : "TRANSFERENCIA";
}

function perfilDe(cliente: ClienteRow): PerfilCliente {
  const def = CLIENTES_MEGA.find((d) => d.nombre === cliente.nombre);
  if (def) return def.perfil;
  // Clientes base: perfiles razonables
  if (cliente.nombre.includes("Victorias")) return "moroso";
  if (cliente.nombre.includes("Buen Camarón")) return "transferencia";
  if (cliente.nombre.includes("Don Napo")) return "ocasional";
  return "diario";
}

function escenarioNota(estado: string): string {
  switch (estado) {
    case "EN_PRODUCCION":
      return "En ruta / producción (mega)";
    case "CONFIRMADO":
      return "Confirmado pendiente de cierre (mega)";
    case "BORRADOR":
      return "Borrador de captura (mega)";
    case "ENTREGADO":
      return "Entregado (mega)";
    default:
      return "Pedido mega";
  }
}

function slug(nombre: string): string {
  return nombre
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function chance(p: number): boolean {
  return Math.random() < p;
}

function pick<T>(arr: T[]): T {
  return arr[randInt(0, arr.length - 1)]!;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = randInt(0, i);
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

function encryptSeed(plain: string): string | null {
  const hex = process.env.APP_ENCRYPTION_KEY;
  if (!hex || !/^[0-9a-fA-F]{64}$/.test(hex)) return null;
  const key = Buffer.from(hex, "hex");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plain, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return [
    "v1",
    iv.toString("base64url"),
    tag.toString("base64url"),
    encrypted.toString("base64url"),
  ].join(".");
}
