import { describe, expect, test } from "bun:test";
import { permisosEfectivos, type Rol } from "@misupertostada/shared";
import {
  esSoloLectura,
  repartirNavMovil,
  seccionVisible,
  SECCIONES_PANEL,
  type SeccionPanel,
} from "./nav-vista";

const ROLES: readonly Rol[] = [
  "ADMIN_JEFE",
  "ADMIN",
  "PRODUCCION",
  "TIENDA",
  "REPARTO",
];

/** La jornada: la misma información, distintas acciones (AGENTS F-403). */
const NUCLEO_OPERATIVO: readonly SeccionPanel[] = [
  "hoy",
  "tablero",
  "pedidos",
  "produccion",
  "reparto",
  "cartera",
];

function visibles(rol: Rol): SeccionPanel[] {
  const permisos = permisosEfectivos(rol);
  return SECCIONES_PANEL.filter((s) => seccionVisible(s, permisos));
}

describe("visibilidad del menú por rol", () => {
  test("los cinco roles ven las seis secciones operativas", () => {
    for (const rol of ROLES) {
      const vistas = visibles(rol);
      for (const seccion of NUCLEO_OPERATIVO) {
        expect(vistas).toContain(seccion);
      }
    }
  });

  test("PRODUCCION no tiene permisos y aun así ve toda la jornada", () => {
    // Es el caso que motivó el cambio: el backend le servía la cartera y el
    // menú se la escondía por no poder escribir en ella.
    expect(permisosEfectivos("PRODUCCION")).toEqual([]);
    expect(visibles("PRODUCCION")).toEqual([...NUCLEO_OPERATIVO]);
  });

  test("Catálogo, Clientes y Conversaciones siguen pidiendo permiso", () => {
    const produccion = visibles("PRODUCCION");
    expect(produccion).not.toContain("catalogo");
    expect(produccion).not.toContain("clientes");
    expect(produccion).not.toContain("conversaciones");

    const reparto = visibles("REPARTO");
    expect(reparto).not.toContain("catalogo");
    expect(reparto).not.toContain("conversaciones");
  });

  test("ADMIN_JEFE ve todo", () => {
    expect(visibles("ADMIN_JEFE")).toEqual([...SECCIONES_PANEL]);
  });
});

describe("badge de solo lectura", () => {
  test("PRODUCCION lee pedidos, reparto y cartera sin poder escribir", () => {
    const permisos = permisosEfectivos("PRODUCCION");
    expect(esSoloLectura("pedidos", permisos)).toBe(true);
    expect(esSoloLectura("reparto", permisos)).toBe(true);
    expect(esSoloLectura("cartera", permisos)).toBe(true);
    expect(esSoloLectura("hoy", permisos)).toBe(true);
  });

  test("no se marca donde el usuario sí puede actuar", () => {
    expect(esSoloLectura("reparto", permisosEfectivos("REPARTO"))).toBe(false);
    expect(esSoloLectura("cartera", permisosEfectivos("TIENDA"))).toBe(false);
    expect(esSoloLectura("pedidos", permisosEfectivos("TIENDA"))).toBe(false);
    expect(esSoloLectura("hoy", permisosEfectivos("ADMIN"))).toBe(false);
  });

  test("Tablero y Producción no se marcan: nadie escribe ahí", () => {
    for (const rol of ROLES) {
      const permisos = permisosEfectivos(rol);
      expect(esSoloLectura("tablero", permisos)).toBe(false);
      expect(esSoloLectura("produccion", permisos)).toBe(false);
    }
  });
});

describe("reparto móvil por rol", () => {
  const items = (secciones: SeccionPanel[]) =>
    secciones.map((id) => ({
      id,
      mobile: ["tablero", "conversaciones", "catalogo", "clientes"].includes(id)
        ? false
        : undefined,
    }));

  test("REPARTO prioriza Reparto y Cartera en la barra", () => {
    const { barra, extra } = repartirNavMovil(items(visibles("REPARTO")), "REPARTO");
    expect(barra.map((i) => i.id)).toEqual(["reparto", "cartera", "hoy"]);
    expect(extra.map((i) => i.id)).toContain("pedidos");
    expect(extra.map((i) => i.id)).toContain("tablero");
  });

  test("PRODUCCION prioriza Producción y Pedidos en la barra", () => {
    const { barra } = repartirNavMovil(items(visibles("PRODUCCION")), "PRODUCCION");
    expect(barra.map((i) => i.id)).toEqual(["produccion", "pedidos", "hoy"]);
  });

  test("ADMIN_JEFE con nueve secciones deja catálogo y clientes en extra", () => {
    const { barra, extra } = repartirNavMovil(
      items(visibles("ADMIN_JEFE")),
      "ADMIN_JEFE",
    );
    expect(barra.map((i) => i.id)).toEqual(["hoy", "pedidos", "produccion"]);
    expect(extra.map((i) => i.id)).toContain("catalogo");
    expect(extra.map((i) => i.id)).toContain("clientes");
    expect(extra.map((i) => i.id)).toContain("conversaciones");
  });

  test("cuatro o menos secciones caben todas sin botón Más", () => {
    const cuatro = items(["hoy", "pedidos", "produccion", "reparto"]);
    const { barra, extra } = repartirNavMovil(cuatro, "REPARTO");
    expect(barra).toHaveLength(4);
    expect(extra).toHaveLength(0);
  });
});
