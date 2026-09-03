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

function etiquetaAccesible(ms: number, sentido: "cierra" | "abre"): string {
  const minutos = Math.floor(ms / MIN);
  if (sentido === "abre") {
    if (minutos <= 0) return "El pedido abre en menos de un minuto";
    if (minutos < 60) return `El pedido abre en ${minutos} minutos`;
    const h = Math.floor(minutos / 60);
    const m = minutos % 60;
    return `El pedido abre en ${h} ${h === 1 ? "hora" : "horas"}${
      m > 0 ? ` y ${m} minutos` : ""
    }`;
  }
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

const COPY_CIERRA: Record<Apremio, string> = {
  holgado: "Cierra en",
  corriendo: "Apúrese, cierra en",
  ultimo: "Últimos minutos",
};

const COPY_ABRE: Record<Apremio, string> = {
  holgado: "Abre en",
  corriendo: "Abre en",
  ultimo: "Abre en breve",
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
 * - `panel`: bloque ancho (inicio, si hace falta repetir el reloj).
 * - `barra`: tira compacta sobre fondo claro.
 * - `navbar`: pastilla sobre el verde de marca; el horario vive aquí.
 */
export function VentanaCountdown({
  cierraAt,
  abreAt = null,
  variant = "panel",
  className,
}: {
  /** `null` sin horario configurado: no hay cierre que contar. */
  cierraAt: string | null;
  /**
   * Cierre anticipado: el día ya cerró y el reloj sigue vivo. Contamos
   * hacia la próxima apertura (como el navbar), no hacia las 03:00.
   */
  abreAt?: string | null;
  variant?: "panel" | "barra" | "navbar";
  className?: string;
}) {
  const [ahoraMs, setAhoraMs] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => setAhoraMs(Date.now());
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  const targetAt = abreAt ?? cierraAt;
  const sentido: "cierra" | "abre" = abreAt ? "abre" : "cierra";
  /* En la barra del portal el copy sí escala: los últimos treinta minutos son
     los que deciden el día del cliente, y aplastar todo a «Cierra» dejaba el
     apremio confiado solo al color —que es justo lo que no se puede hacer. */
  const copy =
    variant === "navbar"
      ? sentido === "abre"
        ? { holgado: "Abre", corriendo: "Abre", ultimo: "Abre" }
        : { holgado: "Cierra", corriendo: "Apúrese", ultimo: "Últimos" }
      : sentido === "abre"
        ? COPY_ABRE
        : COPY_CIERRA;

  if (!targetAt) return null;
  if (ahoraMs == null) {
    if (variant !== "navbar") return null;
    return (
      <p
        className={cn(
          "flex h-[22px] max-w-full min-w-0 items-center justify-center gap-1.5 rounded-pill px-2 text-[12px] font-semibold tabular-nums",
          TONO_BARRA.holgado,
          className,
        )}
      >
        <Clock size={12} className="shrink-0" aria-hidden />
        <span className="min-w-0 truncate">
          {sentido === "abre" ? "Abre" : "Cierra"}
        </span>
      </p>
    );
  }
  const ms = Math.max(0, Date.parse(targetAt) - ahoraMs);
  const apremio = apremioDe(ms);
  const vencido = ms === 0;
  const Icon = vencido ? Lock : Clock;
  const etiquetaVencido =
    sentido === "abre" ? "La ventana de pedido abrió" : "La ventana de pedido cerró";
  const textoVencido = sentido === "abre" ? "La ventana abrió" : "La ventana cerró";
  const tituloVencido = sentido === "abre" ? "Ventana abierta" : "Ventana cerrada";

  if (variant === "barra" || variant === "navbar") {
    const compacto = variant === "navbar";
    return (
      <p
        role="timer"
        aria-label={vencido ? etiquetaVencido : etiquetaAccesible(ms, sentido)}
        className={cn(
          "flex min-w-0 items-center justify-center gap-1.5 rounded-pill font-semibold tabular-nums",
          compacto
            ? "h-[22px] max-w-full px-2 text-[12px]"
            : "min-h-9 gap-2 px-3 text-[13px]",
          TONO_BARRA[apremio],
          className,
        )}
      >
        <Icon size={compacto ? 12 : 15} className="shrink-0" aria-hidden />
        <span className="min-w-0 truncate" aria-hidden>
          {vencido ? textoVencido : `${copy[apremio]} ${formatearRestante(ms)}`}
        </span>
      </p>
    );
  }

  return (
    <div
      role="timer"
      aria-label={vencido ? etiquetaVencido : etiquetaAccesible(ms, sentido)}
      className={cn(
        "flex min-w-0 items-center gap-3 rounded-tarjeta px-4 py-3",
        TONO_PANEL[apremio],
        className,
      )}
    >
      <Icon size={22} className="shrink-0" aria-hidden />
      <div className="min-w-0 flex-1" aria-hidden>
        <p className="truncate text-[11px] font-semibold uppercase tracking-[0.08em] opacity-80">
          {vencido ? tituloVencido : copy[apremio]}
        </p>
        <p className="truncate text-[22px] font-semibold leading-none tabular-nums sm:text-[26px]">
          {vencido ? "00:00" : formatearRestante(ms)}
        </p>
      </div>
    </div>
  );
}
