import { Inject, Injectable } from "@nestjs/common";
import {
  createBusinessCalendar,
  systemClock,
  ventanaDesdeHoras,
  type BusinessCalendar,
  type Clock,
} from "@misupertostada/shared";
import { diaNoLaborable, organizacion } from "@misupertostada/db";
import { CLOCK, DRIZZLE } from "./tokens";
import type { AppDatabase } from "./database.module";

@Injectable()
export class BusinessCalendarService {
  constructor(
    @Inject(DRIZZLE) private readonly db: AppDatabase,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  now(): Date {
    return this.clock.now();
  }

  async load(): Promise<BusinessCalendar> {
    const feriados = await this.db
      .select({ fecha: diaNoLaborable.fecha })
      .from(diaNoLaborable);
    const [org] = await this.db.select().from(organizacion).limit(1);

    return createBusinessCalendar({
      diasNoLaborables: feriados.map((f) => f.fecha),
      ventana: org
        ? ventanaDesdeHoras(org.ventanaApertura, org.ventanaCierre)
        : undefined,
    });
  }
}

export const clockProvider = {
  provide: CLOCK,
  useValue: systemClock,
};
