import { Global, Module } from "@nestjs/common";
import { APP_FILTER } from "@nestjs/core";
import { loadEnv, r2Configured } from "../../config/env";
import { BusinessCalendarService, clockProvider } from "./calendar.service";
import { DatabaseModule } from "./database.module";
import { DomainExceptionFilter } from "./domain-exception.filter";
import { CalendarioController } from "./calendario.controller";
import { AuditWriter } from "./audit.writer";
import { AuditReader } from "./audit.reader";
import { AuditController } from "./audit.controller";
import { ConfiguracionService } from "./configuracion.service";
import { ConfiguracionController } from "./configuracion.controller";
import { OutboxWriter } from "./outbox.writer";
import { OutboxProcessor } from "./outbox.processor";
import { OUTBOX_DISPATCHER, OutboxDispatcherRegistry } from "./outbox.dispatcher";
import { DomainEventWriter } from "./domain-event.writer";
import { PedidoEvents } from "./panel-events";
import { PgBossService } from "./pgboss.service";
import { CLOCK, STORAGE_PORT } from "./tokens";
import { FakeStorageAdapter } from "./storage/fake.storage";
import { R2StorageAdapter } from "./storage/r2.storage";
import { AssetVariantsJob } from "./storage/variants.job";
import { AssetsService } from "./storage/assets.service";
import { AssetsController } from "./storage/assets.controller";
import { EncryptionService } from "./crypto";

@Global()
@Module({
  imports: [DatabaseModule],
  controllers: [
    AssetsController,
    CalendarioController,
    AuditController,
    ConfiguracionController,
  ],
  providers: [
    clockProvider,
    BusinessCalendarService,
    OutboxWriter,
    OutboxProcessor,
    OutboxDispatcherRegistry,
    { provide: OUTBOX_DISPATCHER, useExisting: OutboxDispatcherRegistry },
    AuditWriter,
    AuditReader,
    ConfiguracionService,
    DomainEventWriter,
    PedidoEvents,
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
    EncryptionService,
  ],
  exports: [
    DatabaseModule,
    CLOCK,
    BusinessCalendarService,
    OutboxWriter,
    OutboxProcessor,
    OutboxDispatcherRegistry,
    OUTBOX_DISPATCHER,
    AuditWriter,
    DomainEventWriter,
    PedidoEvents,
    STORAGE_PORT,
    AssetVariantsJob,
    AssetsService,
    PgBossService,
    EncryptionService,
  ],
})
export class SharedModule {}
