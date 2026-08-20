"use client";

import { horaEnZona, type ConversacionDetalle } from "@misupertostada/shared";
import { MensajePreview } from "@/components/domain/mensaje-preview";
import { cn } from "@/lib/utils";

export function HiloConversacion({
  conversacion,
}: {
  conversacion: ConversacionDetalle;
}) {
  if (conversacion.mensajes.length === 0) {
    return (
      <p className="px-4 py-8 text-center text-sm text-tinta-500">
        Todavía no hay mensajes en este hilo.
      </p>
    );
  }
  return (
    <div className="grid gap-4 bg-[var(--cream-100)] px-4 py-4">
      {conversacion.mensajes.map((m) => {
        const hora = horaEnZona(new Date(m.createdAt));
        if (m.direction === "INBOUND") {
          return (
            <div
              key={m.id}
              className="max-w-[380px] justify-self-end rounded-[14px_14px_4px_14px] bg-[var(--green-800)] p-3 text-sm text-blanco"
            >
              <p className="whitespace-pre-wrap leading-relaxed">
                {m.bodyRenderizado}
              </p>
              <p className="mt-1 text-right text-[11px] text-[var(--green-200)]">
                {hora} · entrante
              </p>
            </div>
          );
        }
        return (
          <MensajePreview
            key={m.id}
            tipo={m.tipo === "plantilla" ? "plantilla" : "libre"}
            plantilla={m.templateName ?? undefined}
            cuerpo={m.bodyRenderizado ?? ""}
            adjunto={m.adjuntoNombre ?? undefined}
            hora={hora}
            estado={m.status ?? undefined}
            className={cn(m.status === "failed" && "opacity-80")}
          />
        );
      })}
    </div>
  );
}
