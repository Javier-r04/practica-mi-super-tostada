import { Injectable, type OnModuleInit } from "@nestjs/common";
import { PgBossService } from "../shared/pgboss.service";
import { CierreService } from "./cierre.service";

export const COLA_CERRAR_VENTANA = "operacion.cerrar-ventana";

@Injectable()
export class CierreJob implements OnModuleInit {
  constructor(
    private readonly boss: PgBossService,
    private readonly cierre: CierreService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.boss.registerIntervalJob(
      COLA_CERRAR_VENTANA,
      60_000,
      () => this.cierre.cerrarSiToca(),
    );
  }
}
