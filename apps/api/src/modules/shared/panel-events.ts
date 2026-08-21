import { Injectable, Logger } from "@nestjs/common";
import { Observable, Subject, filter, map, merge, tap, timer } from "rxjs";
import {
  panelSseEventSchema,
  type PanelSseEvent,
} from "@misupertostada/shared";

type EventoInterno = PanelSseEvent & { organizacionId: string };

/**
 * Bus in-process del panel. Una instancia de API; sin Redis.
 * Lo usan pedidos, operación diaria, cobranza y mensajería.
 */
@Injectable()
export class PedidoEvents {
  private readonly logger = new Logger(PedidoEvents.name);
  private readonly subject = new Subject<EventoInterno>();

  emit(evento: EventoInterno): void {
    this.subject.next(evento);
  }

  observe(organizacionId: string): Observable<PanelSseEvent> {
    return this.subject.pipe(
      filter((e) => e.organizacionId === organizacionId),
      map(({ organizacionId: _org, ...evento }) =>
        panelSseEventSchema.safeParse(evento),
      ),
      tap((parsed) => {
        if (!parsed.success) {
          this.logger.warn("evento de panel inválido, se descarta");
        }
      }),
      filter(
        (parsed): parsed is { success: true; data: PanelSseEvent } =>
          parsed.success,
      ),
      map((parsed) => parsed.data),
    );
  }

  stream(
    organizacionId: string,
  ): Observable<{ data: PanelSseEvent | { tipo: "heartbeat" } }> {
    const eventos = this.observe(organizacionId).pipe(map((data) => ({ data })));
    const latido = timer(0, 25_000).pipe(
      map(() => ({ data: { tipo: "heartbeat" as const } })),
    );
    return merge(eventos, latido);
  }
}
