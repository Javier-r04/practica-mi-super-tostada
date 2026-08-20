import { Inject, Injectable } from "@nestjs/common";
import { eq } from "drizzle-orm";
import { cliente } from "@misupertostada/db";
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
    const cal = await this.calendar.load();
    if (!cal.isVentanaAbierta(now)) return 0;
    const fechaOperacion = cal.getFechaOperacion(now);
    const clientes = await this.db
      .select()
      .from(cliente)
      .where(eq(cliente.activo, true));
    let n = 0;
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
    return n;
  }
}
