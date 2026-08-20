import { describe, expect, test } from "bun:test";
import { DateTime } from "luxon";
import {
  DIAS_HABILES_DEJO_DE_PEDIR,
  evaluaDejoDePedir,
  etiquetaPeriodo,
  medianaEntera,
  puntosBase,
  rangoAnterior,
  rangoQuincena,
  rangoQuincenaAnterior,
  repartirPuntosBase,
  ticketPromedioCentavos,
  tramoAntiguedad,
  ultimosDiasHabiles,
} from "./analytics";
import {
  ZONA_NEGOCIO,
  createBusinessCalendar,
  rangoSemanaIsoGT,
} from "./calendar";

const cal = createBusinessCalendar();

describe("rangoQuincena", () => {
  test("1–15 del mes, inclusive", () => {
    expect(rangoQuincena("2026-08-01")).toEqual({
      desde: "2026-08-01",
      hasta: "2026-08-15",
    });
    expect(rangoQuincena("2026-08-15")).toEqual({
      desde: "2026-08-01",
      hasta: "2026-08-15",
    });
  });

  test("16–último: agosto tiene 31", () => {
    expect(rangoQuincena("2026-08-16")).toEqual({
      desde: "2026-08-16",
      hasta: "2026-08-31",
    });
    expect(rangoQuincena("2026-08-31")).toEqual({
      desde: "2026-08-16",
      hasta: "2026-08-31",
    });
  });

  test("febrero no bisiesto termina el 28", () => {
    expect(rangoQuincena("2026-02-20")).toEqual({
      desde: "2026-02-16",
      hasta: "2026-02-28",
    });
  });

  test("29-feb de año bisiesto entra en la segunda quincena", () => {
    expect(rangoQuincena("2024-02-29")).toEqual({
      desde: "2024-02-16",
      hasta: "2024-02-29",
    });
  });

  test("la quincena anterior de 16–31 es 1–15 del mismo mes", () => {
    expect(rangoQuincenaAnterior("2026-08-20")).toEqual({
      desde: "2026-08-01",
      hasta: "2026-08-15",
    });
  });

  test("la quincena anterior de 1–15 es 16–fin del mes previo", () => {
    expect(rangoQuincenaAnterior("2026-08-10")).toEqual({
      desde: "2026-07-16",
      hasta: "2026-07-31",
    });
  });

  test("23:59 GT del 15 sigue en la primera quincena; 00:00 del 16 cambia", () => {
    const t2359 = DateTime.fromISO("2026-08-15T23:59:00", {
      zone: ZONA_NEGOCIO,
    });
    const t0000 = DateTime.fromISO("2026-08-16T00:00:00", {
      zone: ZONA_NEGOCIO,
    });
    expect(t2359.toISODate()).toBe("2026-08-15");
    expect(rangoQuincena(t2359.toISODate()!)).toEqual({
      desde: "2026-08-01",
      hasta: "2026-08-15",
    });
    expect(t0000.toISODate()).toBe("2026-08-16");
    expect(rangoQuincena(t0000.toISODate()!)).toEqual({
      desde: "2026-08-16",
      hasta: "2026-08-31",
    });
  });
});

describe("rangoSemanaIsoGT", () => {
  test("jueves 20 ago 2026 → lunes 17 a domingo 23", () => {
    expect(rangoSemanaIsoGT("2026-08-20")).toEqual({
      desde: "2026-08-17",
      hasta: "2026-08-23",
    });
  });
});

describe("tramoAntiguedad", () => {
  test("0–7, 8–14, 15–30 alineado a VENCIDO, 31+", () => {
    expect(tramoAntiguedad(0)).toBe("0-7");
    expect(tramoAntiguedad(7)).toBe("0-7");
    expect(tramoAntiguedad(8)).toBe("8-14");
    expect(tramoAntiguedad(10)).toBe("8-14");
    expect(tramoAntiguedad(14)).toBe("8-14");
    expect(tramoAntiguedad(15)).toBe("15-30");
    expect(tramoAntiguedad(30)).toBe("15-30");
    expect(tramoAntiguedad(31)).toBe("31+");
  });

  test("rechaza floats", () => {
    expect(() => tramoAntiguedad(10.5)).toThrow(/enteros/);
  });
});

describe("puntos base", () => {
  test("3 PORTAL + 1 MANUAL = 7500", () => {
    expect(puntosBase(3, 4)).toBe(7500);
  });

  test("reparto suma exactamente 10000; resto al mayor", () => {
    const partes = [100, 100, 100];
    const bases = repartirPuntosBase(partes);
    expect(bases.reduce((a, b) => a + b, 0)).toBe(10000);
    expect(bases[0]).toBe(3334);
    expect(bases[1]).toBe(3333);
    expect(bases[2]).toBe(3333);
  });

  test("dos clientes 2/3 y 1/3: 6667 + 3333", () => {
    expect(repartirPuntosBase([2, 1])).toEqual([6667, 3333]);
  });

  test("total 0 → ceros, no NaN", () => {
    expect(repartirPuntosBase([0, 0])).toEqual([0, 0]);
    expect(puntosBase(0, 0)).toBe(0);
  });
});

describe("ticket y mediana", () => {
  test("división con redondeo bancario; sin facturas → 0", () => {
    expect(ticketPromedioCentavos(10000, 3)).toBe(3333);
    expect(ticketPromedioCentavos(0, 0)).toBe(0);
  });

  test("mediana impar y par (half-even en empate)", () => {
    expect(medianaEntera([10, 2, 8])).toBe(8);
    expect(medianaEntera([2, 8])).toBe(5);
    expect(medianaEntera([])).toBe(0);
  });
});

describe("D6 dejó de pedir", () => {
  test("el umbral son 3 días hábiles", () => {
    expect(DIAS_HABILES_DEJO_DE_PEDIR).toBe(3);
  });

  test("cliente diario sin pedir 3 hábiles → true; Don Napo 1×/7d → false", () => {
    const hasta = "2026-08-21";
    const silencio = ultimosDiasHabiles(cal, hasta, 3);
    expect(silencio).toEqual(["2026-08-21", "2026-08-20", "2026-08-19"]);
    const habito = ultimosDiasHabiles(
      cal,
      "2026-08-18",
      DIAS_HABILES_DEJO_DE_PEDIR,
    );

    expect(
      evaluaDejoDePedir({
        fechasPedido: ["2026-08-18", "2026-08-17", "2026-08-15"],
        silencio,
        habito,
      }),
    ).toBe(true);

    expect(
      evaluaDejoDePedir({
        fechasPedido: ["2026-08-14"],
        silencio,
        habito,
      }),
    ).toBe(false);
  });
});

describe("rangoAnterior y etiqueta", () => {
  test("hoy salta domingo", () => {
    const r = rangoAnterior({
      periodo: "hoy",
      desde: "2026-08-24",
      hasta: "2026-08-24",
      cal,
    });
    expect(r).toEqual({ desde: "2026-08-22", hasta: "2026-08-22" });
  });

  test("etiqueta de quincena incluye el rango", () => {
    expect(
      etiquetaPeriodo({
        periodo: "quincena",
        desde: "2026-08-16",
        hasta: "2026-08-31",
      }),
    ).toMatch(/Quincena/);
  });
});
