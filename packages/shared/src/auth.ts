import { z } from "zod";
import { ROLES } from "./estados";
import { MODULO_IDS } from "./modulos-acceso";
import { PERMISOS } from "./permisos";

/** Login interno: usuario corto, no correo. */
export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3)
  .max(32)
  .regex(
    /^[a-z][a-z0-9._-]*$/,
    "Use letras, números, punto, guion o guion bajo; empiece con letra",
  );

export const loginRequestSchema = z.object({
  username: usernameSchema,
  password: z.string().min(1).max(200),
});

export type LoginRequest = z.infer<typeof loginRequestSchema>;

export const crearUsuarioRequestSchema = z.object({
  username: usernameSchema,
  password: z.string().min(10).max(200),
  /** Puesto: fija ADMIN_JEFE y el orden del menú móvil; no otorga módulos. */
  rol: z.enum(ROLES),
  /** Módulos que se siembran al crear. Ignorado si el rol es ADMIN_JEFE. */
  modulos: z.array(z.enum(MODULO_IDS)).optional(),
});

export type CrearUsuarioRequest = z.infer<typeof crearUsuarioRequestSchema>;

export const delegarPermisoRequestSchema = z.object({
  codigo: z.enum(PERMISOS),
  granted: z.boolean(),
});

export type DelegarPermisoRequest = z.infer<typeof delegarPermisoRequestSchema>;

export const delegarModuloRequestSchema = z.object({
  modulo: z.enum(MODULO_IDS),
  granted: z.boolean(),
});

export type DelegarModuloRequest = z.infer<typeof delegarModuloRequestSchema>;

export const actorPublicoSchema = z.object({
  id: z.string().uuid(),
  username: z.string().min(1),
  rol: z.enum(ROLES),
  permisos: z.array(z.enum(PERMISOS)),
  organizacionId: z.string().uuid(),
  activo: z.boolean(),
});

export type ActorPublico = z.infer<typeof actorPublicoSchema>;

export const activarUsuarioRequestSchema = z.object({
  activo: z.boolean(),
});

export type ActivarUsuarioRequest = z.infer<typeof activarUsuarioRequestSchema>;

export const resetPasswordRequestSchema = z.object({
  password: z.string().min(10).max(200),
});

export type ResetPasswordRequest = z.infer<typeof resetPasswordRequestSchema>;

export const cambiarRolRequestSchema = z.object({
  rol: z.enum(ROLES),
});

export type CambiarRolRequest = z.infer<typeof cambiarRolRequestSchema>;
