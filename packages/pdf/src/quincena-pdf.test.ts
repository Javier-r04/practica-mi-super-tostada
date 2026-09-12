import { describe, expect, test } from "bun:test";
import type { Tablero } from "@misupertostada/shared";
import { renderQuincenaPdf } from "./quincena-pdf";

describe("renderQuincenaPdf", () => {
  test("genera un PDF válido para el cierre de quincena con todas las secciones", async () => {
    const data: Tablero = {
      filtrosAplicados: {
        periodo: "quincena",
        desde: "2026-08-16",
        hasta: "2026-08-31",
        etiqueta: "Segunda quincena de agosto 2026",
        clienteId: null,
        familia: null,
        puntoCarga: null,
        origen: null,
        carteraAplica: true,
      },
      kpis: {
        ventasCentavos: 12500000,
        ventasDeltaCentavos: 500000,
        ventasDeltaPuntosBase: 416,
        pedidos: 85,
        portal: 70,
        manual: 15,
        cobradoCentavos: 11000000,
        cobradoEfectivoCentavos: 6000000,
        cobradoTransferenciaCentavos: 5000000,
        cobradoChequeCentavos: 0,
        porCobrarCentavos: 1500000,
        clientesAlertaCount: 2,
        adopcionPuntosBase: 8235,
      },
      ventas: {
        actual: { desde: "2026-08-16", hasta: "2026-08-31", totalCentavos: 12500000 },
        anterior: { desde: "2026-08-01", hasta: "2026-08-15", totalCentavos: 12000000 },
        porDia: [
          { fecha: "2026-08-16", montoCentavos: 1500000, pedidos: 10 },
          { fecha: "2026-08-17", montoCentavos: 2000000, pedidos: 12 },
        ],
        porCliente: [
          {
            clienteId: "c1",
            nombre: "Restaurante Central",
            montoCentavos: 5000000,
            puntosBase: 4000,
          },
          {
            clienteId: "c2",
            nombre: "Café París",
            montoCentavos: 3000000,
            puntosBase: 2400,
          },
        ],
      },
      productos: [
        {
          productoId: "p1",
          sku: "T16",
          nombreMostrado: "Tortilla #16",
          familia: "TORTILLA",
          unidadMedida: "LIBRA",
          puntoCarga: "PLANTA",
          cantidad: 1500,
        },
      ],
      cartera: {
        tramos: [
          { clave: "0-7", saldoCentavos: 1000000, facturas: 5 },
          { clave: "8-14", saldoCentavos: 500000, facturas: 2 },
          { clave: "15-30", saldoCentavos: 0, facturas: 0 },
          { clave: "31+", saldoCentavos: 0, facturas: 0 },
        ],
        sobreLimite: [],
      },
      adopcion: {
        portal: 70,
        manual: 15,
      },
      operacion: {
        pedidos: 85,
        ruta: {
          confirmados: 0,
          enProduccion: 0,
          entregados: 85,
          anulados: 0,
        },
        clientesSinPedido: [],
      },
      cobradoPorDia: [
        {
          fecha: "2026-08-16",
          efectivoCentavos: 800000,
          transferenciaCentavos: 500000,
        },
      ],
      clientes: [
        {
          clienteId: "c1",
          nombre: "Restaurante Central",
          pedidos: 10,
          ticketPromedioCentavos: 500000,
          diasPagoMediana: 3,
          ultimoPedidoFecha: "2026-08-31",
          dejoDePedir: false,
        },
      ],
    };

    const buf = await renderQuincenaPdf(data, {
      generadoAt: new Date("2026-08-31T18:00:00.000Z"),
    });

    expect(buf.length).toBeGreaterThan(1_000);
    expect(buf.subarray(0, 5).toString("utf8")).toBe("%PDF-");
  });
});
