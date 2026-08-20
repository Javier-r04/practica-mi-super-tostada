import { ROLES, type Rol } from "./estados";

export const PERMISOS = [
  "precios.cambiar",
  "catalogo.escribir",
  "pedidos.capturar_manual",
  "cobranza.registrar_pago",
  "usuarios.gestionar",
  "permisos.delegar",
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
    "cobranza.registrar_pago",
  ],
  PRODUCCION: [],
  TIENDA: ["pedidos.capturar_manual"],
  REPARTO: ["cobranza.registrar_pago"],
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
  "cobranza.registrar_pago": "Registrar cobros y abonos",
  "usuarios.gestionar": "Crear y desactivar cuentas internas",
  "permisos.delegar": "Delegar permisos granulares",
  "ventana.reabrir": "Reabrir un día de operación cerrado",
};

export const ROLES_CONOCIDOS = ROLES;
