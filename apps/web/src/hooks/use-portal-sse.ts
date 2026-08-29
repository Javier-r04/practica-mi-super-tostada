"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { API_URL, api, ApiError } from "@/lib/api";

const DEBOUNCE_MS = 80;

export function usePortalSse(token: string): void {
  const qc = useQueryClient();
  const delayRef = useRef(1000);

  useEffect(() => {
    let source: EventSource | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let debounce: ReturnType<typeof setTimeout> | undefined;
    let stopped = false;
    let pendientes: string[][] = [];

    function encolar(claves: string[][]) {
      pendientes = [...pendientes, ...claves];
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
      source = new EventSource(`${API_URL}/p/${encodeURIComponent(token)}/stream`);
      source.onopen = () => {
        delayRef.current = 1000;
        encolar([["portal", token]]);
      };
      source.onmessage = (msg) => {
        delayRef.current = 1000;
        try {
          const parsed = JSON.parse(msg.data);
          if (parsed && parsed.tipo === "heartbeat") return;
          // Invalida la sesión del portal ante cualquier evento
          encolar([["portal", token]]);
        } catch {}
      };
      source.onerror = () => {
        if (source?.readyState === EventSource.CLOSED || stopped) return;
        source?.close();
        source = null;
        void decidirReconexion();
      };
    }

    async function decidirReconexion() {
      if (stopped) return;
      try {
        await api(`/p/${encodeURIComponent(token)}`);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) return;
        if (err instanceof ApiError && err.status === 404) return;
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
  }, [token, qc]);
}
