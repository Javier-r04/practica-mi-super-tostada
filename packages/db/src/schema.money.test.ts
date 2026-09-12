import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { getTableColumns, getTableName } from "drizzle-orm";
import { getTableConfig } from "drizzle-orm/pg-core";
import {
  clienteBono,
  clienteProducto,
  conversacion,
  factura,
  mensaje,
  outbox,
  pago,
  pedidoItem,
  producto,
} from "./schema";

const COLUMNAS_DINERO = [
  clienteProducto.precioCentavos,
  producto.precioBaseCentavos,
  pedidoItem.precioUnitarioCentavos,
  factura.montoCentavos,
  pago.montoCentavos,
];

describe("columnas de dinero", () => {
  test("todos los montos son integer; nunca real/double/numeric", () => {
    for (const col of COLUMNAS_DINERO) {
      const sqlType = col.getSQLType();
      expect(sqlType).toBe("integer");
      expect(sqlType).not.toMatch(/real|double|numeric|float|decimal/i);
    }
  });

  test("las tablas con dinero exponen las columnas esperadas", () => {
    expect(getTableName(pedidoItem)).toBe("pedido_item");
    expect(Object.keys(getTableColumns(factura))).toContain("montoCentavos");
    expect(Object.keys(getTableColumns(pago))).toContain("montoCentavos");
    expect(Object.keys(getTableColumns(clienteProducto))).toContain(
      "precioCentavos",
    );
    expect(Object.keys(getTableColumns(producto))).toContain("precioBaseCentavos");
    expect(Object.keys(getTableColumns(clienteBono))).toContain(
      "cantidadOtorgada",
    );
    expect(Object.keys(getTableColumns(clienteBono))).toContain(
      "cantidadAplicada",
    );
  });
});

describe("constraints de idempotencia", () => {
  test("outbox tiene unique (tipo, destinatario_id, fecha_operacion)", () => {
    const config = getTableConfig(outbox);
    const cols = (constraint: { columns: { name: string }[] }) =>
      constraint.columns.map((c) => c.name).sort();

    const matches = [
      ...config.uniqueConstraints,
      ...config.indexes.filter((idx) => idx.config.unique),
    ].some((item) => {
      const names =
        "columns" in item
          ? cols(item as { columns: { name: string }[] })
          : (item as { config: { columns: { name: string }[] } }).config.columns
              .map((c) => c.name)
              .sort();
      return (
        names.includes("tipo") &&
        names.includes("destinatario_id") &&
        names.includes("fecha_operacion") &&
        names.length === 3
      );
    });

    expect(matches).toBe(true);
  });

  test("mensaje.wa_message_id es unique", () => {
    const config = getTableConfig(mensaje);
    const hasUnique = config.uniqueConstraints.some((u) =>
      u.columns.some((c) => c.name === "wa_message_id"),
    );
    expect(hasUnique).toBe(true);
  });

  test("conversacion.cliente_id es unique: un hilo por restaurante", () => {
    const config = getTableConfig(conversacion);
    const hasUnique = config.uniqueConstraints.some((u) =>
      u.columns.some((c) => c.name === "cliente_id"),
    );
    expect(hasUnique).toBe(true);
  });
});

describe("migración 0001", () => {
  const sql = readFileSync(
    join(
      dirname(fileURLToPath(import.meta.url)),
      "../drizzle/0001_init.sql",
    ),
    "utf8",
  );

  test("los centavos se declaran integer en SQL", () => {
    const moneyLines = sql
      .split("\n")
      .filter((line) => line.includes("centavos"));
    expect(moneyLines.length).toBeGreaterThan(0);
    for (const line of moneyLines) {
      expect(line).toMatch(/integer/);
      expect(line).not.toMatch(/real|double|numeric|float|decimal/i);
    }
  });

  test("incluye unique de outbox y wa_message_id", () => {
    expect(sql).toContain("outbox_idempotencia_unique");
    expect(sql).toContain("mensaje_wa_message_id_unique");
  });
});
