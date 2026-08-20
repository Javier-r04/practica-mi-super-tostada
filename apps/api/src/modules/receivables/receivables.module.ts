import { Module } from "@nestjs/common";
import { FacturaService, FACTURA_AL_ENTREGAR } from "./factura.service";
import { PagoService } from "./pago.service";
import { CarteraService } from "./cartera.service";
import { ReceivablesController } from "./receivables.controller";

@Module({
  controllers: [ReceivablesController],
  providers: [
    FacturaService,
    PagoService,
    CarteraService,
    { provide: FACTURA_AL_ENTREGAR, useExisting: FacturaService },
  ],
  exports: [FACTURA_AL_ENTREGAR, FacturaService, PagoService, CarteraService],
})
export class ReceivablesModule {}
