import { describe, expect, test } from "bun:test";
import {
  COPY_PAGO_COMPLETO,
  COPY_PEDIDO_ANULADO,
  ESTADO_PRESENTACION,
  ESTADOS_BADGE,
  FAMILIAS,
  PEDIDO_ESTADOS,
  PEDIDO_ORIGENES,
  PAGO_ESTADOS,
  PAGO_METODOS,
  PUNTOS_CARGA,
  ROLES,
  UNIDADES_MEDIDA,
  type EstadoBadgeVariant,
  type PedidoEstado,
} from "./estados";

describe("estados de dominio", () => {
  test("pedido, pago y punto de carga son conjuntos distintos", () => {
    expect(PEDIDO_ESTADOS).toEqual([
      "BORRADOR",
      "CONFIRMADO",
      "EN_PRODUCCION",
      "ENTREGADO",
      "ANULADO",
    ]);
    expect(PAGO_ESTADOS).toEqual([
      "PAGADO",
      "PENDIENTE",
      "ABONO_PARCIAL",
      "VENCIDO",
    ]);
    expect(PUNTOS_CARGA).toEqual(["PLANTA", "DEMOCRACIA"]);
    expect(PEDIDO_ESTADOS).not.toContain("PLANTA");
    expect(PAGO_ESTADOS).not.toContain("DEMOCRACIA");
  });

  test("PedidoEstado no incluye puntos de carga", () => {
    const pedido: PedidoEstado = "CONFIRMADO";
    expect(PUNTOS_CARGA.includes(pedido as never)).toBe(false);
  });

  test("cada variante de badge tiene label y tokens", () => {
    for (const estado of ESTADOS_BADGE) {
      const presentacion = ESTADO_PRESENTACION[estado];
      expect(presentacion.label.length).toBeGreaterThan(0);
      expect(presentacion.bg.startsWith("var(--")).toBe(true);
      expect(presentacion.fg.startsWith("var(--")).toBe(true);
    }
  });

  test("ABONO_PARCIAL y PENDIENTE comparten tokens de pendiente", () => {
    expect(ESTADO_PRESENTACION.ABONO_PARCIAL.bg).toBe(
      ESTADO_PRESENTACION.PENDIENTE.bg,
    );
    expect(ESTADO_PRESENTACION.ABONO_PARCIAL.fg).toBe(
      ESTADO_PRESENTACION.PENDIENTE.fg,
    );
  });

  test("puntos de carga usan tokens --carga-*, no --estado-*", () => {
    expect(ESTADO_PRESENTACION.PLANTA.bg).toContain("--carga-");
    expect(ESTADO_PRESENTACION.DEMOCRACIA.bg).toContain("--carga-");
  });

  test("el mapa cubre exactamente EstadoBadgeVariant", () => {
    const keys = Object.keys(ESTADO_PRESENTACION) as EstadoBadgeVariant[];
    expect(keys.sort()).toEqual([...ESTADOS_BADGE].sort());
  });

  test("la UI nunca dice cancelado: pago es Pagado, pedido es Anulado", () => {
    expect(COPY_PAGO_COMPLETO).toBe("Pagado");
    expect(COPY_PEDIDO_ANULADO).toBe("Anulado");
    expect(ESTADO_PRESENTACION.PAGADO.label).toBe("Pagado");
    expect(ESTADO_PRESENTACION.ANULADO.label).toBe("Anulado");
    expect(COPY_PAGO_COMPLETO.toLowerCase()).not.toContain("cancel");
    expect(COPY_PEDIDO_ANULADO.toLowerCase()).not.toContain("cancel");
  });

  test("constantes de catálogo, roles y origen cubren el seed", () => {
    expect(UNIDADES_MEDIDA).toEqual(["LIBRA", "BOLSA", "UNIDAD"]);
    expect(ROLES).toEqual([
      "ADMIN_JEFE",
      "ADMIN",
      "PRODUCCION",
      "TIENDA",
      "REPARTO",
    ]);
    expect(PEDIDO_ORIGENES).toEqual(["PORTAL", "MANUAL"]);
    expect(FAMILIAS).toEqual(["TORTILLA", "TOSTADA", "FRITURA"]);
    expect(PAGO_METODOS).toEqual(["EFECTIVO", "TRANSFERENCIA"]);
    expect(PAGO_METODOS).not.toContain("CHEQUE");
  });
});
