import { ROLES, type Rol } from "./estados";

export const PERMISOS = [
  "precios.cambiar",
  "catalogo.escribir",
  "pedidos.capturar_manual",
  "pedidos.entregar",
  "cobranza.registrar_pago",
  "cobranza.capturar_dte",
  "usuarios.gestionar",
  "permisos.delegar",
  "ventana.cerrar",
  "ventana.reabrir",
] as const;

export type PermisoCodigo = (typeof PERMISOS)[number];

/** No se pueden otorgar por API, aunque el actor sea ADMIN_JEFE. Van con el rol. */
export const PERMISOS_NO_DELEGABLES = [
  "usuarios.gestionar",
  "permisos.delegar",
  "ventana.reabrir",
] as const;

export type PermisoNoDelegable = (typeof PERMISOS_NO_DELEGABLES)[number];

export const ROL_PERMISOS: Record<Rol, readonly PermisoCodigo[]> = {
  ADMIN_JEFE: PERMISOS,
  ADMIN: [
    "catalogo.escribir",
    "pedidos.capturar_manual",
    "pedidos.entregar",
    "cobranza.registrar_pago",
    "cobranza.capturar_dte",
    "ventana.cerrar",
  ],
  PRODUCCION: [],
  TIENDA: [
    "pedidos.capturar_manual",
    "pedidos.entregar",
    "cobranza.capturar_dte",
    "cobranza.registrar_pago",
  ],
  REPARTO: ["pedidos.entregar", "cobranza.registrar_pago"],
};

export function esPermisoCodigo(value: string): value is PermisoCodigo {
  return (PERMISOS as readonly string[]).includes(value);
}

export function esNoDelegable(codigo: PermisoCodigo): boolean {
  return (PERMISOS_NO_DELEGABLES as readonly string[]).includes(codigo);
}

export function permisosEfectivos(
  rol: Rol,
  extras: readonly PermisoCodigo[] = [],
): PermisoCodigo[] {
  const set = new Set<PermisoCodigo>(ROL_PERMISOS[rol]);
  for (const extra of extras) {
    set.add(extra);
  }
  return PERMISOS.filter((codigo) => set.has(codigo));
}

export function tienePermiso(
  efectivos: readonly PermisoCodigo[],
  codigo: PermisoCodigo,
): boolean {
  return efectivos.includes(codigo);
}

export function puedeDelegar(actorRol: Rol, codigo: PermisoCodigo): boolean {
  return actorRol === "ADMIN_JEFE" && !esNoDelegable(codigo);
}

export const PERMISO_DESCRIPCION: Record<PermisoCodigo, string> = {
  "precios.cambiar": "Cambiar precios por cliente",
  "catalogo.escribir": "Crear y editar productos y clientes",
  "pedidos.capturar_manual": "Capturar pedidos recibidos por llamada",
  "pedidos.entregar": "Marcar un pedido como entregado y ajustar cantidades",
  "cobranza.registrar_pago": "Registrar cobros y abonos",
  "cobranza.capturar_dte": "Registrar el número de DTE del sistema externo",
  "usuarios.gestionar": "Crear y desactivar cuentas internas",
  "permisos.delegar": "Delegar permisos granulares",
  "ventana.cerrar": "Cerrar la ventana y generar la hoja de producción",
  "ventana.reabrir": "Reabrir un día de operación cerrado",
};

export const ROLES_CONOCIDOS = ROLES;
