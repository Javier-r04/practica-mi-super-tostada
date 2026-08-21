import { Check, CheckCheck, FileText, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

type EstadoUi = "enviado" | "entregado" | "leido" | "error" | "pending";

export function MensajePreview({
  tipo = "plantilla",
  plantilla,
  cuerpo,
  adjunto,
  hora,
  estado,
  className,
}: {
  tipo?: "plantilla" | "libre";
  plantilla?: string;
  cuerpo: string;
  adjunto?: string;
  hora?: string;
  estado?: string;
  className?: string;
}) {
  const esPlantilla = tipo === "plantilla";
  const marca = normalizarEstado(estado);
  return (
    <div className={cn("grid gap-1.5", className)}>
      <div className="flex items-center gap-2">
        <span className="mst-label">
          {esPlantilla ? "Plantilla aprobada" : "Mensaje libre"}
        </span>
        {plantilla ? (
          <code className="rounded-pill bg-tinta-50 px-2 py-0.5 font-mono text-[11px] text-tinta-800">
            {plantilla}
          </code>
        ) : null}
      </div>
      <div
        className={cn(
          "max-w-[420px] rounded-[14px_14px_14px_4px] border p-3 shadow-[var(--shadow-xs)]",
          esPlantilla
            ? "border-[var(--green-200)] bg-[var(--green-50)]"
            : "border-[var(--border-subtle)] bg-blanco",
        )}
      >
        {adjunto ? (
          <div className="mb-2 flex items-center gap-2 rounded-campo border border-[var(--border-subtle)] bg-tinta-50 p-2">
            <FileText size={16} className="text-peligro" aria-hidden />
            <span className="text-xs font-semibold">{adjunto}</span>
          </div>
        ) : null}
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-tinta-800">
          {cuerpo}
        </p>
        <div className="mt-1 flex items-center justify-end gap-1.5 text-[11px] tabular-nums text-tinta-500">
          {hora}
          {marca === "enviado" || marca === "pending" ? (
            <Check size={12} aria-hidden />
          ) : null}
          {marca === "entregado" ? <CheckCheck size={12} aria-hidden /> : null}
          {marca === "leido" ? (
            <CheckCheck size={12} className="text-[var(--blue-600)]" aria-hidden />
          ) : null}
          {marca === "error" ? (
            <TriangleAlert size={12} className="text-peligro" aria-hidden />
          ) : null}
        </div>
      </div>
    </div>
  );
}

function normalizarEstado(estado: string | undefined): EstadoUi | undefined {
  if (!estado) return undefined;
  if (estado === "sent" || estado === "enviado") return "enviado";
  if (estado === "delivered" || estado === "entregado") return "entregado";
  if (estado === "read" || estado === "leido") return "leido";
  if (estado === "failed" || estado === "error") return "error";
  if (estado === "pending") return "pending";
  return undefined;
}
