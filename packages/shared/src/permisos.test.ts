import { describe, expect, test } from "bun:test";
import {
  PERMISOS,
  PERMISOS_NO_DELEGABLES,
  ROL_PERMISOS,
  puedeDelegar,
  permisosEfectivos,
  permisosPlantilla,
  tienePermiso,
} from "./permisos";
import { MODULOS_ACCESO, tieneModulo } from "./modulos-acceso";

describe("permisos efectivos", () => {
  test("ADMIN_JEFE tiene el catálogo completo sin depender de grants", () => {
    const efectivos = permisosEfectivos("ADMIN_JEFE");
    expect(efectivos).toEqual([...PERMISOS]);
    expect(tienePermiso(efectivos, "precios.cambiar")).toBe(true);
    expect(tienePermiso(efectivos, "ventana.reabrir")).toBe(true);
    expect(tienePermiso(efectivos, "panel.hoy")).toBe(true);
  });

  test("sin grants, un puesto no-jefe no ve nada", () => {
    expect(permisosEfectivos("ADMIN")).toEqual([]);
    expect(permisosEfectivos("PRODUCCION")).toEqual([]);
    expect(permisosEfectivos("TIENDA")).toEqual([]);
    expect(permisosEfectivos("REPARTO")).toEqual([]);
  });

  test("la plantilla de ADMIN incluye panel y acciones, sin poderes de jefe", () => {
    const base = permisosPlantilla("ADMIN");
    expect(base).toEqual([...ROL_PERMISOS.ADMIN]);
    expect(tienePermiso(base, "precios.cambiar")).toBe(false);
    expect(tienePermiso(base, "ventana.cerrar")).toBe(true);
    expect(tienePermiso(base, "panel.catalogo")).toBe(true);
    expect(
      tienePermiso(permisosEfectivos("ADMIN", ["precios.cambiar"]), "precios.cambiar"),
    ).toBe(true);
  });

  test("plantilla de producción: ve el núcleo, sin acciones de escritura", () => {
    const base = permisosPlantilla("PRODUCCION");
    for (const id of ["hoy", "tablero", "pedidos", "produccion", "reparto", "cartera"] as const) {
      expect(tieneModulo(base, id)).toBe(true);
    }
    expect(tieneModulo(base, "catalogo")).toBe(false);
    expect(tienePermiso(base, "pedidos.entregar")).toBe(false);
  });

  test("plantillas de tienda y reparto", () => {
    const tienda = permisosPlantilla("TIENDA");
    expect(tienePermiso(tienda, "pedidos.capturar_manual")).toBe(true);
    expect(tienePermiso(tienda, "cobranza.capturar_dte")).toBe(true);

    const reparto = permisosPlantilla("REPARTO");
    expect(tienePermiso(reparto, "pedidos.entregar")).toBe(true);
    expect(tienePermiso(reparto, "cobranza.registrar_pago")).toBe(true);
    expect(tienePermiso(reparto, "cobranza.capturar_dte")).toBe(false);
  });
});

describe("módulos", () => {
  test("cada módulo del panel tiene permiso de ver", () => {
    expect(MODULOS_ACCESO.length).toBe(8);
    for (const m of MODULOS_ACCESO) {
      expect(m.ver.startsWith("panel.")).toBe(true);
    }
  });
});

describe("delegación", () => {
  test("solo ADMIN_JEFE delega, y nunca los permisos reservados al puesto", () => {
    expect(puedeDelegar("ADMIN_JEFE", "precios.cambiar")).toBe(true);
    expect(puedeDelegar("ADMIN_JEFE", "panel.hoy")).toBe(true);
    expect(puedeDelegar("ADMIN", "precios.cambiar")).toBe(false);
    for (const codigo of PERMISOS_NO_DELEGABLES) {
      expect(puedeDelegar("ADMIN_JEFE", codigo)).toBe(false);
    }
  });
});
