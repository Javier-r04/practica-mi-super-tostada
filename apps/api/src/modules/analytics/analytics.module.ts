import { Module } from "@nestjs/common";
import { AnalyticsController } from "./analytics.controller";
import { TableroService } from "./tablero.service";

@Module({
  controllers: [AnalyticsController],
  providers: [TableroService],
})
export class AnalyticsModule {}
