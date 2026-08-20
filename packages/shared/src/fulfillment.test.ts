import { describe, expect, test } from "bun:test";
import {
  diffHojas,
  formatearHorarioEntrega,
  gruposPorPuntoCarga,
  textoHoja,
  type HojaSnapshot,
} from "./fulfillment";

const TABASCO = "11111111-1111-1111-1111-111111111111";
const METRO = "22222222-2222-2222-2222-222222222222";
const TIENDA6 = "33333333-3333-3333-3333-333333333333";
const T16 = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const T14 = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
const T12 = "cccccccc-cccc-cccc-cccc-cccccccccccc";
const NACHOS = "dddddddd-dddd-dddd-dddd-dddddddddddd";
const PALITOS = "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee";
const PAPALINAS = "ffffffff-ffff-ffff-ffff-ffffffffffff";

function snapshotSabado(overrides?: Partial<HojaSnapshot>): HojaSnapshot {
  return {
    fechaOperacion: "2026-08-22",
    esSabado: true,
    version: 1,
    productos: [
      {
        productoId: T16,
        nombreCanonico: "Tortilla No. 16 (grande)",
        unidadMedida: "LIBRA",
        cantidad: 190,
        puntoCargaEfectivo: "PLANTA",
        notaProduccion: "GRUESAS · Tabasco Casa Vieja",
      },
      {
        productoId: NACHOS,
        nombreCanonico: "Nachos blancos",
        unidadMedida: "BOLSA",
        cantidad: 8,
        puntoCargaEfectivo: "PLANTA",
        notaProduccion: null,
      },
    ],
    clientes: [
      {
        clienteId: TABASCO,
        nombre: "Tabasco Casa Vieja",
        horarioEntregaFijo: null,
        notasPermanentes: null,
        notasAdmin: null,
        items: [
          {
            productoId: T16,
            nombreCanonico: "Tortilla No. 16 (grande)",
            unidadMedida: "LIBRA",
            cantidad: 150,
            puntoCargaEfectivo: "PLANTA",
            notaProduccion: "GRUESAS",
          },
          {
            productoId: T14,
            nombreCanonico: "Tortilla No. 14 (mediana)",
            unidadMedida: "LIBRA",
            cantidad: 50,
            puntoCargaEfectivo: "PLANTA",
            notaProduccion: null,
          },
          {
            productoId: T12,
            nombreCanonico: "Tortilla No. 12 (pequeña)",
            unidadMedida: "LIBRA",
            cantidad: 20,
            puntoCargaEfectivo: "PLANTA",
            notaProduccion: null,
          },
          {
            productoId: NACHOS,
            nombreCanonico: "Nachos blancos",
            unidadMedida: "BOLSA",
            cantidad: 8,
            puntoCargaEfectivo: "PLANTA",
            notaProduccion: null,
          },
          {
            productoId: PALITOS,
            nombreCanonico: "Palitos amarillos",
            unidadMedida: "BOLSA",
            cantidad: 6,
            puntoCargaEfectivo: "PLANTA",
            notaProduccion: null,
          },
          {
            productoId: PAPALINAS,
            nombreCanonico: "Papalinas barbacoa",
            unidadMedida: "BOLSA",
            cantidad: 4,
            puntoCargaEfectivo: "PLANTA",
            notaProduccion: null,
          },
        ],
      },
      {
        clienteId: METRO,
        nombre: "Metroplaza",
        horarioEntregaFijo: "09:00",
        notasPermanentes: null,
        notasAdmin: null,
        items: [
          {
            productoId: T16,
            nombreCanonico: "Tortilla No. 16 (grande)",
            unidadMedida: "LIBRA",
            cantidad: 40,
            puntoCargaEfectivo: "PLANTA",
            notaProduccion: null,
          },
        ],
      },
      {
        clienteId: TIENDA6,
        nombre: "Tienda 6",
        horarioEntregaFijo: null,
        notasPermanentes: null,
        notasAdmin: "llevar junto con las tortillas de la mañana",
        items: [
          {
            productoId: T16,
            nombreCanonico: "Tortilla No. 16 (grande)",
            unidadMedida: "LIBRA",
            cantidad: 10,
            puntoCargaEfectivo: "PLANTA",
            notaProduccion: null,
          },
        ],
      },
    ],
    ...overrides,
  };
}

describe("textoHoja · golden CONTEXT.md §4", () => {
  test("sábado, Tabasco con GRUESAS, Metroplaza ENTREGAR, Tienda 6 notas admin", () => {
    const texto = textoHoja(snapshotSabado());
    expect(texto.startsWith("PEDIDO PARA SÁBADO")).toBe(true);
    expect(texto).toContain("TABASCO CASA VIEJA");
    expect(texto).toContain("150 lb Tortilla No. 16 (grande)  (GRUESAS)");
    expect(texto).toContain(" 50 lb Tortilla No. 14 (mediana)");
    expect(texto).toContain(" 20 lb Tortilla No. 12 (pequeña)");
    expect(texto).toContain("  8 bolsas Nachos blancos");
    expect(texto).toContain("  6 bolsas Palitos amarillos");
    expect(texto).toContain("  4 bolsas Papalinas barbacoa");
    expect(texto).not.toContain("cargar en planta");
    expect(texto).toContain("METROPLAZA — ENTREGAR 9:00 AM");
    expect(texto).toContain(
      "TIENDA 6 — llevar junto con las tortillas de la mañana",
    );
  });

  test("un ítem anulado no aparece: no está en el snapshot", () => {
    const texto = textoHoja(snapshotSabado());
    expect(texto.toLowerCase()).not.toContain("anulado");
    expect(texto).not.toContain("Fajitas");
  });

  test("horario 09:00 se lee como 9:00 AM", () => {
    expect(formatearHorarioEntrega("09:00")).toBe("9:00 AM");
    expect(formatearHorarioEntrega("09:00:00")).toBe("9:00 AM");
    expect(formatearHorarioEntrega("13:30")).toBe("1:30 PM");
  });
});

describe("grupos y diff", () => {
  test("sábado: todo el consolidado de producto cae en PLANTA", () => {
    const grupos = gruposPorPuntoCarga(snapshotSabado());
    expect(grupos.map((g) => g.puntoCarga)).toEqual(["PLANTA"]);
    expect(grupos[0]?.lineas.every((l) => l.puntoCargaEfectivo === "PLANTA")).toBe(
      true,
    );
  });

  test("v2 marca nuevo, ajustado y eliminado; el texto de diff no es la hoja completa", () => {
    const v1 = snapshotSabado();
    const v2base = snapshotSabado({
      version: 2,
      clientes: v1.clientes.map((bloque) => {
        if (bloque.clienteId !== TABASCO) return bloque;
        return {
          ...bloque,
          items: bloque.items
            .filter((i) => i.productoId !== PAPALINAS)
            .map((i) =>
              i.productoId === T16 ? { ...i, cantidad: 170 } : i,
            )
            .concat([
              {
                productoId: "99999999-9999-9999-9999-999999999999",
                nombreCanonico: "Tostada grande",
                unidadMedida: "LIBRA",
                cantidad: 12,
                puntoCargaEfectivo: "PLANTA",
                notaProduccion: null,
              },
            ]),
        };
      }),
      productos: [
        { ...v1.productos[0]!, cantidad: 210 },
        {
          productoId: "99999999-9999-9999-9999-999999999999",
          nombreCanonico: "Tostada grande",
          unidadMedida: "LIBRA",
          cantidad: 12,
          puntoCargaEfectivo: "PLANTA",
          notaProduccion: null,
        },
      ],
    });
    const v2 = diffHojas(v1, v2base);
    const t16 = v2.clientes[0]?.items.find((i) => i.productoId === T16);
    const papalinas = v2.clientes[0]?.items.find((i) => i.productoId === PAPALINAS);
    const tostada = v2.clientes[0]?.items.find(
      (i) => i.nombreCanonico === "Tostada grande",
    );
    expect(t16?.cambio).toBe("ajustado");
    expect(t16?.cantidadAnterior).toBe(150);
    expect(papalinas?.cambio).toBe("eliminado");
    expect(tostada?.cambio).toBe("nuevo");

    const diffTexto = textoHoja(v2, { soloCambios: true });
    expect(diffTexto).toContain("CAMBIOS v2");
    expect(diffTexto).toContain("Tostada grande");
    expect(diffTexto).not.toContain("Palitos amarillos");
  });
});
