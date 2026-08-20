import {
  CanActivate,
  ExecutionContext,
  Injectable,
  SetMetadata,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import {
  tienePermiso,
  type PermisoCodigo,
} from "@misupertostada/shared";
import { DomainException } from "../shared/domain.exception";
import type { RequestWithActor } from "./session.guard";

export const REQUIERE_PERMISO = "requierePermiso";

export const RequierePermiso = (...codigos: PermisoCodigo[]) =>
  SetMetadata(REQUIERE_PERMISO, codigos);

@Injectable()
export class PermisosGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const needed = this.reflector.getAllAndOverride<PermisoCodigo[]>(
      REQUIERE_PERMISO,
      [context.getHandler(), context.getClass()],
    );
    if (!needed?.length) return true;

    const req = context.switchToHttp().getRequest<RequestWithActor>();
    const actor = req.actor;
    if (!actor) {
      throw new DomainException("SESION_REQUERIDA", "Inicie sesión", 401);
    }
    const ok = needed.every((codigo) => tienePermiso(actor.permisos, codigo));
    if (!ok) {
      throw new DomainException(
        "PERMISO_DENEGADO",
        "No tiene permiso para esta acción",
        403,
      );
    }
    return true;
  }
}
