import { describe, expect, test } from "bun:test";
import type { LineaProducto } from "@misupertostada/shared";
import {
  deltaCantidad,
  gruposPorFamilia,
  lineasVisibles,
  totalesPorFamilia,
} from "./produccion-vista";

function linea(
  parcial: Partial<LineaProducto> &
    Pick<LineaProducto, "productoId" | "nombreCanonico" | "cantidad">,
): LineaProducto {
  return {
    unidadMedida: "LIBRA",
    puntoCargaEfectivo: "PLANTA",
    notaProduccion: null,
    familia: "TORTILLA",
    ...parcial,
  };
}

describe("gruposPorFamilia", () => {
  test("Tortilla primero, luego Tostada, luego Fritura", () => {
    const grupos = gruposPorFamilia([
      linea({
        productoId: "00000000-0000-4000-8000-000000000003",
        nombreCanonico: "Papalinas",
        cantidad: 5,
        familia: "FRITURA",
        unidadMedida: "BOLSA",
      }),
      linea({
        productoId: "00000000-0000-4000-8000-000000000001",
        nombreCanonico: "Tortilla Nº16",
        cantidad: 40,
        familia: "TORTILLA",
      }),
      linea({
        productoId: "00000000-0000-4000-8000-000000000002",
        nombreCanonico: "Tostada redonda",
        cantidad: 10,
        familia: "TOSTADA",
        unidadMedida: "UNIDAD",
      }),
    ]);
    expect(grupos.map((g) => g.familia)).toEqual([
      "TORTILLA",
      "TOSTADA",
      "FRITURA",
    ]);
  });

  test("dentro de cada familia el orden es estable por nombre", () => {
    const grupos = gruposPorFamilia([
      linea({
        productoId: "00000000-0000-4000-8000-000000000002",
        nombreCanonico: "Tortilla Nº18",
        cantidad: 10,
      }),
      linea({
        productoId: "00000000-0000-4000-8000-000000000001",
        nombreCanonico: "Tortilla Nº16",
        cantidad: 20,
      }),
    ]);
    expect(grupos[0]?.lineas.map((l) => l.nombreCanonico)).toEqual([
      "Tortilla Nº16",
      "Tortilla Nº18",
    ]);
  });

  test("sábado no pierde punto de carga en la fila", () => {
    const grupos = gruposPorFamilia([
      linea({
        productoId: "00000000-0000-4000-8000-000000000001",
        nombreCanonico: "Tortilla Democracia",
        cantidad: 12,
        puntoCargaEfectivo: "PLANTA",
        familia: "TORTILLA",
      }),
    ]);
    expect(grupos[0]?.lineas[0]?.puntoCargaEfectivo).toBe("PLANTA");
  });

  test("omite familias sin líneas", () => {
    const grupos = gruposPorFamilia([
      linea({
        productoId: "00000000-0000-4000-8000-000000000001",
        nombreCanonico: "Tortilla",
        cantidad: 1,
      }),
    ]);
    expect(grupos.map((g) => g.familia)).toEqual(["TORTILLA"]);
  });
});

describe("totalesPorFamilia", () => {
  test("siempre Tortilla → Tostada → Fritura, aunque vayan en 0", () => {
    const totales = totalesPorFamilia([
      linea({
        productoId: "00000000-0000-4000-8000-000000000001",
        nombreCanonico: "Tortilla",
        cantidad: 30,
      }),
    ]);
    expect(totales.map((t) => [t.familia, t.cantidad])).toEqual([
      ["TORTILLA", 30],
      ["TOSTADA", 0],
      ["FRITURA", 0],
    ]);
  });

  test("suma cantidades y reporta unidad dominante", () => {
    const totales = totalesPorFamilia([
      linea({
        productoId: "00000000-0000-4000-8000-000000000001",
        nombreCanonico: "A",
        cantidad: 20,
        unidadMedida: "LIBRA",
      }),
      linea({
        productoId: "00000000-0000-4000-8000-000000000002",
        nombreCanonico: "B",
        cantidad: 5,
        unidadMedida: "BOLSA",
        familia: "TORTILLA",
      }),
    ]);
    expect(totales[0]).toMatchObject({
      familia: "TORTILLA",
      cantidad: 25,
      unidadDominante: "LIBRA",
    });
  });
});

describe("lineasVisibles", () => {
  test("solo cambios filtra líneas sin cambio", () => {
    const base = [
      linea({
        productoId: "00000000-0000-4000-8000-000000000001",
        nombreCanonico: "Igual",
        cantidad: 10,
      }),
      linea({
        productoId: "00000000-0000-4000-8000-000000000002",
        nombreCanonico: "Nuevo",
        cantidad: 5,
        cambio: "nuevo",
      }),
    ];
    expect(lineasVisibles(base, false)).toHaveLength(2);
    expect(lineasVisibles(base, true).map((l) => l.nombreCanonico)).toEqual([
      "Nuevo",
    ]);
  });
});

describe("deltaCantidad", () => {
  test("v2 con cantidadAnterior → { de, a }", () => {
    expect(
      deltaCantidad(
        linea({
          productoId: "00000000-0000-4000-8000-000000000001",
          nombreCanonico: "Tortilla",
          cantidad: 18,
          cantidadAnterior: 12,
          cambio: "ajustado",
        }),
      ),
    ).toEqual({ de: 12, a: 18 });
  });

  test("sin cantidadAnterior → undefined", () => {
    expect(
      deltaCantidad(
        linea({
          productoId: "00000000-0000-4000-8000-000000000001",
          nombreCanonico: "Tortilla",
          cantidad: 18,
        }),
      ),
    ).toBeUndefined();
  });
});
