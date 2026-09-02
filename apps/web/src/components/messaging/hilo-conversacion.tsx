"use client";

import { ScrollShadow } from "@heroui/react";
import {
  fechaDeInstante,
  formatearFechaLarga,
  horaEnZona,
  type ConversacionDetalle,
} from "@misupertostada/shared";
import { useEffect, useRef } from "react";
import { MensajePreview } from "@/components/domain/mensaje-preview";
import { cn } from "@/lib/utils";

export function HiloConversacion({
  conversacion,
  className,
}: {
  conversacion: ConversacionDetalle;
  className?: string;
}) {
  const cajaRef = useRef<HTMLDivElement>(null);
  const total = conversacion.mensajes.length;

  /* El hilo abre por el final: lo último dicho es lo que decide la respuesta. */
  useEffect(() => {
    const caja = cajaRef.current;
    if (caja) caja.scrollTop = caja.scrollHeight;
  }, [total, conversacion.id]);

  if (total === 0) {
    return (
      <p className="bg-[var(--cream-100)] px-4 py-10 text-center text-sm text-tinta-500">
        Todavía no hay mensajes en este hilo.
      </p>
    );
  }

  /* El corte de día se calcula antes de pintar: comparar contra el mensaje
     anterior evita llevar un acumulador vivo dentro del render. */
  const filas = conversacion.mensajes.map((m, i) => {
    const instante = new Date(m.createdAt);
    const dia = String(fechaDeInstante(instante));
    const anterior = conversacion.mensajes[i - 1];
    const diaAnterior = anterior
      ? String(fechaDeInstante(new Date(anterior.createdAt)))
      : null;
    return { m, hora: horaEnZona(instante), dia, abreDia: dia !== diaAnterior };
  });

  return (
    <ScrollShadow
      ref={cajaRef}
      className={cn(
        "max-h-[min(52dvh,460px)] bg-[var(--cream-100)] lg:max-h-[min(52vh,460px)]",
        className,
      )}
    >
      <div className="grid gap-4 px-4 py-4">
        {filas.map(({ m, hora, dia, abreDia }) => {
          return (
            <div key={m.id} className="grid gap-4">
              {abreDia ? (
                <p className="justify-self-center rounded-pill bg-blanco px-3 py-1 text-[11px] font-semibold text-tinta-500 shadow-[var(--shadow-xs)]">
                  {formatearFechaLarga(dia)}
                </p>
              ) : null}

              {m.direction === "INBOUND" ? (
                /* Entrante: burbuja sólida de marca a la derecha, con el rótulo
                   de origen que el saliente ya trae en MensajePreview. Los dos
                   lados se leen igual de rápido. */
                <div className="grid w-full max-w-[min(100%,380px)] gap-1.5 justify-self-end">
                  <span className="mst-label justify-self-end">
                    {conversacion.clienteNombre}
                  </span>
                  <div className="rounded-[14px_14px_4px_14px] bg-[var(--green-800)] p-3 text-sm text-blanco shadow-[var(--shadow-xs)]">
                    <p className="whitespace-pre-wrap leading-relaxed">
                      {m.bodyRenderizado}
                    </p>
                    <p className="mt-1 text-right text-[11px] tabular-nums text-[var(--green-200)]">
                      {hora} · entrante
                    </p>
                  </div>
                </div>
              ) : (
                <MensajePreview
                  tipo={m.tipo === "plantilla" ? "plantilla" : "libre"}
                  plantilla={m.templateName ?? undefined}
                  cuerpo={m.bodyRenderizado ?? ""}
                  adjunto={m.adjuntoNombre ?? undefined}
                  hora={hora}
                  estado={m.status ?? undefined}
                  className={cn(m.status === "failed" && "opacity-80")}
                />
              )}
            </div>
          );
        })}
      </div>
    </ScrollShadow>
  );
}
