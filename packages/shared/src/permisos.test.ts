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
    expect(tienePermiso(efectivos, "ventana.cerrar")).toBe(true);
    expect(tienePermiso(efectivos, "ventana.configurar")).toBe(true);
    expect(tienePermiso(efectivos, "audit.leer")).toBe(true);
    expect(tienePermiso(efectivos, "mensajeria.enviar")).toBe(true);
    expect(tienePermiso(efectivos, "mensajeria.conectar")).toBe(true);
  });

  test("ADMIN no cambia precios ni reabre ventana hasta que se lo deleguen", () => {
    const base = permisosEfectivos("ADMIN");
    expect(base).toEqual([...ROL_PERMISOS.ADMIN]);
    expect(tienePermiso(base, "precios.cambiar")).toBe(false);
    expect(
      tienePermiso(permisosEfectivos("ADMIN", ["precios.cambiar"]), "precios.cambiar"),
    ).toBe(true);
  });

  test("ADMIN cierra la ventana; no reabre hasta que se lo deleguen (y reabrir no es delegable)", () => {
    const base = permisosEfectivos("ADMIN");
    expect(tienePermiso(base, "ventana.cerrar")).toBe(true);
    expect(tienePermiso(base, "ventana.reabrir")).toBe(false);
    expect(tienePermiso(base, "ventana.configurar")).toBe(false);
    expect(tienePermiso(base, "audit.leer")).toBe(false);
    expect(tienePermiso(base, "mensajeria.enviar")).toBe(true);
    expect(tienePermiso(base, "mensajeria.conectar")).toBe(false);
    expect(puedeDelegar("ADMIN_JEFE", "ventana.cerrar")).toBe(true);
    expect(puedeDelegar("ADMIN_JEFE", "mensajeria.conectar")).toBe(false);
  });

  test("producción no tiene acciones de catálogo ni cobranza", () => {
    expect(permisosEfectivos("PRODUCCION")).toEqual([]);
  });

  test("tienda captura pedidos, entrega, DTE y cobro; reparto entrega y cobra", () => {
    expect(permisosEfectivos("TIENDA")).toEqual([
      "pedidos.capturar_manual",
      "pedidos.entregar",
      "cobranza.registrar_pago",
      "cobranza.capturar_dte",
    ]);
    expect(permisosEfectivos("REPARTO")).toEqual([
      "pedidos.entregar",
      "cobranza.registrar_pago",
    ]);
    expect(tienePermiso(permisosEfectivos("REPARTO"), "cobranza.capturar_dte")).toBe(
      false,
    );
    expect(tienePermiso(permisosEfectivos("PRODUCCION"), "pedidos.entregar")).toBe(
      false,
    );
    expect(tienePermiso(permisosEfectivos("PRODUCCION"), "mensajeria.enviar")).toBe(
      false,
    );
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
