import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { DateTime } from "luxon";
import {
  ZONA_NEGOCIO,
  capturaAbierta,
  createBusinessCalendar,
  desplazarFecha,
  rangoSemanaIsoGT,
} from "./calendar";

const calendar = createBusinessCalendar({
  diasNoLaborables: ["2026-09-15"],
});

function instanteGT(isoLocal: string): Date {
  const dt = DateTime.fromISO(isoLocal, { zone: ZONA_NEGOCIO });
  if (!dt.isValid) {
    throw new Error(`instante inválido: ${isoLocal}`);
  }
  return dt.toJSDate();
}

describe("BusinessCalendar", () => {
  test("la zona del negocio es America/Guatemala", () => {
    expect(ZONA_NEGOCIO).toBe("America/Guatemala");
  });

  test("el módulo no usa new Date() ni Date.now(); el reloj se inyecta", () => {
    const src = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "calendar.ts"),
      "utf8",
    );
    expect(src).not.toMatch(/Date\.now\s*\(/);
    expect(src).not.toMatch(/new\s+Date\s*\(/);
  });

  test("14:59: ventana cerrada", () => {
    const now = instanteGT("2026-08-20T14:59:00");
    expect(calendar.isVentanaAbierta(now)).toBe(false);
  });

  test("15:00: ventana abierta", () => {
    const now = instanteGT("2026-08-20T15:00:00");
    expect(calendar.isVentanaAbierta(now)).toBe(true);
  });

  test("23:59: ventana abierta y fecha_operacion es el mismo día de calendario", () => {
    const now = instanteGT("2026-08-20T23:59:00");
    expect(calendar.isVentanaAbierta(now)).toBe(true);
    expect(calendar.getFechaOperacion(now)).toBe("2026-08-20");
  });

  test("00:00 cae DENTRO de la ventana del día anterior, no en una nueva", () => {
    // El horario real cierra a las 03:00: a medianoche del viernes se sigue
    // capturando la operación del jueves. Es la regla que sostiene todo el
    // resto del sistema.
    const medianoche = instanteGT("2026-08-21T00:00:00");
    expect(calendar.isVentanaAbierta(medianoche)).toBe(true);
    expect(calendar.getFechaOperacion(medianoche)).toBe("2026-08-20");
    expect(calendar.getFechaOperacionDeVentanaReciente(medianoche)).toBe(
      "2026-08-20",
    );
  });

  test("03:00: getFechaOperacionDeVentanaReciente cierra el día que acaba de terminar", () => {
    // El cierre es exclusivo: a las 03:00 en punto la ventana del jueves ya
    // terminó y el eje de captura salta al viernes.
    const cierre = instanteGT("2026-08-21T03:00:00");
    expect(calendar.isVentanaAbierta(cierre)).toBe(false);
    expect(calendar.getFechaOperacion(cierre)).toBe("2026-08-21");
    expect(calendar.getFechaOperacionDeVentanaReciente(cierre)).toBe(
      "2026-08-20",
    );
  });

  test("ventana abierta: la fecha reciente coincide con la de operación", () => {
    const tarde = instanteGT("2026-08-20T22:00:00");
    expect(calendar.isVentanaAbierta(tarde)).toBe(true);
    expect(calendar.getFechaOperacionDeVentanaReciente(tarde)).toBe(
      calendar.getFechaOperacion(tarde),
    );
  });

  test("sábado 03:00: la ventana reciente es el viernes, no el lunes", () => {
    const viernesNoche = instanteGT("2026-08-21T23:59:00");
    const sabadoTrasCierre = instanteGT("2026-08-22T03:00:00");
    expect(calendar.getFechaOperacion(viernesNoche)).toBe("2026-08-21");
    expect(calendar.getFechaOperacion(sabadoTrasCierre)).toBe("2026-08-22");
    expect(
      calendar.getFechaOperacionDeVentanaReciente(sabadoTrasCierre),
    ).toBe("2026-08-21");
  });

  test("feriado 03:00: la ventana reciente conserva la fecha de la víspera", () => {
    const vispera = instanteGT("2026-09-14T23:59:00");
    const feriadoTrasCierre = instanteGT("2026-09-15T03:00:00");
    expect(calendar.getFechaOperacion(vispera)).toBe("2026-09-14");
    expect(calendar.getFechaOperacion(feriadoTrasCierre)).toBe("2026-09-16");
    expect(
      calendar.getFechaOperacionDeVentanaReciente(feriadoTrasCierre),
    ).toBe("2026-09-14");
  });

  test("nombreDiaOperacion en mayúsculas para el consolidado", async () => {
    const { nombreDiaOperacion } = await import("./calendar");
    expect(nombreDiaOperacion("2026-08-22")).toBe("SÁBADO");
    expect(nombreDiaOperacion("2026-08-21")).toBe("VIERNES");
  });

  test("sábado: es hábil y la carga efectiva sale de PLANTA", () => {
    expect(calendar.isSabado("2026-08-22")).toBe(true);
    expect(calendar.isDiaNoLaborable("2026-08-22")).toBe(false);
    expect(calendar.puntoCargaEfectivo("DEMOCRACIA", "2026-08-22")).toBe(
      "PLANTA",
    );
    expect(calendar.puntoCargaEfectivo("PLANTA", "2026-08-22")).toBe("PLANTA");

    const sabadoTarde = instanteGT("2026-08-22T16:00:00");
    expect(calendar.getFechaOperacion(sabadoTarde)).toBe("2026-08-22");
  });

  test("en día hábil no sábado se respeta el punto de carga del producto", () => {
    expect(calendar.puntoCargaEfectivo("DEMOCRACIA", "2026-08-21")).toBe(
      "DEMOCRACIA",
    );
    expect(calendar.puntoCargaEfectivo("PLANTA", "2026-08-21")).toBe("PLANTA");
  });

  test("domingo es no laborable por regla, sin estar en la lista de feriados", () => {
    expect(calendar.isDiaNoLaborable("2026-08-23")).toBe(true);
    expect(calendar.isSabado("2026-08-23")).toBe(false);
    expect(calendar.getSiguienteDiaHabil("2026-08-22")).toBe("2026-08-24");
  });

  test("feriado es no laborable y se salta al calcular el siguiente hábil", () => {
    expect(calendar.isDiaNoLaborable("2026-09-15")).toBe(true);
    expect(calendar.getSiguienteDiaHabil("2026-09-14")).toBe("2026-09-16");

    const vispera = instanteGT("2026-09-14T16:00:00");
    expect(calendar.getFechaOperacion(vispera)).toBe("2026-09-14");
    const feriadoTarde = instanteGT("2026-09-15T16:00:00");
    expect(calendar.getFechaOperacion(feriadoTarde)).toBe("2026-09-16");
  });

  test("formatearFechaLarga usa español de Guatemala sin new Date()", async () => {
    const { formatearFechaLarga } = await import("./calendar");
    expect(formatearFechaLarga("2026-08-20")).toBe("Jueves 20 de agosto");
  });

  test("14:59: próxima apertura es hoy 15:00 GT", () => {
    const now = instanteGT("2026-08-20T14:59:00");
    const proxima = calendar.getProximaApertura(now);
    expect(
      DateTime.fromJSDate(proxima!, { zone: ZONA_NEGOCIO }).toISO({
        suppressMilliseconds: true,
      }),
    ).toBe("2026-08-20T15:00:00-06:00");
  });

  test("15:00: cierre de ventana es a las 03:00 del día siguiente", () => {
    const now = instanteGT("2026-08-20T15:00:00");
    const cierre = calendar.getCierreVentana(now);
    expect(
      DateTime.fromJSDate(cierre!, { zone: ZONA_NEGOCIO }).toISO({
        suppressMilliseconds: true,
      }),
    ).toBe("2026-08-21T03:00:00-06:00");
  });

  test("03:01: próxima apertura es hoy 15:00 GT", () => {
    const now = instanteGT("2026-08-21T03:01:00");
    const proxima = calendar.getProximaApertura(now);
    expect(
      DateTime.fromJSDate(proxima!, { zone: ZONA_NEGOCIO }).toISO({
        suppressMilliseconds: true,
      }),
    ).toBe("2026-08-21T15:00:00-06:00");
    expect(calendar.isVentanaAbierta(now)).toBe(false);
    // Y el eje de cierre sigue siendo el jueves: la operación de anoche todavía
    // está por producirse y repartirse.
    expect(calendar.getFechaOperacionDeVentanaReciente(now)).toBe("2026-08-20");
  });

  test("23:59: el cierre es el de la ventana viva, ya del día siguiente", () => {
    const now = instanteGT("2026-08-20T23:59:00");
    const cierre = calendar.getCierreVentana(now);
    expect(
      DateTime.fromJSDate(cierre!, { zone: ZONA_NEGOCIO }).toISO({
        suppressMilliseconds: true,
      }),
    ).toBe("2026-08-21T03:00:00-06:00");
  });

  test("días de calendario GT entre emitida_at y now (antigüedad de factura)", () => {
    const emitida = instanteGT("2026-08-05T10:00:00");
    const ahora = instanteGT("2026-08-20T22:00:00");
    expect(calendar.diasCalendarioEntre(emitida, ahora)).toBe(15);
    expect(calendar.diasCalendarioEntre(ahora, ahora)).toBe(0);
  });

  test("rangoSemanaIsoGT es lunes–domingo en zona GT", () => {
    expect(rangoSemanaIsoGT("2026-08-20")).toEqual({
      desde: "2026-08-17",
      hasta: "2026-08-23",
    });
    expect(rangoSemanaIsoGT("2026-08-17")).toEqual({
      desde: "2026-08-17",
      hasta: "2026-08-23",
    });
  });

  test("desplazarFecha no usa el reloj local", () => {
    expect(desplazarFecha("2026-08-01", -1)).toBe("2026-07-31");
    expect(desplazarFecha("2026-02-28", 1)).toBe("2026-03-01");
  });
});

const overnightViernes = createBusinessCalendar({
  ventanasPorDia: {
    1: { aperturaMinutos: 15 * 60, cierreMinutos: 0, cruzaMedianoche: true },
    2: { aperturaMinutos: 15 * 60, cierreMinutos: 0, cruzaMedianoche: true },
    3: { aperturaMinutos: 15 * 60, cierreMinutos: 0, cruzaMedianoche: true },
    4: { aperturaMinutos: 15 * 60, cierreMinutos: 0, cruzaMedianoche: true },
    5: {
      aperturaMinutos: 15 * 60,
      cierreMinutos: 6 * 60,
      cruzaMedianoche: true,
    },
    6: { aperturaMinutos: 15 * 60, cierreMinutos: 0, cruzaMedianoche: true },
    7: null,
  },
});

describe("BusinessCalendar ventanas por weekday", () => {
  test("viernes 15:00 → sábado 06:00: sábado 02:00 es operación del viernes", () => {
    const madrugada = instanteGT("2026-08-22T02:00:00");
    expect(overnightViernes.isVentanaAbierta(madrugada)).toBe(true);
    expect(overnightViernes.getFechaOperacion(madrugada)).toBe("2026-08-21");
    expect(overnightViernes.getFechaOperacionDeVentanaReciente(madrugada)).toBe(
      "2026-08-21",
    );
  });

  test("sábado 07:00 cerrado; próxima apertura es sábado 15:00", () => {
    const manana = instanteGT("2026-08-22T07:00:00");
    expect(overnightViernes.isVentanaAbierta(manana)).toBe(false);
    expect(overnightViernes.getFechaOperacionDeVentanaReciente(manana)).toBe(
      "2026-08-21",
    );
    const proxima = overnightViernes.getProximaApertura(manana);
    expect(
      DateTime.fromJSDate(proxima!, { zone: ZONA_NEGOCIO }).toISO({
        suppressMilliseconds: true,
      }),
    ).toBe("2026-08-22T15:00:00-06:00");
  });

  test("domingo inactivo: próxima apertura es lunes 15:00", () => {
    const domingo = instanteGT("2026-08-23T10:00:00");
    expect(overnightViernes.isVentanaAbierta(domingo)).toBe(false);
    expect(overnightViernes.isDiaNoLaborable("2026-08-23")).toBe(true);
    const proxima = overnightViernes.getProximaApertura(domingo);
    expect(
      DateTime.fromJSDate(proxima!, { zone: ZONA_NEGOCIO }).toISO({
        suppressMilliseconds: true,
      }),
    ).toBe("2026-08-24T15:00:00-06:00");
  });

  test("domingo activo es día hábil y abre esa noche", () => {
    const conDomingo = createBusinessCalendar({
      ventanasPorDia: {
        7: {
          aperturaMinutos: 15 * 60,
          cierreMinutos: 0,
          cruzaMedianoche: true,
        },
      },
    });
    expect(conDomingo.isDiaNoLaborable("2026-08-23")).toBe(false);
    const tarde = instanteGT("2026-08-23T16:00:00");
    expect(conDomingo.isVentanaAbierta(tarde)).toBe(true);
    expect(conDomingo.getFechaOperacion(tarde)).toBe("2026-08-23");
  });

  test("adelantar apertura no abre una ventana cuyo inicio ya pasó", () => {
    const now = instanteGT("2026-08-20T11:30:00");
    const cal = createBusinessCalendar({
      ventana: { aperturaMinutos: 11 * 60, cierreMinutos: 0 },
      noAbrirHasta: instanteGT("2026-08-21T00:00:00"),
    });
    expect(cal.isVentanaAbierta(now)).toBe(false);
    expect(
      DateTime.fromJSDate(cal.getProximaApertura(now)!, {
        zone: ZONA_NEGOCIO,
      }).toISO({ suppressMilliseconds: true }),
    ).toBe("2026-08-21T11:00:00-06:00");
  });

  test("horario de referencia sigue el weekday de calendario, no el default 15:00", () => {
    const cal = createBusinessCalendar({
      ventanasPorDia: {
        4: {
          aperturaMinutos: 11 * 60,
          cierreMinutos: 0,
          cruzaMedianoche: true,
        },
      },
    });
    expect(cal.getHorarioReferencia(instanteGT("2026-08-20T11:30:00"))).toEqual(
      { apertura: "11:00", cierre: "00:00" },
    );
  });
});

const lunesA3am = createBusinessCalendar({
  ventanasPorDia: {
    1: {
      aperturaMinutos: 15 * 60,
      cierreMinutos: 3 * 60,
      cruzaMedianoche: true,
    },
    2: { aperturaMinutos: 15 * 60, cierreMinutos: 0, cruzaMedianoche: true },
    3: { aperturaMinutos: 15 * 60, cierreMinutos: 0, cruzaMedianoche: true },
    4: { aperturaMinutos: 15 * 60, cierreMinutos: 0, cruzaMedianoche: true },
    5: { aperturaMinutos: 15 * 60, cierreMinutos: 0, cruzaMedianoche: true },
    6: {
      aperturaMinutos: 15 * 60,
      cierreMinutos: 3 * 60,
      cruzaMedianoche: true,
    },
    7: null,
  },
});

describe("BusinessCalendar fecha de entrega", () => {
  test("ventana lunes 15:00 → martes 03:00: todo el tramo entrega el martes", () => {
    const instantes = [
      "2026-08-24T15:00:00",
      "2026-08-24T16:00:00",
      "2026-08-24T23:00:00",
      "2026-08-25T01:00:00",
      "2026-08-25T02:59:00",
    ];
    for (const iso of instantes) {
      const now = instanteGT(iso);
      expect(lunesA3am.isVentanaAbierta(now)).toBe(true);
      const operacion = lunesA3am.getFechaOperacion(now);
      expect(operacion).toBe("2026-08-24");
      expect(lunesA3am.getFechaEntrega(operacion)).toBe("2026-08-25");
    }
  });

  test("ventana del sábado con domingo inactivo entrega el lunes", () => {
    const now = instanteGT("2026-08-23T02:00:00");
    const operacion = lunesA3am.getFechaOperacion(now);
    expect(operacion).toBe("2026-08-22");
    expect(lunesA3am.getFechaEntrega(operacion)).toBe("2026-08-24");
  });

  test("feriado en el día de entrega: salta al siguiente activo", () => {
    const cal = createBusinessCalendar({
      diasNoLaborables: ["2026-08-24"],
      ventanasPorDia: {
        1: { aperturaMinutos: 15 * 60, cierreMinutos: 0, cruzaMedianoche: true },
        6: {
          aperturaMinutos: 15 * 60,
          cierreMinutos: 3 * 60,
          cruzaMedianoche: true,
        },
        2: { aperturaMinutos: 15 * 60, cierreMinutos: 0, cruzaMedianoche: true },
      },
    });
    // Sábado 22 → domingo inactivo → lunes 24 feriado → martes 25.
    expect(cal.getFechaEntrega("2026-08-22")).toBe("2026-08-25");
  });

  test("un weekday sin ventana no es día de entrega", () => {
    const sinMiercoles = createBusinessCalendar({
      ventanasPorDia: {
        1: { aperturaMinutos: 15 * 60, cierreMinutos: 0, cruzaMedianoche: true },
        2: { aperturaMinutos: 15 * 60, cierreMinutos: 0, cruzaMedianoche: true },
        3: null,
        4: { aperturaMinutos: 15 * 60, cierreMinutos: 0, cruzaMedianoche: true },
      },
    });
    expect(sinMiercoles.isDiaNoLaborable("2026-08-26")).toBe(true);
    // Martes 25 → miércoles 26 apagado → jueves 27.
    expect(sinMiercoles.getFechaEntrega("2026-08-25")).toBe("2026-08-27");
  });

  test("semana entera apagada no cuelga", () => {
    const apagado = createBusinessCalendar({ ventanasPorDia: {} });
    expect(apagado.getFechaEntrega("2026-08-24")).toBe("2026-08-25");
    expect(apagado.getFechaOperacion(instanteGT("2026-08-24T15:00:00"))).toBe(
      "2026-08-24",
    );
  });

  test("horario de referencia en la madrugada es el de la ventana viva", () => {
    expect(
      lunesA3am.getHorarioReferencia(instanteGT("2026-08-25T01:00:00")),
    ).toEqual({ apertura: "15:00", cierre: "03:00" });
  });
});

/** Ventana lunes–sábado 15:00 → 03:00 del día siguiente. */
const overnight3am = createBusinessCalendar({
  ventanasPorDia: {
    1: { aperturaMinutos: 15 * 60, cierreMinutos: 3 * 60, cruzaMedianoche: true },
    2: { aperturaMinutos: 15 * 60, cierreMinutos: 3 * 60, cruzaMedianoche: true },
    3: { aperturaMinutos: 15 * 60, cierreMinutos: 3 * 60, cruzaMedianoche: true },
    4: { aperturaMinutos: 15 * 60, cierreMinutos: 3 * 60, cruzaMedianoche: true },
    5: { aperturaMinutos: 15 * 60, cierreMinutos: 3 * 60, cruzaMedianoche: true },
    6: { aperturaMinutos: 15 * 60, cierreMinutos: 3 * 60, cruzaMedianoche: true },
    7: null,
  },
});

describe("getOperacionQueEntregaEn: el eje de reparto", () => {
  // Lunes 2026-08-17 … domingo 2026-08-23.
  test("es la inversa de getFechaEntrega en días corridos", () => {
    expect(overnight3am.getFechaEntrega("2026-08-17")).toBe("2026-08-18");
    expect(overnight3am.getOperacionQueEntregaEn("2026-08-18")).toBe(
      "2026-08-17",
    );
  });

  test("no depende del reloj: a las 15:00 la operación en curso no salta", () => {
    // La ventana del martes abre a las 15:00, pero lo que hay en la calle el
    // martes sigue siendo la operación del lunes. Este era el bug: la ruta se
    // vaciaba a media tarde con el repartidor todavía afuera.
    const martes = "2026-08-18";
    expect(overnight3am.getOperacionQueEntregaEn(martes)).toBe("2026-08-17");
    const tarde = instanteGT("2026-08-18T15:30:00");
    expect(overnight3am.getFechaOperacion(tarde)).toBe("2026-08-18");
    expect(overnight3am.getOperacionQueEntregaEn(martes)).toBe("2026-08-17");
  });

  test("madrugada: a las 02:00 del martes se reparte lo del lunes", () => {
    const madrugada = instanteGT("2026-08-18T02:00:00");
    // La ventana del lunes sigue abierta…
    expect(overnight3am.isVentanaAbierta(madrugada)).toBe(true);
    expect(overnight3am.getFechaOperacion(madrugada)).toBe("2026-08-17");
    // …y esa misma operación es la que sale hoy a la calle.
    expect(overnight3am.getOperacionQueEntregaEn("2026-08-18")).toBe(
      "2026-08-17",
    );
  });

  test("domingo no se reparte: devuelve la última operación que ya salió", () => {
    // Sábado entrega lunes (domingo apagado); la última que ya se repartió
    // el domingo es la del viernes, que salió el sábado.
    expect(overnight3am.getFechaEntrega("2026-08-22")).toBe("2026-08-24");
    expect(overnight3am.getOperacionQueEntregaEn("2026-08-23")).toBe(
      "2026-08-21",
    );
  });

  test("lunes se reparte lo del sábado, no lo del domingo", () => {
    expect(overnight3am.getOperacionQueEntregaEn("2026-08-24")).toBe(
      "2026-08-22",
    );
  });

  test("feriado en medio: el reparto salta con la operación", () => {
    const conFeriado = createBusinessCalendar({
      diasNoLaborables: ["2026-09-15"],
    });
    // El 14 (lunes) entrega el 16 porque el 15 es feriado.
    expect(conFeriado.getFechaEntrega("2026-09-14")).toBe("2026-09-16");
    expect(conFeriado.getOperacionQueEntregaEn("2026-09-16")).toBe(
      "2026-09-14",
    );
  });
});

describe("getLimiteDeReapertura", () => {
  // Calendario de fábrica: lun–sáb 15:00 → 03:00, domingo apagado.
  test("vence cuando cierra la ventana del propio día", () => {
    // Operación del jueves, reabierta esa noche: cierra a las 03:00 del viernes,
    // como cualquier día. La hoja queda lista antes de la madrugada de producción.
    expect(
      calendar.getLimiteDeReapertura(
        "2026-08-20",
        instanteGT("2026-08-20T22:30:00"),
      ),
    ).toEqual(instanteGT("2026-08-21T03:00:00"));
  });

  // Sin el piso, reabrir a las 02:50 dejaría diez minutos para corregir: la
  // gracia dependería de en qué punto del ciclo se reabrió.
  test("nunca antes de una hora desde la reapertura", () => {
    expect(
      calendar.getLimiteDeReapertura(
        "2026-08-20",
        instanteGT("2026-08-21T02:50:00"),
      ),
    ).toEqual(instanteGT("2026-08-21T03:50:00"));
  });

  test("una reapertura muy posterior al cierre solo espera el piso", () => {
    // La ventana del jueves cerró a las 03:00; reabrir a las 14:50 del viernes
    // para corregir da una hora, no un cierre instantáneo.
    expect(
      calendar.getLimiteDeReapertura(
        "2026-08-20",
        instanteGT("2026-08-21T14:50:00"),
      ),
    ).toEqual(instanteGT("2026-08-21T15:50:00"));
  });

  test("un día sin ventana no tiene cierre propio: manda el piso", () => {
    // Domingo apagado: no hay ventana de la que colgar el límite.
    expect(
      calendar.getLimiteDeReapertura(
        "2026-08-23",
        instanteGT("2026-08-23T10:00:00"),
      ),
    ).toEqual(instanteGT("2026-08-23T11:00:00"));
  });
});

describe("capturaAbierta", () => {
  test("un día REABIERTO acepta captura aunque el reloj diga cerrado", () => {
    expect(capturaAbierta(false, "REABIERTO")).toBe(true);
    expect(capturaAbierta(true, "REABIERTO")).toBe(true);
  });

  test("un día CERRADO no acepta captura ni con la ventana corriendo", () => {
    expect(capturaAbierta(true, "CERRADO")).toBe(false);
    expect(capturaAbierta(false, "CERRADO")).toBe(false);
  });

  test("sin cierre manda el reloj", () => {
    expect(capturaAbierta(true, "SIN_CIERRE")).toBe(true);
    expect(capturaAbierta(false, "SIN_CIERRE")).toBe(false);
  });
});
