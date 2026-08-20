import type { AppDatabase } from "../shared/database.module";
import type { FacturaPublica } from "@misupertostada/shared";

export const FACTURA_AL_ENTREGAR = Symbol("FACTURA_AL_ENTREGAR");

export type FacturaAlEntregarInput = {
  pedidoId: string;
  montoCentavos: number;
};

export type FacturaAlEntregarResultado = {
  id: string;
  montoCentavos: number;
  idempotente: boolean;
};

/** Port: fulfillment no importa FacturaService por nombre de clase. */
export interface FacturaAlEntregar {
  crearEnTx(
    tx: AppDatabase,
    input: FacturaAlEntregarInput,
  ): Promise<FacturaAlEntregarResultado>;
  presentar(facturaId: string, tx?: AppDatabase): Promise<FacturaPublica>;
}
