"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  MENSAJE_COLA_INDEXEDDB,
  encolar,
  pedidoTieneCola,
  type AccionCola,
  type FilaCola,
  type RutaReparto,
} from "@misupertostada/shared";
import { api } from "@/lib/api";
import { subirComprobantePago } from "@/lib/upload-asset";
import { useOnline } from "@/hooks/use-online";
import { abrirColaStore, type ColaStore } from "@/lib/offline-idb";
import { drenarCola } from "@/lib/offline-sync";

/** Solo ordena la cola local. No es fecha_operacion ni fecha de cobro. */
function isoOrdenCola(): string {
  return new Date().toISOString();
}

type ColaOfflineApi = {
  listo: boolean;
  online: boolean;
  cola: FilaCola[];
  sincronizando: boolean;
  errorApertura?: string;
  enviarAhora: () => void;
  guardarSnapshot: (ruta: RutaReparto) => Promise<void>;
  leerSnapshot: () => Promise<RutaReparto | undefined>;
  pedidoPendiente: (pedidoId: string) => boolean;
  encolarEntrega: (accion: Extract<AccionCola, { tipo: "ENTREGA" }>) => Promise<void>;
  encolarPago: (
    accion: Extract<AccionCola, { tipo: "PAGO" }>,
    archivo?: File,
  ) => Promise<void>;
};

const ColaOfflineContext = createContext<ColaOfflineApi | null>(null);

export function ColaOfflineProvider({ children }: { children: ReactNode }) {
  const online = useOnline();
  const qc = useQueryClient();
  const [store, setStore] = useState<ColaStore | null>(null);
  const [cola, setCola] = useState<FilaCola[]>([]);
  const [sincronizando, setSincronizando] = useState(false);
  const [errorApertura, setErrorApertura] = useState<string>();
  const vuelo = useRef(false);

  useEffect(() => {
    let vivo = true;
    void abrirColaStore()
      .then(async (s) => {
        if (!vivo) return;
        setStore(s);
        setCola(await s.leerCola());
      })
      .catch(() => {
        if (vivo) setErrorApertura(MENSAJE_COLA_INDEXEDDB);
      });
    return () => {
      vivo = false;
    };
  }, []);

  const refrescar = useCallback(async (s: ColaStore) => {
    setCola(await s.leerCola());
  }, []);

  const drenar = useCallback(async () => {
    if (!store || !navigator.onLine || vuelo.current) return;
    vuelo.current = true;
    setSincronizando(true);
    try {
      const r = await drenarCola(store, {
        postEntrega: (body) =>
          api("/entregas", { method: "POST", body: JSON.stringify(body) }),
        postPago: (body) =>
          api("/pagos", { method: "POST", body: JSON.stringify(body) }),
        subirComprobante: (blob, pagoId) => {
          const file =
            blob instanceof File
              ? blob
              : new File([blob], "comprobante.jpg", {
                  type: blob.type || "image/jpeg",
                });
          return subirComprobantePago(file, pagoId);
        },
      });
      await refrescar(store);
      if (r.confirmadas > 0) {
        void qc.invalidateQueries({ queryKey: ["ruta"] });
        void qc.invalidateQueries({ queryKey: ["cartera"] });
        void qc.invalidateQueries({ queryKey: ["cuadre"] });
        void qc.invalidateQueries({ queryKey: ["pedidos"] });
      }
    } finally {
      vuelo.current = false;
      setSincronizando(false);
    }
  }, [store, qc, refrescar]);

  useEffect(() => {
    if (online) void drenar();
  }, [online, drenar]);

  useEffect(() => {
    function alFrente() {
      if (document.visibilityState === "visible" && navigator.onLine) {
        void drenar();
      }
    }
    document.addEventListener("visibilitychange", alFrente);
    window.addEventListener("focus", alFrente);
    return () => {
      document.removeEventListener("visibilitychange", alFrente);
      window.removeEventListener("focus", alFrente);
    };
  }, [drenar]);

  const value = useMemo<ColaOfflineApi>(
    () => ({
      listo: Boolean(store),
      online,
      cola,
      sincronizando,
      errorApertura,
      enviarAhora: () => {
        void drenar();
      },
      guardarSnapshot: async (ruta) => {
        if (!store) return;
        await store.putRuta(ruta);
      },
      leerSnapshot: async () => store?.getRuta(),
      pedidoPendiente: (pedidoId) => pedidoTieneCola(cola, pedidoId),
      encolarEntrega: async (accion) => {
        if (!store) throw new Error(MENSAJE_COLA_INDEXEDDB);
        const next = encolar(await store.leerCola(), accion, isoOrdenCola());
        await store.escribirCola(next);
        setCola(next);
        if (navigator.onLine) void drenar();
      },
      encolarPago: async (accion, archivo) => {
        if (!store) throw new Error(MENSAJE_COLA_INDEXEDDB);
        if (archivo && accion.blobId) {
          await store.putBlob(accion.blobId, archivo);
        }
        const next = encolar(await store.leerCola(), accion, isoOrdenCola());
        await store.escribirCola(next);
        setCola(next);
        if (navigator.onLine) void drenar();
      },
    }),
    [store, online, cola, sincronizando, errorApertura, drenar],
  );

  return (
    <ColaOfflineContext.Provider value={value}>{children}</ColaOfflineContext.Provider>
  );
}

export function useColaOffline(): ColaOfflineApi {
  const ctx = useContext(ColaOfflineContext);
  if (!ctx) {
    throw new Error("useColaOffline requiere ColaOfflineProvider");
  }
  return ctx;
}
