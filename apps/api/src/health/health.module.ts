import { Module } from "@nestjs/common";
import { HealthController } from "./health.controller";
import { SharedModule } from "../modules/shared/shared.module";

@Module({
  imports: [SharedModule],
  controllers: [HealthController],
})
export class HealthModule {}
