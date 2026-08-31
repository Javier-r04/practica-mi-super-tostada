import type { AppDatabase } from "../shared/database.module";
import type { AbonoPublico, PortalCuenta } from "@misupertostada/shared";

export const ABONO_PORTAL = Symbol("ABONO_PORTAL");

export type AbonoPortalMeta = {
  ip: string | null;
  userAgent: string | null;
};

/** Port: ordering no importa AbonoService por nombre de clase. */
export interface AbonoPortal {
  cuentaDe(clienteId: string, organizacionId: string): Promise<PortalCuenta>;
  reportarTransferencia(
    clienteId: string,
    organizacionId: string,
    body: unknown,
    meta: AbonoPortalMeta,
  ): Promise<AbonoPublico>;
}
