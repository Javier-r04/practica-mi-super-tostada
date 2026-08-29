import { describe, expect, test } from "bun:test";
import { DateTime } from "luxon";
import {
  DIAS_HABILES_DEJO_DE_PEDIR,
  evaluaDejoDePedir,
  etiquetaPeriodo,
  medianaEntera,
  puntosBase,
  rangoAnterior,
  rangoMes,
  rangoQuincena,
  rangoQuincenaAnterior,
  repartirPuntosBase,
  reporteTablero,
  resolverRangoTablero,
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

function instanteGT(isoLocal: string): Date {
  return DateTime.fromISO(isoLocal, { zone: ZONA_NEGOCIO }).toJSDate();
}

describe("resolverRangoTablero", () => {
  test("hoy es el día de calendario GT, no la ventana que cerró anoche", () => {
    const manana = instanteGT("2026-08-22T08:57:00");
    expect(resolverRangoTablero({ periodo: "hoy", now: manana })).toEqual({
      periodo: "hoy",
      desde: "2026-08-22",
      hasta: "2026-08-22",
    });
    const noche = instanteGT("2026-08-22T22:00:00");
    expect(resolverRangoTablero({ periodo: "hoy", now: noche }).desde).toBe(
      "2026-08-22",
    );
  });

  test("semana / quincena / mes anclan en el día de calendario GT", () => {
    const now = instanteGT("2026-08-22T08:57:00");
    expect(resolverRangoTablero({ periodo: "semana", now })).toEqual({
      periodo: "semana",
      desde: "2026-08-17",
      hasta: "2026-08-23",
    });
    expect(resolverRangoTablero({ periodo: "quincena", now })).toEqual({
      periodo: "quincena",
      desde: "2026-08-16",
      hasta: "2026-08-31",
    });
    expect(resolverRangoTablero({ periodo: "mes", now })).toEqual({
      periodo: "mes",
      desde: "2026-08-01",
      hasta: "2026-08-31",
    });
    expect(
      resolverRangoTablero({
        periodo: "quincena",
        now: instanteGT("2026-08-10T10:00:00"),
      }),
    ).toEqual({
      periodo: "quincena",
      desde: "2026-08-01",
      hasta: "2026-08-15",
    });
  });

  test("desde+hasta explícitos no se recortan", () => {
    expect(
      resolverRangoTablero({
        periodo: "hoy",
        desde: "2026-08-01",
        hasta: "2026-08-03",
        now: instanteGT("2026-08-22T08:00:00"),
      }),
    ).toEqual({
      periodo: "hoy",
      desde: "2026-08-01",
      hasta: "2026-08-03",
    });
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

  test("mes es el mes de calendario GT y el anterior es el mes previo", () => {
    expect(rangoMes("2026-08-22")).toEqual({
      desde: "2026-08-01",
      hasta: "2026-08-31",
    });
    expect(
      rangoAnterior({
        periodo: "mes",
        desde: "2026-08-01",
        hasta: "2026-08-31",
        cal,
      }),
    ).toEqual({ desde: "2026-07-01", hasta: "2026-07-31" });
    expect(
      etiquetaPeriodo({
        periodo: "mes",
        desde: "2026-08-01",
        hasta: "2026-08-31",
      }),
    ).toMatch(/Mes/);
  });
});

describe("reporteTablero", () => {
  test("solo quincena y mes son cierres; el resto son resúmenes", () => {
    expect(
      reporteTablero({
        periodo: "quincena",
        desde: "2026-08-16",
        hasta: "2026-08-31",
      }),
    ).toEqual({
      titulo: "Cierre de quincena",
      slug: "cierre-quincena",
      nombreArchivo: "cierre-quincena-2026-08-16-2026-08-31.pdf",
    });
    expect(
      reporteTablero({
        periodo: "mes",
        desde: "2026-08-01",
        hasta: "2026-08-31",
      }).titulo,
    ).toBe("Cierre de mes");
    expect(
      reporteTablero({
        periodo: "semana",
        desde: "2026-08-17",
        hasta: "2026-08-23",
      }).titulo,
    ).toBe("Resumen de la semana");
    expect(
      reporteTablero({
        periodo: "rango",
        desde: "2026-08-03",
        hasta: "2026-08-09",
      }).titulo,
    ).toBe("Resumen del periodo");
  });

  test("un día suelto nunca se llama quincena, venga del preset que venga", () => {
    const hoy = reporteTablero({
      periodo: "hoy",
      desde: "2026-08-22",
      hasta: "2026-08-22",
    });
    expect(hoy.titulo).toBe("Resumen del día");
    expect(hoy.nombreArchivo).toBe("resumen-dia-2026-08-22.pdf");
    expect(
      reporteTablero({
        periodo: "rango",
        desde: "2026-08-22",
        hasta: "2026-08-22",
      }).titulo,
    ).toBe("Resumen del día");
  });

  test("el nombre del archivo no arrastra texto que no sea una fecha", () => {
    const r = reporteTablero({
      periodo: "quincena",
      desde: '2026-08-16"; rm -rf /' as never,
      hasta: "2026-08-31",
    });
    expect(r.nombreArchivo).toBe("cierre-quincena-sin-fecha-2026-08-31.pdf");
  });
});
