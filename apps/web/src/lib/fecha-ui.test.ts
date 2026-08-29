import { describe, expect, test } from "bun:test";
import { DateTime } from "luxon";
import { ZONA_NEGOCIO } from "@misupertostada/shared";
import {
  aFechaIso,
  celdasMes,
  diaEnRango,
  diaSemanaLunes0,
  diasEnMes,
  esFechaIso,
  finMes,
  finQuincena,
  finSemana,
  inicioMes,
  inicioQuincena,
  inicioSemana,
  mesAnterior,
  mesSiguiente,
  avanzarBorradorRango,
  clicPersonalizadoRango,
  confirmarBorradorRango,
  dateCivilDesdeIso,
  etiquetaDiaSemanaCorto,
  etiquetaTriggerFecha,
  isoCivilDesdeDate,
  periodoDePresetCalendario,
  rangoUiDePreset,
  etiquetaBorradorRango,
  etiquetaDiaCorto,
  etiquetaRangoCorto,
  fechaPreferidaEnRango,
  isoDeCampoUnValor,
  hoyCivilIso,
  ordenarRango,
} from "./fecha-ui";

describe("fecha-ui", () => {
  test("esFechaIso valida YYYY-MM-DD", () => {
    expect(esFechaIso("2026-08-20")).toBe(true);
    expect(esFechaIso("20/08/2026")).toBe(false);
  });

  test("hoyCivilIso usa America/Guatemala, no el día local", () => {
    const madrugadaGt = DateTime.fromISO("2026-08-22T02:00:00", {
      zone: ZONA_NEGOCIO,
    }).toJSDate();
    expect(hoyCivilIso(madrugadaGt)).toBe("2026-08-22");
  });

  test("agosto 2026 empieza en sábado (Lu=0 → offset 5)", () => {
    expect(diaSemanaLunes0("2026-08-01")).toBe(5);
    expect(diasEnMes(2026, 8)).toBe(31);
    const cells = celdasMes(2026, 8);
    expect(cells[5]).toBe("2026-08-01");
    expect(cells.filter(Boolean)).toHaveLength(31);
  });

  test("navegación de mes", () => {
    expect(mesAnterior(2026, 1)).toEqual({ y: 2025, m: 12 });
    expect(mesSiguiente(2026, 12)).toEqual({ y: 2027, m: 1 });
    expect(aFechaIso(2026, 8, 20)).toBe("2026-08-20");
  });

  test("inicioSemana es el lunes de calendario", () => {
    expect(inicioSemana("2026-08-21")).toBe("2026-08-17"); // vie → lu
    expect(inicioSemana("2026-08-17")).toBe("2026-08-17");
  });

  test("inicioQuincena corta en 1 o 16", () => {
    expect(inicioQuincena("2026-08-12")).toBe("2026-08-01");
    expect(inicioQuincena("2026-08-21")).toBe("2026-08-16");
  });

  test("inicioMes es el día 1", () => {
    expect(inicioMes("2026-08-21")).toBe("2026-08-01");
  });

  test("finSemana es el domingo de calendario", () => {
    expect(finSemana("2026-08-21")).toBe("2026-08-23");
    expect(finSemana("2026-08-17")).toBe("2026-08-23");
  });

  test("finQuincena corta en 15 o fin de mes", () => {
    expect(finQuincena("2026-08-12")).toBe("2026-08-15");
    expect(finQuincena("2026-08-21")).toBe("2026-08-31");
  });

  test("finMes es el último día", () => {
    expect(finMes("2026-08-21")).toBe("2026-08-31");
    expect(finMes("2026-02-10")).toBe("2026-02-28");
  });

  test("ordenarRango y diaEnRango", () => {
    expect(ordenarRango("2026-08-20", "2026-08-10")).toEqual({
      desde: "2026-08-10",
      hasta: "2026-08-20",
    });
    expect(diaEnRango("2026-08-15", "2026-08-10", "2026-08-20")).toBe(true);
    expect(diaEnRango("2026-08-09", "2026-08-10", "2026-08-20")).toBe(false);
  });

  test("etiquetaRangoCorto resume el periodo dentro del calendario", () => {
    expect(etiquetaDiaCorto("2026-08-21")).toBe("21 ago");
    expect(etiquetaRangoCorto("2026-08-17", "2026-08-23")).toBe("17 – 23 ago");
    expect(etiquetaRangoCorto("2026-08-16", "2026-08-31")).toBe("16 – 31 ago");
    expect(etiquetaRangoCorto("2026-08-21", "2026-08-21")).toBe("21 ago");
    expect(etiquetaRangoCorto("2026-08-28", "2026-09-03")).toBe(
      "28 ago – 3 sep",
    );
    expect(etiquetaRangoCorto("2025-12-28", "2026-01-03")).toBe(
      "28 dic 2025 – 3 ene 2026",
    );
  });

  test("isoDeCampoUnValor colapsa un atajo de rango a un solo día", () => {
    expect(
      isoDeCampoUnValor(
        { desde: "2026-08-17", hasta: "2026-08-23" },
        "2026-08-21",
      ),
    ).toBe("2026-08-21");
    expect(
      isoDeCampoUnValor({ desde: "2026-08-21", hasta: "2026-08-21" }),
    ).toBe("2026-08-21");
  });

  test("fechaPreferidaEnRango no salta al inicio vacío del periodo", () => {
    expect(
      fechaPreferidaEnRango("2026-08-16", "2026-08-31", "2026-08-21"),
    ).toBe("2026-08-21");
    expect(
      fechaPreferidaEnRango("2026-08-16", "2026-08-31", "2026-08-10"),
    ).toBe("2026-08-16");
    expect(
      fechaPreferidaEnRango("2026-08-16", "2026-08-31", "2026-09-05"),
    ).toBe("2026-08-31");
    expect(fechaPreferidaEnRango("2026-08-16", "2026-08-31")).toBe(
      "2026-08-31",
    );
  });

  test("avanzarBorradorRango elige inicio y luego fin ordenado", () => {
    const vacio = { desde: null, hasta: null };
    const soloInicio = avanzarBorradorRango(vacio, "2026-08-20");
    expect(soloInicio).toEqual({ desde: "2026-08-20", hasta: null });
    expect(avanzarBorradorRango(soloInicio, "2026-08-10")).toEqual({
      desde: "2026-08-10",
      hasta: "2026-08-20",
    });
    expect(
      avanzarBorradorRango(
        { desde: "2026-08-10", hasta: "2026-08-20" },
        "2026-08-15",
      ),
    ).toEqual({ desde: "2026-08-15", hasta: null });
  });

  test("etiquetaBorradorRango y confirmarBorradorRango", () => {
    expect(etiquetaBorradorRango({ desde: null, hasta: null })).toBe(
      "Elige la fecha de inicio",
    );
    expect(
      etiquetaBorradorRango({ desde: "2026-08-21", hasta: null }),
    ).toBe("21 ago → elige el fin");
    expect(
      etiquetaBorradorRango({
        desde: "2026-08-17",
        hasta: "2026-08-23",
      }),
    ).toBe("17 – 23 ago");
    expect(confirmarBorradorRango({ desde: null, hasta: null })).toBeNull();
    expect(
      confirmarBorradorRango({ desde: "2026-08-21", hasta: null }),
    ).toBeNull();
    expect(
      confirmarBorradorRango({
        desde: "2026-08-21",
        hasta: "2026-08-21",
      }),
    ).toEqual({ desde: "2026-08-21", hasta: "2026-08-21" });
    expect(
      confirmarBorradorRango({
        desde: "2026-08-20",
        hasta: "2026-08-10",
      }),
    ).toEqual({ desde: "2026-08-10", hasta: "2026-08-20" });
  });

  test("el primer clic con from=to (DayPicker) no confirma el rango", () => {
    const uno = clicPersonalizadoRango(null, "2026-08-10");
    expect(uno.rangoListo).toBeNull();
    const mismoDia = clicPersonalizadoRango(uno.borrador, "2026-08-10");
    expect(mismoDia.rangoListo).toEqual({
      desde: "2026-08-10",
      hasta: "2026-08-10",
    });
    const dos = clicPersonalizadoRango(uno.borrador, "2026-08-20");
    expect(dos.rangoListo).toEqual({
      desde: "2026-08-10",
      hasta: "2026-08-20",
    });
  });

  test("clicPersonalizadoRango confirma al segundo clic sin Listo", () => {
    const uno = clicPersonalizadoRango(null, "2026-08-10");
    expect(uno.borrador).toEqual({ desde: "2026-08-10", hasta: null });
    expect(uno.rangoListo).toBeNull();
    expect(etiquetaBorradorRango(uno.borrador)).toBe(
      "10 ago → elige el fin",
    );

    const dos = clicPersonalizadoRango(uno.borrador, "2026-08-20");
    expect(dos.borrador).toEqual({
      desde: "2026-08-10",
      hasta: "2026-08-20",
    });
    expect(dos.rangoListo).toEqual({
      desde: "2026-08-10",
      hasta: "2026-08-20",
    });
    expect(etiquetaBorradorRango(dos.borrador)).toBe("10 – 20 ago");
  });

  test("rangoUiDePreset cubre hoy, semana, quincena y mes", () => {
    const now = DateTime.fromISO("2026-08-22T08:57:00", {
      zone: ZONA_NEGOCIO,
    }).toJSDate();
    expect(rangoUiDePreset("hoy", "2026-08-10", now)).toEqual({
      desde: "2026-08-22",
      hasta: "2026-08-22",
    });
    expect(rangoUiDePreset("semana", "2026-08-22")).toEqual({
      desde: "2026-08-17",
      hasta: "2026-08-23",
    });
    expect(rangoUiDePreset("quincena", "2026-08-22")).toEqual({
      desde: "2026-08-16",
      hasta: "2026-08-31",
    });
    expect(rangoUiDePreset("mes", "2026-08-22")).toEqual({
      desde: "2026-08-01",
      hasta: "2026-08-31",
    });
    expect(rangoUiDePreset("personalizado", "2026-08-22")).toBeNull();
    // «Esta noche» apunta a la operación en captura, que solo conoce el
    // llamador: aquí no hay rango que resolver.
    expect(rangoUiDePreset("noche", "2026-08-22")).toBeNull();
  });

  test("periodoDePresetCalendario y etiquetaTriggerFecha del rango", () => {
    expect(periodoDePresetCalendario("hoy")).toBe("hoy");
    expect(periodoDePresetCalendario("noche")).toBe("rango");
    expect(periodoDePresetCalendario("mes")).toBe("mes");
    expect(periodoDePresetCalendario("personalizado")).toBe("rango");
    expect(etiquetaTriggerFecha("2026-08-10", "2026-08-20")).toBe("10 – 20 ago");
    expect(etiquetaTriggerFecha("2026-08-10", undefined)).toBe("2026-08-10");
  });

  test("dateCivilDesdeIso e isoCivilDesdeDate no cruzan el día por UTC", () => {
    const d = dateCivilDesdeIso("2026-08-22");
    expect(d).not.toBeNull();
    expect(d!.getFullYear()).toBe(2026);
    expect(d!.getMonth()).toBe(7);
    expect(d!.getDate()).toBe(22);
    expect(isoCivilDesdeDate(d!)).toBe("2026-08-22");
    expect(dateCivilDesdeIso("no")).toBeNull();
  });
});

describe("etiquetaDiaSemanaCorto", () => {
  test("antepone el día de la semana", () => {
    // 2026-08-21 es viernes.
    expect(etiquetaDiaSemanaCorto("2026-08-21")).toBe("Vi 21 ago");
    expect(etiquetaDiaSemanaCorto("2026-08-23")).toBe("Do 23 ago");
  });

  test("devuelve la entrada si no es un ISO", () => {
    expect(etiquetaDiaSemanaCorto("mañana")).toBe("mañana");
  });
});
