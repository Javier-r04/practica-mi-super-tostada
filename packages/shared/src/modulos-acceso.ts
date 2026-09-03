import type { PermisoCodigo } from "./permisos";

/**
 * Módulos del panel que Admin jefe otorga enteros.
 *
 * Un módulo = entrada en el menú + las acciones de escritura de esa pantalla.
 * No hay permisos a medias: o lo ve (y puede actuar en lo que el módulo
 * permite) o no aparece. Los poderes de administración de cuentas
 * (`usuarios.gestionar`, etc.) siguen ligados al puesto ADMIN_JEFE.
 */
export const MODULOS_ACCESO = [
  {
    id: "hoy",
    etiqueta: "Hoy",
    descripcion: "Estado del día y cierre de ventana",
    ver: "panel.hoy",
    escrituras: ["ventana.cerrar"],
    secciones: ["hoy"],
  },
  {
    id: "tablero",
    etiqueta: "Tablero",
    descripcion: "Resumen y métricas del negocio",
    ver: "panel.tablero",
    escrituras: [],
    secciones: ["tablero"],
  },
  {
    id: "pedidos",
    etiqueta: "Pedidos",
    descripcion: "Lista del día y captura manual",
    ver: "panel.pedidos",
    escrituras: ["pedidos.capturar_manual"],
    secciones: ["pedidos"],
  },
  {
    id: "produccion",
    etiqueta: "Producción",
    descripcion: "Hoja consolidada para planta",
    ver: "panel.produccion",
    escrituras: [],
    secciones: ["produccion"],
  },
  {
    id: "reparto",
    etiqueta: "Reparto",
    descripcion: "Ruta, entrega y cobro en puerta",
    ver: "panel.reparto",
    escrituras: ["pedidos.entregar"],
    secciones: ["reparto"],
  },
  {
    id: "cartera",
    etiqueta: "Cartera",
    descripcion: "Facturas, DTE, pagos y abonos",
    ver: "panel.cartera",
    escrituras: [
      "cobranza.registrar_pago",
      "cobranza.capturar_dte",
      "cobranza.confirmar_transferencia",
    ],
    secciones: ["cartera"],
  },
  {
    id: "conversaciones",
    etiqueta: "Conversaciones",
    descripcion: "WhatsApp con clientes",
    ver: "panel.conversaciones",
    escrituras: ["mensajeria.enviar"],
    secciones: ["conversaciones"],
  },
  {
    id: "catalogo",
    etiqueta: "Catálogo y clientes",
    descripcion: "Productos, precios y fichas de cliente",
    ver: "panel.catalogo",
    escrituras: ["catalogo.escribir", "precios.cambiar"],
    secciones: ["catalogo", "clientes"],
  },
] as const;

export type ModuloAccesoId = (typeof MODULOS_ACCESO)[number]["id"];

/** Tupla no vacía para `z.enum`. */
export const MODULO_IDS: [ModuloAccesoId, ...ModuloAccesoId[]] = [
  MODULOS_ACCESO[0].id,
  ...MODULOS_ACCESO.slice(1).map((m) => m.id),
];

export function esModuloAccesoId(value: string): value is ModuloAccesoId {
  return (MODULO_IDS as readonly string[]).includes(value);
}

export function moduloPorId(
  id: ModuloAccesoId,
): (typeof MODULOS_ACCESO)[number] {
  const found = MODULOS_ACCESO.find((m) => m.id === id);
  if (!found) {
    throw new Error(`Módulo desconocido: ${id}`);
  }
  return found;
}

/** Todos los códigos que se otorgan o quitan al togglear el módulo. */
export function permisosDelModulo(id: ModuloAccesoId): PermisoCodigo[] {
  const m = moduloPorId(id);
  return [m.ver, ...m.escrituras];
}

/** El usuario tiene el módulo si tiene el permiso de verlo. */
export function tieneModulo(
  permisos: readonly PermisoCodigo[],
  id: ModuloAccesoId,
): boolean {
  const m = moduloPorId(id);
  return permisos.includes(m.ver);
}

/** Módulos que el usuario tiene activos (por permiso `panel.*`). */
export function modulosDePermisos(
  permisos: readonly PermisoCodigo[],
): ModuloAccesoId[] {
  return MODULOS_ACCESO.filter((m) => permisos.includes(m.ver)).map((m) => m.id);
}
