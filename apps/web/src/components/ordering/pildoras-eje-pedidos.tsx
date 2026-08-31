import type { CalendarioAhora } from "@misupertostada/shared";
import { VentanaBadge } from "@/components/domain/ventana-badge";
import { ejeDeFecha } from "@/lib/ejes-vista";
import { etiquetaDiaSemanaCorto } from "@/lib/fecha-ui";

const dia = etiquetaDiaSemanaCorto;

const pildoraAcento =
  "inline-flex min-h-7 items-center rounded-pill bg-acento px-3 text-xs font-semibold tabular-nums text-[var(--green-900)]";
const pildoraAmarilla =
  "inline-flex min-h-7 items-center rounded-pill bg-[var(--yellow-200)] px-3 text-xs font-semibold tabular-nums text-[var(--amber-700)]";
const pildoraBorde =
  "inline-flex min-h-7 items-center rounded-pill border border-[var(--yellow-300)]/50 bg-[var(--yellow-100)]/15 px-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--amber-700)]";

/**
 * Píldoras amarillas del eje de pedidos: horario, ventana y entrega.
 * Compartidas entre la bandeja y el diálogo de captura manual.
 */
export function PildorasEjePedidos({
  fecha,
  cal,
}: {
  fecha: string;
  cal: CalendarioAhora;
}) {
  const eje = ejeDeFecha(fecha, cal);
  const horario =
    cal.horarioApertura && cal.horarioCierre
      ? { apertura: cal.horarioApertura, cierre: cal.horarioCierre }
      : null;
  const reabierto = cal.diaEstado === "REABIERTO";

  if (eje === "captura") {
    return (
      <div
        className="flex flex-wrap items-center gap-2"
        aria-label="Contexto de la operación en captura"
      >
        {horario ? (
          <>
            <span className={pildoraAcento}>
              Abre {horario.apertura.slice(0, 5)}
            </span>
            <span className={pildoraAmarilla}>
              Cierra {horario.cierre.slice(0, 5)}
            </span>
            <span className={pildoraBorde}>America/Guatemala</span>
          </>
        ) : null}
        <VentanaBadge
          abierta={cal.ventanaAbierta}
          reabierta={reabierto}
          cierraAt={cal.cierraAt}
          proximaAperturaAt={cal.proximaAperturaAt}
        />
        <span className={pildoraBorde}>
          Entrega {dia(cal.fechaEntregaCaptura)}
        </span>
      </div>
    );
  }

  if (eje === "curso") {
    return (
      <div
        className="flex flex-wrap items-center gap-2"
        aria-label="Contexto de la operación en curso"
      >
        <span className={pildoraBorde}>
          Entrega {dia(cal.fechaEntregaEnCurso)}
        </span>
        {!cal.mismaOperacion && cal.ventanaAbierta ? (
          <span className={pildoraAmarilla}>
            Captura en {dia(cal.fechaOperacionCaptura)}
          </span>
        ) : null}
      </div>
    );
  }

  return null;
}
