/**
 * Seed de desarrollo con los datos de CONTEXT.md §5.
 * Idempotente: se puede correr dos veces sin duplicar.
 * No inventa precios (precio_centavos queda null).
 */
import { resolve } from "node:path";
import { config } from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq, and } from "drizzle-orm";
import postgres from "postgres";
import * as schema from "./schema";

config({ path: resolve(import.meta.dir, "../../../.env") });
config({ path: resolve(process.cwd(), ".env") });
config({ path: resolve(process.cwd(), "../../.env") });

const ORG_ID = "00000000-0000-4000-a000-000000000001";

const PRODUCTOS = [
  {
    sku: "TORT-16",
    nombreCanonico: "Tortilla No. 16 (grande)",
    familia: "TORTILLA" as const,
    unidadMedida: "LIBRA" as const,
    puntoCarga: "DEMOCRACIA" as const,
    esProducido: true,
    orden: 1,
  },
  {
    sku: "TORT-14",
    nombreCanonico: "Tortilla No. 14 (mediana)",
    familia: "TORTILLA" as const,
    unidadMedida: "LIBRA" as const,
    puntoCarga: "DEMOCRACIA" as const,
    esProducido: true,
    orden: 2,
  },
  {
    sku: "TORT-12",
    nombreCanonico: "Tortilla No. 12 (pequeña)",
    familia: "TORTILLA" as const,
    unidadMedida: "LIBRA" as const,
    puntoCarga: "DEMOCRACIA" as const,
    esProducido: true,
    orden: 3,
  },
  {
    sku: "TOST-G",
    nombreCanonico: "Tostada grande",
    familia: "TOSTADA" as const,
    unidadMedida: "LIBRA" as const,
    puntoCarga: "PLANTA" as const,
    esProducido: true,
    orden: 4,
  },
  {
    sku: "TOST-P",
    nombreCanonico: "Tostada pequeña",
    familia: "TOSTADA" as const,
    unidadMedida: "LIBRA" as const,
    puntoCarga: "PLANTA" as const,
    esProducido: true,
    orden: 5,
  },
  {
    sku: "NACH-B",
    nombreCanonico: "Nachos blancos",
    familia: "FRITURA" as const,
    unidadMedida: "BOLSA" as const,
    puntoCarga: "PLANTA" as const,
    esProducido: true,
    orden: 6,
  },
  {
    sku: "NACH-A",
    nombreCanonico: "Nachos amarillos",
    familia: "FRITURA" as const,
    unidadMedida: "BOLSA" as const,
    puntoCarga: "PLANTA" as const,
    esProducido: true,
    orden: 7,
  },
  {
    sku: "PAL-B",
    nombreCanonico: "Palitos blancos",
    familia: "FRITURA" as const,
    unidadMedida: "BOLSA" as const,
    puntoCarga: "PLANTA" as const,
    esProducido: true,
    orden: 8,
  },
  {
    sku: "PAL-A",
    nombreCanonico: "Palitos amarillos",
    familia: "FRITURA" as const,
    unidadMedida: "BOLSA" as const,
    puntoCarga: "PLANTA" as const,
    esProducido: true,
    orden: 9,
  },
  {
    sku: "PAPA-S",
    nombreCanonico: "Papalinas saladas",
    familia: "FRITURA" as const,
    unidadMedida: "BOLSA" as const,
    puntoCarga: "PLANTA" as const,
    esProducido: true,
    orden: 10,
  },
  {
    sku: "PAPA-BBQ",
    nombreCanonico: "Papalinas barbacoa",
    familia: "FRITURA" as const,
    unidadMedida: "BOLSA" as const,
    puntoCarga: "PLANTA" as const,
    esProducido: true,
    orden: 11,
  },
  {
    sku: "FAJITA",
    nombreCanonico: "Fajitas",
    familia: "FRITURA" as const,
    unidadMedida: "BOLSA" as const,
    puntoCarga: "PLANTA" as const,
    esProducido: true,
    orden: 12,
  },
] as const;

const CLIENTES = [
  {
    nombre: "Tabasco Casa Vieja",
    notasPermanentes: "Paga en efectivo. ~10 presentaciones.",
    limiteFacturasPendientes: null,
    horarioEntregaFijo: null,
  },
  {
    nombre: "Tabasco Interplaza",
    notasPermanentes: "Pago semanal.",
    limiteFacturasPendientes: 5,
    horarioEntregaFijo: null,
  },
  {
    nombre: "Tabasco de la Esperanza",
    notasPermanentes: null,
    limiteFacturasPendientes: null,
    horarioEntregaFijo: null,
  },
  {
    nombre: "Casa Vieja del estadio",
    notasPermanentes: "Paga diario.",
    limiteFacturasPendientes: 3,
    horarioEntregaFijo: null,
  },
  {
    nombre: "Don Napo",
    notasPermanentes: "Pide ~1 vez por semana.",
    limiteFacturasPendientes: 2,
    horarioEntregaFijo: null,
  },
  {
    nombre: "Kraken",
    notasPermanentes: "Único cliente que pide fajitas.",
    limiteFacturasPendientes: null,
    horarioEntregaFijo: null,
  },
  {
    nombre: "14 Avenida",
    notasPermanentes: null,
    limiteFacturasPendientes: null,
    horarioEntregaFijo: null,
  },
  {
    nombre: "Victorias",
    notasPermanentes: "Pago semanal. Caso real de 15 días de atraso.",
    limiteFacturasPendientes: null,
    horarioEntregaFijo: null,
  },
  {
    nombre: "Buen Camarón",
    notasPermanentes: "Paga con TRANSFERENCIA.",
    limiteFacturasPendientes: null,
    horarioEntregaFijo: null,
  },
  {
    nombre: "Pura Frescura",
    notasPermanentes: "Caso real de 2 pedidos acumulados.",
    limiteFacturasPendientes: null,
    horarioEntregaFijo: null,
  },
  {
    nombre: "Metroplaza",
    notasPermanentes: "Centro comercial abre a las 09:00.",
    limiteFacturasPendientes: null,
    horarioEntregaFijo: "09:00",
  },
  {
    nombre: "Escuelita La Ciénaga",
    notasPermanentes:
      "Paga con cheque. El enum de método no incluye CHEQUE hasta F-503.",
    limiteFacturasPendientes: null,
    horarioEntregaFijo: "09:00",
  },
  {
    nombre: "Tienda 6",
    notasPermanentes: "Pedidos extraordinarios por llamada.",
    limiteFacturasPendientes: null,
    horarioEntregaFijo: null,
  },
] as const;

/** Feriados nacionales. Los domingos NO se seedan: son no laborables por regla. */
const FERIADOS = [
  { fecha: "2026-01-01", motivo: "Año Nuevo" },
  { fecha: "2026-04-02", motivo: "Jueves Santo" },
  { fecha: "2026-04-03", motivo: "Viernes Santo" },
  { fecha: "2026-05-01", motivo: "Día del Trabajo" },
  { fecha: "2026-06-30", motivo: "Día del Ejército" },
  { fecha: "2026-09-15", motivo: "Independencia" },
  { fecha: "2026-10-20", motivo: "Revolución" },
  { fecha: "2026-11-01", motivo: "Todos los Santos" },
  { fecha: "2026-12-25", motivo: "Navidad" },
  { fecha: "2027-01-01", motivo: "Año Nuevo" },
  { fecha: "2027-03-25", motivo: "Jueves Santo" },
  { fecha: "2027-03-26", motivo: "Viernes Santo" },
  { fecha: "2027-05-01", motivo: "Día del Trabajo" },
  { fecha: "2027-06-30", motivo: "Día del Ejército" },
  { fecha: "2027-09-15", motivo: "Independencia" },
  { fecha: "2027-10-20", motivo: "Revolución" },
  { fecha: "2027-11-01", motivo: "Todos los Santos" },
  { fecha: "2027-12-25", motivo: "Navidad" },
] as const;

export async function seed(databaseUrl: string) {
  const client = postgres(databaseUrl, { max: 1 });
  const db = drizzle(client, { schema });

  try {
    await db
      .insert(schema.organizacion)
      .values({
        id: ORG_ID,
        nombre: "Mi Súper Tostada",
        ventanaApertura: "15:00",
        ventanaCierre: "00:00",
      })
      .onConflictDoNothing({ target: schema.organizacion.id });

    await db
      .insert(schema.producto)
      .values(
        PRODUCTOS.map((p) => ({
          organizacionId: ORG_ID,
          ...p,
        })),
      )
      .onConflictDoNothing();

    await db
      .insert(schema.cliente)
      .values(
        CLIENTES.map((c) => ({
          organizacionId: ORG_ID,
          ...c,
        })),
      )
      .onConflictDoNothing();

    await db
      .insert(schema.diaNoLaborable)
      .values(
        FERIADOS.map((f) => ({
          organizacionId: ORG_ID,
          fecha: f.fecha,
          motivo: f.motivo,
          editable: true,
        })),
      )
      .onConflictDoNothing();

    const tortillas = await db
      .select()
      .from(schema.producto)
      .where(
        and(
          eq(schema.producto.organizacionId, ORG_ID),
          eq(schema.producto.familia, "TORTILLA"),
        ),
      );

    const [tabascoCasaVieja] = await db
      .select()
      .from(schema.cliente)
      .where(
        and(
          eq(schema.cliente.organizacionId, ORG_ID),
          eq(schema.cliente.nombre, "Tabasco Casa Vieja"),
        ),
      );

    if (tabascoCasaVieja) {
      await db
        .insert(schema.clienteProducto)
        .values(
          tortillas.map((t, i) => ({
            clienteId: tabascoCasaVieja.id,
            productoId: t.id,
            notaProduccion: "GRUESA",
            precioCentavos: null,
            orden: i + 1,
          })),
        )
        .onConflictDoNothing();
    }

    const [kraken] = await db
      .select()
      .from(schema.cliente)
      .where(
        and(
          eq(schema.cliente.organizacionId, ORG_ID),
          eq(schema.cliente.nombre, "Kraken"),
        ),
      );

    const [fajitas] = await db
      .select()
      .from(schema.producto)
      .where(
        and(
          eq(schema.producto.organizacionId, ORG_ID),
          eq(schema.producto.sku, "FAJITA"),
        ),
      );

    if (kraken && fajitas) {
      await db
        .insert(schema.clienteProducto)
        .values({
          clienteId: kraken.id,
          productoId: fajitas.id,
          precioCentavos: null,
          orden: 1,
        })
        .onConflictDoNothing();
    }
  } finally {
    await client.end();
  }
}

if (import.meta.main) {
  const url =
    process.env.DATABASE_URL ??
    "postgresql://postgres:postgres@localhost:5432/misupertostada";
  await seed(url);
  console.log("Seed CONTEXT §5 aplicado (idempotente).");
}
