import { describe, expect, test } from "bun:test";
import { DateTime } from "luxon";
import { filtrosDesdeSearch } from "./filtros-tablero";

describe("filtros-tablero periodo UI", () => {
  test("filtrosDesdeSearch reconoce periodo rango y mes", () => {
    const sp = new URLSearchParams(
      "periodo=rango&desde=2026-08-01&hasta=2026-08-20",
    );
    expect(filtrosDesdeSearch(sp)).toMatchObject({
      periodo: "rango",
      desde: "2026-08-01",
      hasta: "2026-08-20",
    });
    expect(
      filtrosDesdeSearch(
        new URLSearchParams("periodo=hoy&desde=2026-08-21&hasta=2026-08-21"),
        DateTime.fromISO("2026-08-22T08:57:00", {
          zone: "America/Guatemala",
        }).toJSDate(),
      ),
    ).toMatchObject({
      periodo: "hoy",
      desde: "2026-08-22",
      hasta: "2026-08-22",
    });
    expect(
      filtrosDesdeSearch(new URLSearchParams("periodo=mes")),
    ).toMatchObject({ periodo: "mes" });
  });
});
