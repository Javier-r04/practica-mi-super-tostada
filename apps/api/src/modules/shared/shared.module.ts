import { Global, Module } from "@nestjs/common";
import { APP_FILTER } from "@nestjs/core";
import { loadEnv, r2Configured } from "../../config/env";
import { BusinessCalendarService, clockProvider } from "./calendar.service";
import { DatabaseModule } from "./database.module";
import { DomainExceptionFilter } from "./domain-exception.filter";
import { AuditWriter } from "./audit.writer";
import { OutboxWriter } from "./outbox.writer";
import { OutboxProcessor } from "./outbox.processor";
import { NullOutboxDispatcher, OUTBOX_DISPATCHER } from "./outbox.dispatcher";
import { PgBossService } from "./pgboss.service";
import { CLOCK, STORAGE_PORT } from "./tokens";
import { FakeStorageAdapter } from "./storage/fake.storage";
import { R2StorageAdapter } from "./storage/r2.storage";
import { AssetVariantsJob } from "./storage/variants.job";
import { AssetsService } from "./storage/assets.service";
import { AssetsController } from "./storage/assets.controller";
import { CalendarioController } from "./calendario.controller";

@Global()
@Module({
  imports: [DatabaseModule],
  controllers: [AssetsController, CalendarioController],
  providers: [
    clockProvider,
    BusinessCalendarService,
    OutboxWriter,
    OutboxProcessor,
    { provide: OUTBOX_DISPATCHER, useClass: NullOutboxDispatcher },
    AuditWriter,
    { provide: APP_FILTER, useClass: DomainExceptionFilter },
    FakeStorageAdapter,
    {
      provide: STORAGE_PORT,
      inject: [FakeStorageAdapter],
      useFactory: (fake: FakeStorageAdapter) => {
        const env = loadEnv();
        return r2Configured(env) ? new R2StorageAdapter(env) : fake;
      },
    },
    AssetVariantsJob,
    AssetsService,
    PgBossService,
  ],
  exports: [
    DatabaseModule,
    CLOCK,
    BusinessCalendarService,
    OutboxWriter,
    OutboxProcessor,
    AuditWriter,
    STORAGE_PORT,
    AssetVariantsJob,
    AssetsService,
    PgBossService,
  ],
})
export class SharedModule {}
