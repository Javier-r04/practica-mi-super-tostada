import type { PermisoCodigo } from "@misupertostada/shared";
import type { Rol } from "@misupertostada/shared";

export type Actor = {
  usuarioId: string;
  organizacionId: string;
  username: string;
  rol: Rol;
  permisos: PermisoCodigo[];
  sesionId: string;
  ip: string | null;
  userAgent: string | null;
};

export type SessionCookieConfig = {
  name: string;
  ttlSeconds: number;
  secure: boolean;
};

export const SESSION_COOKIE_CONFIG = Symbol("SESSION_COOKIE_CONFIG");
