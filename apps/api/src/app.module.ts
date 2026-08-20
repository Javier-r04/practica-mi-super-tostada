import { Module } from "@nestjs/common";
import { LoggerModule } from "nestjs-pino";
import { HealthModule } from "./health/health.module";
import { SharedModule } from "./modules/shared/shared.module";
import { IdentityModule } from "./modules/identity/identity.module";
import { CatalogModule } from "./modules/catalog/catalog.module";
import { OrderingModule } from "./modules/ordering/ordering.module";
import { FulfillmentModule } from "./modules/fulfillment/fulfillment.module";
import { ReceivablesModule } from "./modules/receivables/receivables.module";
import { MessagingModule } from "./modules/messaging/messaging.module";
import { AnalyticsModule } from "./modules/analytics/analytics.module";

@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.NODE_ENV === "production" ? "info" : "debug",
        redact: [
          "req.headers.authorization",
          "req.headers.cookie",
          "req.headers['x-portal-token']",
        ],
        transport:
          process.env.NODE_ENV === "production"
            ? undefined
            : { target: "pino-pretty", options: { singleLine: true } },
      },
    }),
    SharedModule,
    HealthModule,
    IdentityModule,
    CatalogModule,
    OrderingModule,
    FulfillmentModule,
    ReceivablesModule,
    MessagingModule,
    AnalyticsModule,
  ],
})
export class AppModule {}
