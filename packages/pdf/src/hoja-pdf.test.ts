import { describe, expect, test } from "bun:test";
import type { BloqueCliente, HojaSnapshot } from "@misupertostada/shared";
import { renderHojaPdf } from "./hoja-pdf";

const T16 = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";

describe("renderHojaPdf", () => {
  test("con muchas notas de producción genera un PDF (no se corta el renglón)", async () => {
    const clientes: BloqueCliente[] = Array.from({ length: 18 }, (_, i) => ({
      clienteId: `00000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`,
      nombre: `Cliente ${String(i + 1).padStart(2, "0")}`,
      horarioEntregaFijo: null,
      notasPermanentes: null,
      notasAdmin: null,
      items: [
        {
          productoId: T16,
          nombreCanonico: "Tortillas #16",
          unidadMedida: "LIBRA",
          cantidad: 10,
          puntoCargaEfectivo: "PLANTA",
          notaProduccion: "GRUESA",
        },
      ],
    }));

    const snapshot: HojaSnapshot = {
      fechaOperacion: "2026-08-30",
      fechaEntrega: "2026-08-31",
      esSabado: false,
      version: 1,
      productos: [
        {
          productoId: T16,
          nombreCanonico: "Tortillas #16",
          unidadMedida: "LIBRA",
          cantidad: 180,
          puntoCargaEfectivo: "PLANTA",
          notaProduccion: clientes
            .map((c) => `GRUESA · ${c.nombre}`)
            .join("; "),
          familia: "TORTILLA",
        },
      ],
      clientes,
    };

    const buf = await renderHojaPdf({
      snapshot,
      texto: "PEDIDO PARA DOMINGO\n",
      version: 1,
      generadoAt: "2026-08-30T09:00:00.000Z",
    });
    expect(buf.length).toBeGreaterThan(1_000);
    expect(buf.subarray(0, 5).toString("utf8")).toBe("%PDF-");
  });
});
