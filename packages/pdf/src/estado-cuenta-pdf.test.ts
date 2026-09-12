import { describe, expect, test } from "bun:test";
import type { EstadoCuentaPdf } from "@misupertostada/shared";
import { renderEstadoCuentaPdf } from "./estado-cuenta-pdf";

describe("renderEstadoCuentaPdf", () => {
  test("genera un PDF válido para un estado de cuenta con facturas", async () => {
    const data: EstadoCuentaPdf = {
      clienteNombre: "Restaurante El Portal",
      generadoAt: "2026-09-07 09:00",
      saldoCentavos: 125000,
      facturasPendientes: 2,
      facturas: [
        {
          numeroDte: "DTE-1001",
          montoCentavos: 75000,
          saldoCentavos: 75000,
          estado: "EMITIDA",
          antiguedadDias: 5,
        },
        {
          numeroDte: "DTE-1002",
          montoCentavos: 50000,
          saldoCentavos: 50000,
          estado: "EMITIDA",
          antiguedadDias: 2,
        },
      ],
    };

    const buf = await renderEstadoCuentaPdf(data);
    expect(buf.length).toBeGreaterThan(1_000);
    expect(buf.subarray(0, 5).toString("utf8")).toBe("%PDF-");
  });
});
