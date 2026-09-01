"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { API_URL, api, ApiError } from "@/lib/api";
import {
  clavesAInvalidar,
  clavesAlReconectar,
  debeReconectarManual,
  fusionarClaves,
  interpretarMensajeSse,
} from "./panel-sse-invalidation";

const DEBOUNCE_MS = 80;

/**
 * Un EventSource por sesión de panel. Reconecta solo si el canal cerró.
 * Invalida queries según el tipo de evento, no el catálogo entero.
 */
export function usePanelSse(activo: boolean): void {
  const qc = useQueryClient();
  const delayRef = useRef(1000);

  useEffect(() => {
    if (!activo) return;
    let source: EventSource | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let debounce: ReturnType<typeof setTimeout> | undefined;
    let stopped = false;
    let yaAbrio = false;
    let pendientes: string[][] = [];

    function encolar(claves: string[][]) {
      pendientes = fusionarClaves([pendientes, claves]);
      if (debounce) return;
      debounce = setTimeout(() => {
        debounce = undefined;
        const lote = pendientes;
        pendientes = [];
        for (const queryKey of lote) {
          void qc.invalidateQueries({ queryKey });
        }
      }, DEBOUNCE_MS);
    }

    function conectar() {
      if (stopped) return;
      source = new EventSource(`${API_URL}/pedidos/stream`, {
        withCredentials: true,
      });
      source.onopen = () => {
        delayRef.current = 1000;
        if (yaAbrio) encolar(clavesAlReconectar());
        yaAbrio = true;
      };
      source.onmessage = (msg) => {
        delayRef.current = 1000;
        const parsed = interpretarMensajeSse(msg.data);
        if (parsed === "heartbeat" || parsed === null) return;
        const claves = clavesAInvalidar(parsed);
        if (claves) encolar(claves);
      };
      source.onerror = () => {
        if (!debeReconectarManual(source?.readyState ?? 0, stopped)) return;
        source?.close();
        source = null;
        void decidirReconexion();
      };
    }

    async function decidirReconexion() {
      if (stopped) return;
      try {
        await api("/auth/me");
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) return;
      }
      if (stopped) return;
      timer = setTimeout(conectar, delayRef.current);
      delayRef.current = Math.min(delayRef.current * 2, 15_000);
    }

    conectar();
    return () => {
      stopped = true;
      source?.close();
      if (timer) clearTimeout(timer);
      if (debounce) clearTimeout(debounce);
    };
  }, [activo, qc]);
}
