import { describe, expect, test } from "bun:test";
import type { BloqueCliente, LineaProducto } from "./fulfillment";
import {
  clientesDeProducto,
  desgloseProductoConNotas,
  gruposNotaProduccion,
  textoClienteNota,
} from "./nota-produccion";

const T16 = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const T14 = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";

function linea(
  parcial: Partial<LineaProducto> & Pick<LineaProducto, "notaProduccion">,
): Pick<LineaProducto, "productoId" | "notaProduccion"> {
  return {
    productoId: T16,
    ...parcial,
  };
}

function bloque(
  nombre: string,
  items: BloqueCliente["items"],
): BloqueCliente {
  return {
    clienteId: "11111111-1111-4111-8111-111111111111",
    nombre,
    horarioEntregaFijo: null,
    notasPermanentes: null,
    notasAdmin: null,
    items,
  };
}

describe("gruposNotaProduccion", () => {
  test("sin nota ni clientes → vacío", () => {
    expect(gruposNotaProduccion(linea({ notaProduccion: null }))).toEqual([]);
  });

  test("parsea el string consolidado y agrupa la misma nota", () => {
    const grupos = gruposNotaProduccion(
      linea({
        notaProduccion:
          "GRUESA · Buffet El Dorado; GRUESA · El Portal de Antigua; GRUESA · Rincón Chapín",
      }),
    );
    expect(grupos).toEqual([
      {
        nota: "GRUESA",
        clientes: [
          { nombre: "Buffet El Dorado", cantidad: null, unidadMedida: null },
          { nombre: "El Portal de Antigua", cantidad: null, unidadMedida: null },
          { nombre: "Rincón Chapín", cantidad: null, unidadMedida: null },
        ],
      },
    ]);
  });

  test("varias notas distintas no se mezclan", () => {
    const grupos = gruposNotaProduccion(
      linea({
        notaProduccion: "GRUESA · Tabascos; FINA · El Portal",
      }),
    );
    expect(grupos.map((g) => g.nota)).toEqual(["FINA", "GRUESA"]);
  });

  test("nota suelta sin cliente queda como grupo sin lista", () => {
    expect(
      gruposNotaProduccion(linea({ notaProduccion: "grosor especial" })),
    ).toEqual([{ nota: "grosor especial", clientes: [] }]);
  });

  test("con bloques de clientes suma cantidad por cliente, no el string", () => {
    const grupos = gruposNotaProduccion(
      linea({
        notaProduccion: "GRUESA · Viejo string que no debe usarse",
      }),
      [
        bloque("Buffet El Dorado", [
          {
            productoId: T16,
            nombreCanonico: "Tortilla",
            unidadMedida: "LIBRA",
            cantidad: 40,
            puntoCargaEfectivo: "PLANTA",
            notaProduccion: "GRUESA",
          },
        ]),
        bloque("Rincón Chapín", [
          {
            productoId: T16,
            nombreCanonico: "Tortilla",
            unidadMedida: "LIBRA",
            cantidad: 52,
            puntoCargaEfectivo: "DEMOCRACIA",
            notaProduccion: "GRUESA",
          },
          {
            productoId: T14,
            nombreCanonico: "Otra",
            unidadMedida: "LIBRA",
            cantidad: 10,
            puntoCargaEfectivo: "PLANTA",
            notaProduccion: "FINA",
          },
        ]),
      ],
    );
    expect(grupos).toEqual([
      {
        nota: "GRUESA",
        clientes: [
          {
            nombre: "Buffet El Dorado",
            cantidad: 40,
            unidadMedida: "LIBRA",
          },
          {
            nombre: "Rincón Chapín",
            cantidad: 52,
            unidadMedida: "LIBRA",
          },
        ],
      },
    ]);
  });

  test("si los clientes no traen nota, cae al string de la línea", () => {
    const grupos = gruposNotaProduccion(
      linea({ notaProduccion: "GRUESA · Tabascos" }),
      [
        bloque("Metroplaza", [
          {
            productoId: T16,
            nombreCanonico: "Tortilla",
            unidadMedida: "LIBRA",
            cantidad: 12,
            puntoCargaEfectivo: "PLANTA",
            notaProduccion: null,
          },
        ]),
      ],
    );
    expect(grupos).toEqual([
      {
        nota: "GRUESA",
        clientes: [
          { nombre: "Tabascos", cantidad: null, unidadMedida: null },
        ],
      },
    ]);
  });

  test("no descarta clientes aunque el consolidado sea largo", () => {
    const nombres = Array.from(
      { length: 18 },
      (_, i) => `Cliente ${String(i + 1).padStart(2, "0")}`,
    );
    const raw = nombres.map((n) => `GRUESA · ${n}`).join("; ");
    const grupos = gruposNotaProduccion(linea({ notaProduccion: raw }));
    expect(grupos).toHaveLength(1);
    expect(grupos[0]?.clientes).toHaveLength(18);
    expect(grupos[0]?.clientes.map((c) => c.nombre)).toEqual(
      [...nombres].sort((a, b) => a.localeCompare(b, "es")),
    );
  });
});

describe("textoClienteNota", () => {
  test("con cantidad: nombre · 40 lb", () => {
    expect(
      textoClienteNota({
        nombre: "Buffet El Dorado",
        cantidad: 40,
        unidadMedida: "LIBRA",
      }),
    ).toBe("Buffet El Dorado · 40 lb");
  });

  test("sin cantidad: solo el nombre", () => {
    expect(
      textoClienteNota({
        nombre: "Tabascos",
        cantidad: null,
        unidadMedida: null,
      }),
    ).toBe("Tabascos");
  });
});

describe("clientesDeProducto", () => {
  test("sin bloques → vacío", () => {
    expect(clientesDeProducto(T16)).toEqual([]);
    expect(clientesDeProducto(T16, [])).toEqual([]);
  });

  test("lista todos los clientes del producto, con y sin nota", () => {
    const desglose = clientesDeProducto(T16, [
      bloque("Rincón Chapín", [
        {
          productoId: T16,
          nombreCanonico: "Tortilla",
          unidadMedida: "LIBRA",
          cantidad: 52,
          puntoCargaEfectivo: "DEMOCRACIA",
          notaProduccion: "GRUESA",
        },
      ]),
      bloque("Metroplaza", [
        {
          productoId: T16,
          nombreCanonico: "Tortilla",
          unidadMedida: "LIBRA",
          cantidad: 12,
          puntoCargaEfectivo: "PLANTA",
          notaProduccion: null,
        },
      ]),
      bloque("Buffet El Dorado", [
        {
          productoId: T14,
          nombreCanonico: "Otra",
          unidadMedida: "LIBRA",
          cantidad: 10,
          puntoCargaEfectivo: "PLANTA",
          notaProduccion: "FINA",
        },
      ]),
    ]);
    expect(desglose).toEqual([
      {
        nombre: "Metroplaza",
        cantidad: 12,
        unidadMedida: "LIBRA",
        notaProduccion: null,
      },
      {
        nombre: "Rincón Chapín",
        cantidad: 52,
        unidadMedida: "LIBRA",
        notaProduccion: "GRUESA",
      },
    ]);
  });

  test("producto sin pedidos en ningún bloque → vacío", () => {
    expect(
      clientesDeProducto(T16, [
        bloque("Tabascos", [
          {
            productoId: T14,
            nombreCanonico: "Otra",
            unidadMedida: "LIBRA",
            cantidad: 8,
            puntoCargaEfectivo: "PLANTA",
            notaProduccion: null,
          },
        ]),
      ]),
    ).toEqual([]);
  });

  test("ordena por nombre en español", () => {
    const desglose = clientesDeProducto(T16, [
      bloque("Ñandú", [
        {
          productoId: T16,
          nombreCanonico: "Tortilla",
          unidadMedida: "LIBRA",
          cantidad: 1,
          puntoCargaEfectivo: "PLANTA",
          notaProduccion: null,
        },
      ]),
      bloque("Águila", [
        {
          productoId: T16,
          nombreCanonico: "Tortilla",
          unidadMedida: "LIBRA",
          cantidad: 2,
          puntoCargaEfectivo: "PLANTA",
          notaProduccion: null,
        },
      ]),
      bloque("Buffet", [
        {
          productoId: T16,
          nombreCanonico: "Tortilla",
          unidadMedida: "LIBRA",
          cantidad: 3,
          puntoCargaEfectivo: "PLANTA",
          notaProduccion: null,
        },
      ]),
    ]);
    expect(desglose.map((c) => c.nombre)).toEqual(["Águila", "Buffet", "Ñandú"]);
  });
});

describe("desgloseProductoConNotas", () => {
  test("snapshot con notas en el ítem no toca el string de la línea", () => {
    const desglose = desgloseProductoConNotas(
      linea({ notaProduccion: "GRUESA · String viejo" }),
      [
        bloque("Metroplaza", [
          {
            productoId: T16,
            nombreCanonico: "Tortilla",
            unidadMedida: "LIBRA",
            cantidad: 12,
            puntoCargaEfectivo: "PLANTA",
            notaProduccion: null,
          },
        ]),
        bloque("Tabascos", [
          {
            productoId: T16,
            nombreCanonico: "Tortilla",
            unidadMedida: "LIBRA",
            cantidad: 40,
            puntoCargaEfectivo: "PLANTA",
            notaProduccion: "GRUESA",
          },
        ]),
      ],
    );
    expect(desglose).toEqual([
      {
        nombre: "Metroplaza",
        cantidad: 12,
        unidadMedida: "LIBRA",
        notaProduccion: null,
      },
      {
        nombre: "Tabascos",
        cantidad: 40,
        unidadMedida: "LIBRA",
        notaProduccion: "GRUESA",
      },
    ]);
  });

  test("hoja vieja: reinyecta nota del string consolidado por nombre", () => {
    const desglose = desgloseProductoConNotas(
      linea({ notaProduccion: "GRUESA · Tabascos; FINA · El Portal" }),
      [
        bloque("El Portal", [
          {
            productoId: T16,
            nombreCanonico: "Tortilla",
            unidadMedida: "LIBRA",
            cantidad: 8,
            puntoCargaEfectivo: "PLANTA",
            notaProduccion: null,
          },
        ]),
        bloque("Tabascos", [
          {
            productoId: T16,
            nombreCanonico: "Tortilla",
            unidadMedida: "LIBRA",
            cantidad: 40,
            puntoCargaEfectivo: "PLANTA",
            notaProduccion: null,
          },
        ]),
        bloque("Sin nota", [
          {
            productoId: T16,
            nombreCanonico: "Tortilla",
            unidadMedida: "LIBRA",
            cantidad: 5,
            puntoCargaEfectivo: "PLANTA",
            notaProduccion: null,
          },
        ]),
      ],
    );
    expect(desglose).toEqual([
      {
        nombre: "El Portal",
        cantidad: 8,
        unidadMedida: "LIBRA",
        notaProduccion: "FINA",
      },
      {
        nombre: "Sin nota",
        cantidad: 5,
        unidadMedida: "LIBRA",
        notaProduccion: null,
      },
      {
        nombre: "Tabascos",
        cantidad: 40,
        unidadMedida: "LIBRA",
        notaProduccion: "GRUESA",
      },
    ]);
  });
});
