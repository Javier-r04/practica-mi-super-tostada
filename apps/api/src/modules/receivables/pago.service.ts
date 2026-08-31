import { Inject, Injectable } from "@nestjs/common";
import type {
  AbonoRegistroResultado,
  PagoRegistroResultado,
} from "@misupertostada/shared";
import type { Actor } from "../identity/actor";
import { AbonoService } from "./abono.service";

/** Mantiene la ruta POST /pagos; delega en AbonoService. */
@Injectable()
export class PagoService {
  constructor(private readonly abonos: AbonoService) {}

  async registrar(body: unknown, actor: Actor): Promise<PagoRegistroResultado> {
    const r = await this.abonos.registrarConfirmado(body, actor);
    return {
      idempotente: r.idempotente,
      pagos: r.pagos ?? [],
      facturas: r.facturas ?? [],
    };
  }
}
