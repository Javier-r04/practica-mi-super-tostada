"use client";

import { useEffect, useState } from "react";
import { Clock, Lock, LockOpen } from "lucide-react";
import { cn } from "@/lib/utils";

function formatearRestante(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function VentanaBadge({
  abierta,
  size = "md",
  tipo = "pedido",
  reabierta = false,
  expiraAt,
  cierraAt,
  proximaAperturaAt,
}: {
  abierta: boolean;
  size?: "sm" | "md";
  tipo?: "pedido" | "whatsapp";
  /**
   * El día de captura está reabierto: el reloj dice cerrado pero el panel sí
   * acepta pedidos (`exigirDiaNoCerrado` solo bloquea CERRADO). Decir «Ventana
   * cerrada» ahí es mentir sobre lo que el sistema deja hacer.
   */
  reabierta?: boolean;
  expiraAt?: string | null;
  cierraAt?: string | null;
  proximaAperturaAt?: string | null;
}) {
  const [now, setNow] = useState(() => Date.now());

  const tieneTimer =
    (tipo === "whatsapp" && Boolean(expiraAt)) ||
    (tipo === "pedido" && (Boolean(cierraAt) || Boolean(proximaAperturaAt)));

  useEffect(() => {
    if (!tieneTimer) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [tieneTimer, tipo, expiraAt, cierraAt, proximaAperturaAt]);

  const targetIso =
    tipo === "whatsapp"
      ? expiraAt
      : abierta
        ? cierraAt
        : proximaAperturaAt;

  const restante = targetIso ? Math.max(0, new Date(targetIso).getTime() - now) : 0;
  const reabiertaPedido = tipo === "pedido" && reabierta && !abierta;
  const viva = tipo === "whatsapp" && expiraAt ? restante > 0 : abierta;
  const Icon = reabiertaPedido ? LockOpen : viva ? Clock : Lock;

  let etiqueta = viva ? "Ventana abierta" : "Ventana cerrada";
  if (reabiertaPedido) {
    etiqueta = "Ventana reabierta";
  } else if (tipo === "whatsapp") {
    etiqueta = viva ? `24 h · ${formatearRestante(restante)}` : "24 h cerrada";
  } else if (!reabiertaPedido && viva && cierraAt && restante > 0) {
    etiqueta = `Ventana abierta · Cierra en ${formatearRestante(restante)}`;
  } else if (!reabiertaPedido && !viva && proximaAperturaAt && restante > 0) {
    etiqueta = `Ventana cerrada · Abre en ${formatearRestante(restante)}`;
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-pill font-semibold tabular-nums",
        size === "sm" ? "h-[22px] px-2 text-[12px]" : "h-7 px-3 text-xs",
        reabiertaPedido
          ? "bg-[var(--amber-100)] text-[var(--amber-700)]"
          : viva
            ? "bg-[var(--green-100)] text-[var(--green-700)]"
            : "bg-[var(--ink-100)] text-[var(--ink-600)]",
      )}
    >
      <Icon size={size === "sm" ? 12 : 14} aria-hidden />
      {etiqueta}
    </span>
  );
}
