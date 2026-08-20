import { describe, expect, test } from "bun:test";
import {
  PERMISOS,
  PERMISOS_NO_DELEGABLES,
  ROL_PERMISOS,
  puedeDelegar,
  permisosEfectivos,
  tienePermiso,
} from "./permisos";

describe("permisos por rol", () => {
  test("ADMIN_JEFE tiene el catálogo completo, incluido cambiar precios", () => {
    const efectivos = permisosEfectivos("ADMIN_JEFE");
    expect(efectivos).toEqual([...PERMISOS]);
    expect(tienePermiso(efectivos, "precios.cambiar")).toBe(true);
    expect(tienePermiso(efectivos, "ventana.reabrir")).toBe(true);
  });

  test("ADMIN no cambia precios ni reabre ventana hasta que se lo deleguen", () => {
    const base = permisosEfectivos("ADMIN");
    expect(base).toEqual([...ROL_PERMISOS.ADMIN]);
    expect(tienePermiso(base, "precios.cambiar")).toBe(false);
    expect(
      tienePermiso(permisosEfectivos("ADMIN", ["precios.cambiar"]), "precios.cambiar"),
    ).toBe(true);
  });

  test("producción no tiene acciones de catálogo ni cobranza", () => {
    expect(permisosEfectivos("PRODUCCION")).toEqual([]);
  });

  test("tienda captura pedidos; reparto registra pagos", () => {
    expect(permisosEfectivos("TIENDA")).toEqual(["pedidos.capturar_manual"]);
    expect(permisosEfectivos("REPARTO")).toEqual(["cobranza.registrar_pago"]);
  });
});

describe("delegación", () => {
  test("solo ADMIN_JEFE delega, y nunca los permisos reservados al rol", () => {
    expect(puedeDelegar("ADMIN_JEFE", "precios.cambiar")).toBe(true);
    expect(puedeDelegar("ADMIN", "precios.cambiar")).toBe(false);
    for (const codigo of PERMISOS_NO_DELEGABLES) {
      expect(puedeDelegar("ADMIN_JEFE", codigo)).toBe(false);
    }
  });
});
