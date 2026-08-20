"use client";

import { useEffect, useState } from "react";

function formatearRestante(ms: number): string {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

/** Cuenta atrás visual. El servidor decide si el POST entra; esto solo anima. */
export function VentanaCountdown({ cierraAt }: { cierraAt: string }) {
  const [ahoraMs, setAhoraMs] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => setAhoraMs(Date.now());
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  if (ahoraMs == null) return null;
  const ms = Math.max(0, Date.parse(cierraAt) - ahoraMs);
  return (
    <span className="font-mono text-xs tabular-nums text-[var(--green-100)]">
      Cierra en {formatearRestante(ms)}
    </span>
  );
}
