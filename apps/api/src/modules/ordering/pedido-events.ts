import { Injectable } from "@nestjs/common";
import { Observable, Subject, filter, interval, map, merge } from "rxjs";
import {
  pedidoSseEventSchema,
  type PedidoSseEvent,
} from "@misupertostada/shared";

type PedidoEventoInterno = PedidoSseEvent & { organizacionId: string };

/**
 * Bus in-process de pedidos. Una instancia de API; sin Redis.
 * `observe` es para tests; `stream` alimenta `@Sse()`.
 */
@Injectable()
export class PedidoEvents {
  private readonly subject = new Subject<PedidoEventoInterno>();

  emit(evento: PedidoEventoInterno): void {
    this.subject.next(evento);
  }

  observe(organizacionId: string): Observable<PedidoSseEvent> {
    return this.subject.pipe(
      filter((e) => e.organizacionId === organizacionId),
      map(({ organizacionId: _org, ...evento }) =>
        pedidoSseEventSchema.parse(evento),
      ),
    );
  }

  stream(
    organizacionId: string,
  ): Observable<{ data: PedidoSseEvent | { tipo: "heartbeat" } }> {
    const eventos = this.observe(organizacionId).pipe(map((data) => ({ data })));
    const latido = interval(25_000).pipe(
      map(() => ({ data: { tipo: "heartbeat" as const } })),
    );
    return merge(eventos, latido);
  }
}
