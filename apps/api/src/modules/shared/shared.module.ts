import { Global, Module } from "@nestjs/common";
import { APP_FILTER } from "@nestjs/core";
import { BusinessCalendarService, clockProvider } from "./calendar.service";
import { DatabaseModule } from "./database.module";
import { DomainExceptionFilter } from "./domain-exception.filter";
import { AuditWriter } from "./audit.writer";
import { OutboxWriter } from "./outbox.writer";
import { CLOCK } from "./tokens";

@Global()
@Module({
  imports: [DatabaseModule],
  providers: [
    clockProvider,
    BusinessCalendarService,
    OutboxWriter,
    AuditWriter,
    { provide: APP_FILTER, useClass: DomainExceptionFilter },
  ],
  exports: [
    DatabaseModule,
    CLOCK,
    BusinessCalendarService,
    OutboxWriter,
    AuditWriter,
  ],
})
export class SharedModule {}
