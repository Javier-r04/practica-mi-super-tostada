import { describe, expect, test } from "bun:test";
import {
  etiquetasEjeX,
  formatearFechaCorta,
  participacionTopN,
  segmentarSaludClientes,
  serieTodoCero,
  ticksEjeCentavos,
  topProductosVolumen,
} from "./tablero-vista";

describe("formatearFechaCorta", () => {
  test("ISO GT → día + mes corto", () => {
    expect(formatearFechaCorta("2026-08-21")).toBe("21 ago");
    expect(formatearFechaCorta("2026-01-05")).toBe("5 ene");
  });

  test("inválida → texto original", () => {
    expect(formatearFechaCorta("no-fecha")).toBe("no-fecha");
  });
});

describe("ticksEjeCentavos", () => {
  test("3–4 ticks inclusivos de 0 a max", () => {
    const ticks = ticksEjeCentavos(1200000, 4);
    expect(ticks.length).toBe(4);
    expect(ticks[0]).toBe(0);
    expect(ticks.at(-1)).toBe(1200000);
  });

  test("max 0 → solo cero", () => {
    expect(ticksEjeCentavos(0)).toEqual([0]);
  });
});

describe("participacionTopN", () => {
  test("top 5 + Otros con el resto", () => {
    const items = Array.from({ length: 8 }, (_, i) => ({
      id: `c${i}`,
      label: `Cliente ${i}`,
      valor: (8 - i) * 1000,
    }));
    const out = participacionTopN(items, 5);
    expect(out).toHaveLength(6);
    expect(out.slice(0, 5).map((x) => x.id)).toEqual([
      "c0",
      "c1",
      "c2",
      "c3",
      "c4",
    ]);
    expect(out[5]).toEqual({
      id: "otros",
      label: "Otros",
      valor: 1000 + 2000 + 3000,
    });
  });

  test("menos de N → sin Otros", () => {
    const out = participacionTopN(
      [
        { id: "a", label: "A", valor: 100 },
        { id: "b", label: "B", valor: 50 },
      ],
      5,
    );
    expect(out).toHaveLength(2);
    expect(out.every((x) => x.id !== "otros")).toBe(true);
  });
});

describe("serieTodoCero", () => {
  test("vacío o todo 0", () => {
    expect(serieTodoCero([])).toBe(true);
    expect(serieTodoCero([0, 0, 0])).toBe(true);
    expect(serieTodoCero([0, 1, 0])).toBe(false);
  });
});

describe("etiquetasEjeX", () => {
  test("quincena densa etiqueta cada N días", () => {
    const fechas = Array.from(
      { length: 15 },
      (_, i) => `2026-08-${String(i + 1).padStart(2, "0")}`,
    );
    const marks = etiquetasEjeX(fechas, 6);
    expect(marks[0]).toBe(true);
    expect(marks.at(-1)).toBe(true);
    expect(marks.filter(Boolean).length).toBeLessThanOrEqual(6);
    expect(marks.filter(Boolean).length).toBeGreaterThan(2);
  });
});

describe("segmentarSaludClientes", () => {
  const base = {
    pedidos: 3,
    ticketPromedioCentavos: 50000,
    diasPagoMediana: 2,
    ultimoPedidoFecha: "2026-08-20",
    dejoDePedir: false,
  };

  test("prioriza dejaron de pedir y pagan lento; top ticket aparte", () => {
    const out = segmentarSaludClientes([
      {
        ...base,
        clienteId: "a",
        nombre: "Silencio",
        dejoDePedir: true,
        ultimoPedidoFecha: "2026-08-10",
      },
      {
        ...base,
        clienteId: "b",
        nombre: "Lento",
        diasPagoMediana: 12,
      },
      {
        ...base,
        clienteId: "c",
        nombre: "Ticket alto",
        ticketPromedioCentavos: 200000,
      },
      {
        ...base,
        clienteId: "d",
        nombre: "Normal",
        ticketPromedioCentavos: 10000,
      },
    ]);
    expect(out.resumen.dejaron).toBe(1);
    expect(out.resumen.lentos).toBe(1);
    expect(out.dejaronDePedir.map((c) => c.clienteId)).toEqual(["a"]);
    expect(out.paganLento.map((c) => c.clienteId)).toEqual(["b"]);
    expect(out.topTicket[0]?.clienteId).toBe("c");
  });
});

describe("topProductosVolumen", () => {
  test("recorta a N y cuenta ocultos", () => {
    const productos = Array.from({ length: 10 }, (_, i) => ({
      cantidad: i + 1,
    }));
    const out = topProductosVolumen(productos, 8);
    expect(out.items).toHaveLength(8);
    expect(out.ocultos).toBe(2);
    expect(out.items[0]?.cantidad).toBe(10);
  });
});
