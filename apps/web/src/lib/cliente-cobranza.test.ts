import { describe, expect, test } from "bun:test";
import type { FacturaCartera } from "@misupertostada/shared";
import {
  cobranzaDeCliente,
  resumenCobranzaPorCliente,
} from "./cliente-cobranza";

function fac(
  partial: Partial<FacturaCartera> & Pick<FacturaCartera, "clienteId" | "estado">,
): FacturaCartera {
  return {
    id: crypto.randomUUID(),
    pedidoId: crypto.randomUUID(),
    numeroDte: null,
    montoCentavos: 1000,
    abonadoCentavos: 0,
    saldoCentavos: 1000,
    emitidaAt: null,
    antiguedadDias: 0,
    fotoAssetId: null,
    correlativo: 1,
    clienteNombre: "X",
    fechaOperacion: "2026-08-20",
    ...partial,
  };
}

describe("resumenCobranzaPorCliente", () => {
  test("cuenta pendientes, sin DTE y vencidas; ignora pagadas", () => {
    const a = "00000000-0000-4000-a000-000000000001";
    const b = "00000000-0000-4000-a000-000000000002";
    const map = resumenCobranzaPorCliente([
      fac({ clienteId: a, estado: "PENDIENTE", saldoCentavos: 500, numeroDte: null }),
      fac({
        clienteId: a,
        estado: "VENCIDO",
        saldoCentavos: 300,
        numeroDte: "DTE-1",
      }),
      fac({ clienteId: a, estado: "PAGADO", saldoCentavos: 0, numeroDte: "DTE-2" }),
      fac({
        clienteId: b,
        estado: "ABONO_PARCIAL",
        saldoCentavos: 200,
        numeroDte: null,
      }),
    ]);
    expect(map.get(a)).toEqual({
      facturasPendientes: 2,
      facturasEnProgreso: 1,
      facturasVencidas: 1,
      saldoCentavos: 800,
    });
    expect(map.get(b)?.facturasEnProgreso).toBe(1);
    expect(
      cobranzaDeCliente(
        {
          id: "00000000-0000-4000-a000-000000000099",
          nombre: "Nuevo",
          contacto: null,
          telefonoWa: null,
          horarioEntregaFijo: null,
          notasPermanentes: null,
          limiteFacturasPendientes: null,
          fotoAssetId: null,
          tieneTokenPortal: false,
          activo: true,
        },
        map,
      ).facturasPendientes,
    ).toBe(0);
  });
});
