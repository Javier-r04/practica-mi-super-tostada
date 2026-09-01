import { Inject, Injectable } from "@nestjs/common";
import { and, eq } from "drizzle-orm";
import { cliente, organizacion } from "@misupertostada/db";
import {
  TIPO_OUTBOX_INVITACION,
  horaEnZona,
  type Clock,
} from "@misupertostada/shared";
import { CLOCK, DRIZZLE } from "../shared/tokens";
import type { AppDatabase } from "../shared/database.module";
import { OutboxWriter } from "../shared/outbox.writer";
import { BusinessCalendarService } from "../shared/calendar.service";
import { EncryptionService } from "../shared/crypto";

@Injectable()
export class InvitacionJob {
  constructor(
    @Inject(DRIZZLE) private readonly db: AppDatabase,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly calendar: BusinessCalendarService,
    private readonly outbox: OutboxWriter,
    private readonly crypto: EncryptionService,
  ) {}

  async tick(): Promise<number> {
    const now = this.clock.now();
    if (horaEnZona(now) !== "18:00") return 0;

    const orgs = await this.db.select({ id: organizacion.id }).from(organizacion);
    let n = 0;
    for (const { id: organizacionId } of orgs) {
      const cal = await this.calendar.load(organizacionId);
      if (!cal.isVentanaAbierta(now)) continue;
      const fechaOperacion = cal.getFechaOperacion(now);
      const clientes = await this.db
        .select()
        .from(cliente)
        .where(
          and(eq(cliente.activo, true), eq(cliente.organizacionId, organizacionId)),
        );
      for (const cli of clientes) {
        if (!cli.telefonoWa || !cli.tokenPortalCifrado) continue;
        if (!this.crypto.decrypt(cli.tokenPortalCifrado)) continue;
        const row = await this.outbox.insert({
          tipo: TIPO_OUTBOX_INVITACION,
          destinatarioId: cli.id,
          fechaOperacion,
          payload: { clienteId: cli.id, fechaOperacion },
        });
        if (row) n += 1;
      }
    }
    return n;
  }
}
