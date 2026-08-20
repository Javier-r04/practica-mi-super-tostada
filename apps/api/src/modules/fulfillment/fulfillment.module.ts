import { Module } from "@nestjs/common";
import { CierreService } from "./cierre.service";
import { HojaService } from "./hoja.service";
import { CierreJob } from "./cierre.job";
import { OperacionController, HojasController } from "./operacion.controller";
import { EntregaService } from "./entrega.service";
import { EntregaController } from "./entrega.controller";
import { ReceivablesModule } from "../receivables/receivables.module";

@Module({
  imports: [ReceivablesModule],
  controllers: [OperacionController, HojasController, EntregaController],
  providers: [HojaService, CierreService, CierreJob, EntregaService],
  exports: [CierreService, HojaService, EntregaService],
})
export class FulfillmentModule {}
