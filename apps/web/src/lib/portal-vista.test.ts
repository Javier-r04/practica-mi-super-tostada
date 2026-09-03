import { describe, expect, test } from "bun:test";
import type { PortalProducto } from "@misupertostada/shared";
import {
  avisoLimiteCredito,
  cierreAnticipadoVentana,
  ctaInicio,
  ctaInicioSecundaria,
  entregaCopy,
  gruposCatalogo,
  normalizarBusqueda,
  origenPedidoLabel,
  propsVentanaCountdown,
  propsVentanaPedido,
  saludoCopy,
  vistaPedir,
} from "./portal-vista";

const producto = (
  partial: Partial<PortalProducto> & Pick<PortalProducto, "productoId" | "alias">,
): PortalProducto => ({
  nombreCanonico: partial.nombreCanonico ?? partial.alias,
  unidadMedida: "LIBRA",
  precioCentavos: 1250,
  favorito: false,
  familia: "TORTILLA",
  orden: 1,
  pedible: true,
  fotoAssetId: null,
  ...partial,
});

describe("saludoCopy", () => {
  test("usted + nombre", () => {
    expect(saludoCopy("tardes", "Tabasco")).toBe("Buenas tardes, Tabasco.");
    expect(saludoCopy("noches", "Casa Vieja")).toBe(
      "Buenas noches, Casa Vieja.",
    );
  });
});

describe("entregaCopy", () => {
  test("con y sin horario", () => {
    const base = {
      ventana: {
        abierta: true,
        fechaOperacion: "2026-08-21",
        fechaEntrega: "2026-08-22",
        diaEstado: "SIN_CIERRE" as const,
        cierraAt: "x".repeat(20),
        proximaAperturaAt: "y".repeat(20),
        horarioEntregaFijo: "08:30" as string | null,
      },
    };
    expect(entregaCopy(base)).toContain("a las 08:30");
    expect(
      entregaCopy({
        ventana: { ...base.ventana, horarioEntregaFijo: null },
      }),
    ).not.toContain("a las");
  });
});

describe("ctaInicio", () => {
  test("ventana abierta sin pedido → Hacer mi pedido", () => {
    expect(ctaInicio({ abierta: true, pedidoAbierto: null })).toEqual({
      kind: "pedir",
      label: "Hacer mi pedido",
    });
  });

  test("ventana abierta con pedido → editar", () => {
    const pedido = {
      id: "00000000-0000-4000-a000-000000000020",
      correlativo: 1,
      estado: "CONFIRMADO" as const,
      fechaOperacion: "2026-08-21",
      origen: "PORTAL" as const,
      items: [],
      totalCentavos: 0,
      textoConfirmacion: "x",
    };
    expect(ctaInicio({ abierta: true, pedidoAbierto: pedido }).kind).toBe(
      "editar",
    );
  });

  test("ventana cerrada → ver pedidos; secundaria catálogo", () => {
    expect(ctaInicio({ abierta: false, pedidoAbierto: null }).kind).toBe(
      "pedidos",
    );
    expect(ctaInicioSecundaria(false)?.kind).toBe("catalogo");
    expect(ctaInicioSecundaria(true)).toBeNull();
  });
});

describe("cierreAnticipadoVentana", () => {
  const base = {
    abierta: true,
    diaEstado: "SIN_CIERRE" as const,
  };

  test("true solo cuando el reloj sigue vivo y el día ya cerró", () => {
    expect(
      cierreAnticipadoVentana({ ...base, diaEstado: "CERRADO" }),
    ).toBe(true);
    expect(cierreAnticipadoVentana(base)).toBe(false);
    expect(
      cierreAnticipadoVentana({ abierta: false, diaEstado: "CERRADO" }),
    ).toBe(false);
    expect(
      cierreAnticipadoVentana({ abierta: true, diaEstado: "REABIERTO" }),
    ).toBe(false);
  });
});

describe("propsVentanaPedido", () => {
  const cerrada = {
    abierta: true,
    fechaOperacion: "2026-08-20",
    fechaEntrega: "2026-08-21",
    diaEstado: "CERRADO" as const,
    cierraAt: null,
    proximaAperturaAt: "2026-08-21T15:00:00.000-06:00",
    horarioEntregaFijo: null,
  };

  test("el badge del portal recibe los mismos bits que el navbar", () => {
    expect(propsVentanaPedido(cerrada)).toEqual({
      abierta: true,
      reabierta: false,
      diaCerrado: true,
      cierraAt: null,
      proximaAperturaAt: "2026-08-21T15:00:00.000-06:00",
    });
  });

  test("el countdown del cierre anticipado apunta a la apertura, no al cierre", () => {
    expect(propsVentanaCountdown(cerrada)).toEqual({
      cierraAt: null,
      abreAt: "2026-08-21T15:00:00.000-06:00",
    });
    expect(
      propsVentanaCountdown({
        ...cerrada,
        abierta: true,
        diaEstado: "SIN_CIERRE",
        cierraAt: "2026-08-21T03:00:00.000-06:00",
        proximaAperturaAt: null,
      }),
    ).toEqual({
      cierraAt: "2026-08-21T03:00:00.000-06:00",
      abreAt: null,
    });
  });

  test("ventana cerrada: el navbar cuenta hacia la próxima apertura", () => {
    expect(
      propsVentanaCountdown({
        ...cerrada,
        abierta: false,
        diaEstado: "SIN_CIERRE",
        cierraAt: "2026-08-21T03:00:00.000-06:00",
        proximaAperturaAt: "2026-08-21T15:00:00.000-06:00",
      }),
    ).toEqual({
      cierraAt: null,
      abreAt: "2026-08-21T15:00:00.000-06:00",
    });
  });
});

describe("avisoLimiteCredito", () => {
  test("solo cuando alcanza o supera el límite", () => {
    expect(
      avisoLimiteCredito({
        facturasPendientes: 3,
        limiteFacturasPendientes: 4,
      }),
    ).toBeNull();
    expect(
      avisoLimiteCredito({
        facturasPendientes: 4,
        limiteFacturasPendientes: 4,
      }),
    ).toMatch(/acumulación alta/);
  });
});

describe("gruposCatalogo", () => {
  const catalogo = [
    producto({
      productoId: "00000000-0000-4000-a000-000000000001",
      alias: "tortilla grande",
      favorito: true,
      familia: "TORTILLA",
    }),
    producto({
      productoId: "00000000-0000-4000-a000-000000000002",
      alias: "nachos",
      familia: "FRITURA",
      nombreCanonico: "Nachos Blancos Grandes",
    }),
    producto({
      productoId: "00000000-0000-4000-a000-000000000003",
      alias: "tostada",
      familia: "TOSTADA",
    }),
  ];

  test("favoritos arriba; resto por familia canónica", () => {
    const { favoritos, grupos } = gruposCatalogo({ catalogo });
    expect(favoritos).toHaveLength(1);
    expect(grupos.map((g) => g.key)).toEqual(["TOSTADA", "FRITURA"]);
  });

  test("filtra por alias o canónico", () => {
    const { favoritos, grupos } = gruposCatalogo({
      catalogo,
      query: "nachos blancos",
    });
    expect(favoritos).toHaveLength(0);
    expect(grupos).toHaveLength(1);
    expect(grupos[0]?.productos[0]?.alias).toBe("nachos");
  });
});

describe("origenPedidoLabel", () => {
  test("MANUAL → Tienda", () => {
    expect(origenPedidoLabel("PORTAL")).toBe("Portal");
    expect(origenPedidoLabel("MANUAL")).toBe("Tienda");
  });
});

describe("normalizarBusqueda", () => {
  test("quita acentos, espacios de sobra y mayúsculas", () => {
    expect(normalizarBusqueda("  Tostáda  ")).toBe("tostada");
    expect(normalizarBusqueda("PAPALINAS")).toBe("papalinas");
  });

  test("el cliente escribe sin acentos y encuentra el producto acentuado", () => {
    const catalogo = [
      producto({
        productoId: "00000000-0000-4000-a000-000000000010",
        alias: "Tostáda grande",
        familia: "TOSTADA",
      }),
    ];
    const { grupos } = gruposCatalogo({ catalogo, query: "tostada" });
    expect(grupos[0]?.productos).toHaveLength(1);
  });

  test("y al revés: escribe con acento y el catálogo no lo tiene", () => {
    const catalogo = [
      producto({
        productoId: "00000000-0000-4000-a000-000000000011",
        alias: "papalinas",
        familia: "FRITURA",
      }),
    ];
    const { grupos } = gruposCatalogo({ catalogo, query: "papalínas" });
    expect(grupos[0]?.productos).toHaveLength(1);
  });
});

describe("vistaPedir", () => {
  const pedido = {
    id: "00000000-0000-4000-a000-000000000020",
    correlativo: 1042,
    estado: "CONFIRMADO",
    fechaOperacion: "2026-08-20",
    fechaEntrega: "2026-08-21",
    origen: "PORTAL",
    items: [],
    totalCentavos: 0,
    textoConfirmacion: "",
  } as unknown as Parameters<typeof vistaPedir>[0]["pedidoAbierto"];

  test("sin pedido abierto, el catálogo", () => {
    expect(vistaPedir({ pedidoAbierto: null, editando: false })).toBe("catalogo");
  });

  test("con pedido abierto, la confirmación", () => {
    expect(vistaPedir({ pedidoAbierto: pedido, editando: false })).toBe(
      "confirmacion",
    );
  });

  test("pidió editar: manda su intención, no el servidor", () => {
    expect(vistaPedir({ pedidoAbierto: pedido, editando: true })).toBe("catalogo");
  });

  test("un pedido que llega después (SSE o captura por teléfono) cambia la vista", () => {
    // El defecto que arregla: antes la vista se congelaba en el primer render.
    expect(vistaPedir({ pedidoAbierto: null, editando: false })).toBe("catalogo");
    expect(vistaPedir({ pedidoAbierto: pedido, editando: false })).toBe(
      "confirmacion",
    );
  });
});
