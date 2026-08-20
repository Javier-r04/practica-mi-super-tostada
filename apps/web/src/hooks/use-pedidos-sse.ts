"use client";

import { useQueryClient } from "@tanstack/react-query";
import { panelSseEventSchema } from "@misupertostada/shared";
import { useEffect, useRef } from "react";
import { API_URL } from "@/lib/api";

/**
 * EventSource sobre la cookie de sesión. Reconecta con backoff.
 * Cada evento de panel invalida pedidos, hoja, operación, cartera y ruta.
 */
export function usePedidosSse(activo: boolean): void {
  const qc = useQueryClient();
  const delayRef = useRef(1000);

  useEffect(() => {
    if (!activo) return;
    let source: EventSource | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let stopped = false;

    function conectar() {
      if (stopped) return;
      source = new EventSource(`${API_URL}/pedidos/stream`, {
        withCredentials: true,
      });
      source.onmessage = (msg) => {
        delayRef.current = 1000;
        try {
          const parsed: unknown = JSON.parse(msg.data);
          if (
            parsed &&
            typeof parsed === "object" &&
            "tipo" in parsed &&
            parsed.tipo === "heartbeat"
          ) {
            return;
          }
          if (panelSseEventSchema.safeParse(parsed).success) {
            void qc.invalidateQueries({ queryKey: ["pedidos"] });
            void qc.invalidateQueries({ queryKey: ["hoja"] });
            void qc.invalidateQueries({ queryKey: ["operacion"] });
            void qc.invalidateQueries({ queryKey: ["calendario"] });
            void qc.invalidateQueries({ queryKey: ["cartera"] });
            void qc.invalidateQueries({ queryKey: ["ruta"] });
            void qc.invalidateQueries({ queryKey: ["cuadre"] });
          }
        } catch {
          /* payload ilegible: se ignora, no se tumba la suscripción */
        }
      };
      source.onerror = () => {
        source?.close();
        source = null;
        if (stopped) return;
        timer = setTimeout(conectar, delayRef.current);
        delayRef.current = Math.min(delayRef.current * 2, 15_000);
      };
    }

    conectar();
    return () => {
      stopped = true;
      source?.close();
      if (timer) clearTimeout(timer);
    };
  }, [activo, qc]);
}
