"use client";

import { useEffect, useState } from "react";
import { Clock, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

const MIN = 60_000;

function formatearRestante(ms: number): string {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

function etiquetaAccesible(ms: number): string {
  const minutos = Math.floor(ms / MIN);
  if (minutos <= 0) return "El pedido cierra en menos de un minuto";
  if (minutos < 60) return `El pedido cierra en ${minutos} minutos`;
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return `El pedido cierra en ${h} ${h === 1 ? "hora" : "horas"}${
    m > 0 ? ` y ${m} minutos` : ""
  }`;
}

/** Cuanto menos falta, más grita. Los cortes son los que el cliente siente:
    media hora para decidir, diez minutos para no perder el día. */
type Apremio = "holgado" | "corriendo" | "ultimo";

function apremioDe(ms: number): Apremio {
  if (ms <= 10 * MIN) return "ultimo";
  if (ms <= 30 * MIN) return "corriendo";
  return "holgado";
}

const COPY: Record<Apremio, string> = {
  holgado: "Cierra en",
  corriendo: "Apúrese, cierra en",
  ultimo: "Últimos minutos",
};

/* Sobre el verde de marca el tono normal es translúcido; cuando aprieta salta
   al amarillo del rótulo y al rojo de operación. Son tokens de la misma marca,
   no una paleta nueva. */
const TONO_PANEL: Record<Apremio, string> = {
  holgado: "bg-white/12 text-blanco ring-1 ring-inset ring-white/20",
  corriendo: "bg-[var(--yellow-400)] text-[var(--green-900)]",
  ultimo: "bg-[var(--red-600)] text-blanco",
};

const TONO_BARRA: Record<Apremio, string> = {
  holgado: "bg-[var(--green-100)] text-[var(--green-800)]",
  corriendo: "bg-[var(--yellow-400)] text-[var(--green-900)]",
  ultimo: "bg-[var(--red-600)] text-blanco",
};

/**
 * Cuenta atrás visual. El servidor decide si el POST entra; esto solo anima.
 *
 * - `panel`: bloque ancho para el encabezado verde. Es lo primero que se ve.
 * - `barra`: tira compacta para el pie pegajoso del catálogo, donde el cliente
 *   pasa el rato eligiendo y ya no ve el encabezado.
 */
export function VentanaCountdown({
  cierraAt,
  variant = "panel",
  className,
}: {
  /** `null` sin horario configurado: no hay cierre que contar. */
  cierraAt: string | null;
  variant?: "panel" | "barra";
  className?: string;
}) {
  const [ahoraMs, setAhoraMs] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => setAhoraMs(Date.now());
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  if (ahoraMs == null || !cierraAt) return null;
  const ms = Math.max(0, Date.parse(cierraAt) - ahoraMs);
  const apremio = apremioDe(ms);
  const cerrado = ms === 0;
  const Icon = cerrado ? Lock : Clock;

  if (variant === "barra") {
    return (
      <p
        role="timer"
        aria-label={cerrado ? "La ventana de pedido cerró" : etiquetaAccesible(ms)}
        className={cn(
          "flex min-h-9 items-center justify-center gap-2 rounded-pill px-3 text-[13px] font-semibold",
          TONO_BARRA[apremio],
          className,
        )}
      >
        <Icon size={15} aria-hidden />
        <span aria-hidden>
          {cerrado ? "La ventana cerró" : `${COPY[apremio]} ${formatearRestante(ms)}`}
        </span>
      </p>
    );
  }

  return (
    <div
      role="timer"
      aria-label={cerrado ? "La ventana de pedido cerró" : etiquetaAccesible(ms)}
      className={cn(
        "flex items-center gap-3 rounded-tarjeta px-4 py-3",
        TONO_PANEL[apremio],
        className,
      )}
    >
      <Icon size={22} className="shrink-0" aria-hidden />
      <div className="min-w-0" aria-hidden>
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] opacity-80">
          {cerrado ? "Ventana cerrada" : COPY[apremio]}
        </p>
        <p className="text-[26px] font-semibold leading-none tabular-nums">
          {cerrado ? "00:00" : formatearRestante(ms)}
        </p>
      </div>
    </div>
  );
}
