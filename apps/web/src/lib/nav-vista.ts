import type { PermisoCodigo } from "@misupertostada/shared";
import { tienePermiso } from "@misupertostada/shared";

export const SECCIONES_PANEL = [
  "hoy",
  "tablero",
  "pedidos",
  "produccion",
  "reparto",
  "cartera",
  "conversaciones",
  "catalogo",
  "clientes",
] as const;

export type SeccionPanel = (typeof SECCIONES_PANEL)[number];

/**
 * Permisos que hacen **visible** una sección. `null` = la ve cualquier usuario
 * autenticado.
 *
 * El núcleo operativo —Hoy, Tablero, Pedidos, Producción, Reparto, Cartera— no
 * pide permiso: es la misma jornada vista desde distintos oficios y el backend
 * no restringe ningún GET de esas pantallas. Ocultarlas por permiso de
 * *escritura* dejaba a Producción sin poder mirar la cartera que la API ya le
 * servía, justo lo contrario de F-403 («misma información, distintas
 * acciones»).
 *
 * Catálogo, Clientes y Conversaciones sí se ocultan: no son la jornada, y
 * Conversaciones además expone historial de WhatsApp.
 */
export const PERMISOS_SECCION: Record<
  SeccionPanel,
  readonly PermisoCodigo[] | null
> = {
  hoy: null,
  tablero: null,
  pedidos: null,
  produccion: null,
  reparto: null,
  cartera: null,
  conversaciones: ["mensajeria.enviar", "mensajeria.conectar"],
  catalogo: ["catalogo.escribir", "precios.cambiar"],
  clientes: ["catalogo.escribir", "precios.cambiar"],
};

/**
 * Permisos de escritura de cada sección: lo que hace falta para que algún botón
 * de acción se habilite. Sin ninguno, la pantalla es de solo lectura y hay que
 * decirlo —si no, Alex ve una pantalla sin botones y cree que algo falló.
 *
 * Vacío = la sección no tiene escrituras para nadie (Producción y Tablero solo
 * leen y exportan).
 */
export const ESCRITURAS_POR_SECCION: Record<
  SeccionPanel,
  readonly PermisoCodigo[]
> = {
  hoy: ["ventana.cerrar", "ventana.reabrir", "pedidos.capturar_manual"],
  tablero: [],
  pedidos: ["pedidos.capturar_manual"],
  produccion: [],
  reparto: ["pedidos.entregar", "cobranza.registrar_pago"],
  cartera: [
    "cobranza.registrar_pago",
    "cobranza.capturar_dte",
    "mensajeria.enviar",
  ],
  conversaciones: ["mensajeria.enviar", "mensajeria.conectar"],
  catalogo: ["catalogo.escribir", "precios.cambiar"],
  clientes: ["catalogo.escribir", "precios.cambiar"],
};

export function seccionVisible(
  seccion: SeccionPanel,
  permisos: readonly PermisoCodigo[],
): boolean {
  const requeridos = PERMISOS_SECCION[seccion];
  if (!requeridos) return true;
  return requeridos.some((codigo) => tienePermiso(permisos, codigo));
}

/**
 * `true` cuando el usuario ve la sección pero no puede escribir nada en ella.
 * Las secciones sin escrituras (Tablero, Producción) nunca lo son: nadie tiene
 * botones ahí, así que el aviso sobraría.
 */
export function esSoloLectura(
  seccion: SeccionPanel,
  permisos: readonly PermisoCodigo[],
): boolean {
  const escrituras = ESCRITURAS_POR_SECCION[seccion];
  if (escrituras.length === 0) return false;
  return !escrituras.some((codigo) => tienePermiso(permisos, codigo));
}
