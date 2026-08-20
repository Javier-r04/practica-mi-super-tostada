"use client";

import { CloudOff, RefreshCw } from "lucide-react";

export function OfflineBanner({
  online = false,
  pendientes = 0,
  sincronizando = false,
  onReintentar,
}: {
  online?: boolean;
  pendientes?: number;
  sincronizando?: boolean;
  onReintentar?: () => void;
}) {
  if (online && pendientes === 0 && !sincronizando) return null;

  const tono = online
    ? { bg: "var(--blue-100)", fg: "var(--blue-700)" }
    : { bg: "var(--amber-100)", fg: "var(--amber-700)" };
  const texto = !online
    ? pendientes > 0
      ? `Sin señal · ${pendientes} ${pendientes === 1 ? "acción" : "acciones"} en este teléfono`
      : "Sin señal · trabajando sin conexión"
    : sincronizando
      ? `Sincronizando ${pendientes}…`
      : `${pendientes} ${pendientes === 1 ? "acción" : "acciones"} por enviar`;

  return (
    <div
      role="status"
      className="flex min-h-9 w-full items-center gap-2 px-4 text-xs font-semibold"
      style={{ background: tono.bg, color: tono.fg }}
    >
      {online ? <RefreshCw size={15} aria-hidden /> : <CloudOff size={15} aria-hidden />}
      <span className="flex-1">{texto}</span>
      {online && pendientes > 0 && !sincronizando && onReintentar && (
        <button
          type="button"
          onClick={onReintentar}
          className="underline decoration-from-font"
        >
          Enviar ahora
        </button>
      )}
    </div>
  );
}
