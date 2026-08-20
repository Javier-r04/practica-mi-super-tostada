"use client";

import { useEffect, useState } from "react";
import { Clock, Lock } from "lucide-react";
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
  expiraAt,
}: {
  abierta: boolean;
  size?: "sm" | "md";
  tipo?: "pedido" | "whatsapp";
  expiraAt?: string | null;
}) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (tipo !== "whatsapp" || !expiraAt) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [tipo, expiraAt]);

  const restante =
    tipo === "whatsapp" && expiraAt
      ? Math.max(0, new Date(expiraAt).getTime() - now)
      : 0;
  const viva = tipo === "whatsapp" && expiraAt ? restante > 0 : abierta;
  const Icon = viva ? Clock : Lock;

  const etiqueta =
    tipo === "whatsapp"
      ? viva
        ? `24 h · ${formatearRestante(restante)}`
        : "24 h cerrada"
      : viva
        ? "Ventana abierta"
        : "Ventana cerrada";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-pill font-semibold tabular-nums",
        size === "sm" ? "h-[22px] px-2 text-[12px]" : "h-7 px-3 text-xs",
        viva
          ? "bg-[var(--green-100)] text-[var(--green-700)]"
          : "bg-[var(--ink-100)] text-[var(--ink-600)]",
      )}
    >
      <Icon size={size === "sm" ? 12 : 14} aria-hidden />
      {etiqueta}
    </span>
  );
}
