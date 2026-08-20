import { Injectable } from "@nestjs/common";
import { Observable, Subject, filter, interval, map, merge } from "rxjs";
import {
  panelSseEventSchema,
  type PanelSseEvent,
} from "@misupertostada/shared";

type EventoInterno = PanelSseEvent & { organizacionId: string };

/**
 * Bus in-process del panel. Una instancia de API; sin Redis.
 * Lo usan pedidos (E3) y operación diaria (E4).
 */
@Injectable()
export class PedidoEvents {
  private readonly subject = new Subject<EventoInterno>();

  emit(evento: EventoInterno): void {
    this.subject.next(evento);
  }

  observe(organizacionId: string): Observable<PanelSseEvent> {
    return this.subject.pipe(
      filter((e) => e.organizacionId === organizacionId),
      map(({ organizacionId: _org, ...evento }) =>
        panelSseEventSchema.parse(evento),
      ),
    );
  }

  stream(
    organizacionId: string,
  ): Observable<{ data: PanelSseEvent | { tipo: "heartbeat" } }> {
    const eventos = this.observe(organizacionId).pipe(map((data) => ({ data })));
    const latido = interval(25_000).pipe(
      map(() => ({ data: { tipo: "heartbeat" as const } })),
    );
    return merge(eventos, latido);
  }
}
