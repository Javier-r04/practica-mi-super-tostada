"use client";

import { Chip } from "@heroui/react";
import { FileText } from "lucide-react";

export function ConsolidadoPreview({
  cuerpo,
  version,
  fecha,
}: {
  cuerpo: string;
  version: number;
  fecha: string;
}) {
  const corregida = version > 1;
  return (
    <div className="grid gap-1.5">
      <div className="flex items-center gap-2">
        <span className="mst-label">Consolidado</span>
        {corregida ? (
          <Chip color="warning" size="sm" variant="soft">
            Solo los cambios
          </Chip>
        ) : null}
      </div>
      <div
        role="region"
        aria-label={
          corregida
            ? "Texto del consolidado corregido, solo los cambios"
            : "Texto del consolidado"
        }
        className="w-full rounded-[calc(var(--radius-card)-0.5rem)] border border-[var(--green-200)] bg-[var(--green-50)] p-3 shadow-[var(--shadow-xs)]"
      >
        <div className="mb-2 flex items-center gap-2 rounded-campo border border-[var(--border-subtle)] bg-tinta-50 p-2">
          <FileText size={16} className="text-peligro" aria-hidden />
          <span className="text-xs font-semibold">hoja-{fecha}.pdf</span>
        </div>
        <p className="whitespace-pre-wrap text-sm leading-relaxed tabular-nums text-tinta-800">
          {cuerpo}
        </p>
      </div>
    </div>
  );
}
