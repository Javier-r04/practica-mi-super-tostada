import { describe, expect, test } from "bun:test";
import { parseCsv } from "./csv";
import {
  crearProductoRequestSchema,
  horarioEntregaSchema,
  importarCsvRequestSchema,
  PLANTILLAS_CSV,
  upsertClienteProductoRequestSchema,
} from "./catalog";

describe("crearProductoRequestSchema", () => {
  test("normaliza SKU a mayúsculas", () => {
    const parsed = crearProductoRequestSchema.parse({
      sku: "tort-16",
      nombreCanonico: "Tortilla No. 16 (grande)",
      familia: "TORTILLA",
      unidadMedida: "LIBRA",
      puntoCarga: "DEMOCRACIA",
    });
    expect(parsed.sku).toBe("TORT-16");
    expect(parsed.esProducido).toBe(true);
  });

  test("rechaza familia inventada y SKU vacío", () => {
    expect(
      crearProductoRequestSchema.safeParse({
        sku: "X",
        nombreCanonico: "X",
        familia: "SNACKS",
        unidadMedida: "LIBRA",
        puntoCarga: "PLANTA",
      }).success,
    ).toBe(false);
    expect(
      crearProductoRequestSchema.safeParse({
        sku: "   ",
        nombreCanonico: "X",
        familia: "TORTILLA",
        unidadMedida: "LIBRA",
        puntoCarga: "PLANTA",
      }).success,
    ).toBe(false);
  });
});

describe("upsertClienteProductoRequestSchema", () => {
  test("acepta centavos enteros y rechaza floats", () => {
    expect(
      upsertClienteProductoRequestSchema.parse({ precioCentavos: 1250 })
        .precioCentavos,
    ).toBe(1250);
    expect(
      upsertClienteProductoRequestSchema.safeParse({ precioCentavos: 12.5 })
        .success,
    ).toBe(false);
    expect(
      upsertClienteProductoRequestSchema.parse({ precioCentavos: null })
        .precioCentavos,
    ).toBeNull();
  });
});

describe("horarioEntregaSchema", () => {
  test("acepta HH:MM y rechaza basura", () => {
    expect(horarioEntregaSchema.parse("09:00")).toBe("09:00");
    expect(horarioEntregaSchema.parse(null)).toBeNull();
    expect(horarioEntregaSchema.safeParse("9:00").success).toBe(false);
    expect(horarioEntregaSchema.safeParse("25:00").success).toBe(false);
  });
});

describe("parseCsv", () => {
  test("respeta comillas con coma interior", () => {
    const { rows } = parseCsv(
      'nombre,notas_permanentes\n"Escuelita La Ciénaga","Paga con cheque, no efectivo"\n',
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]!.nombre).toBe("Escuelita La Ciénaga");
    expect(rows[0]!.notas_permanentes).toBe("Paga con cheque, no efectivo");
  });

  test("plantillas tienen el encabezado esperado", () => {
    expect(PLANTILLAS_CSV.productos).toContain("sku,nombre_canonico");
    expect(PLANTILLAS_CSV.clientes).toContain("limite_facturas_pendientes");
    expect(PLANTILLAS_CSV.cliente_producto).toContain("precio");
    expect(
      importarCsvRequestSchema.parse({
        tipo: "productos",
        csv: PLANTILLAS_CSV.productos,
      }).tipo,
    ).toBe("productos");
  });
});
