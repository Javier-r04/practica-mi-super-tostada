import { FileText } from "lucide-react";

export function ConsolidadoPreview({
  cuerpo,
  version,
}: {
  cuerpo: string;
  version: number;
}) {
  return (
    <div className="grid gap-1.5">
      <div className="flex items-center gap-2">
        <span className="mst-label">Consolidado</span>
        <code className="rounded-pill bg-tinta-50 px-2 py-0.5 font-mono text-[11px] text-tinta-800">
          hoja_produccion_v{version}
        </code>
      </div>
      <div
        role="region"
        aria-label={`Texto del consolidado versión ${version}`}
        className="w-full rounded-[calc(var(--radius-card)-0.5rem)] border border-[var(--green-200)] bg-[var(--green-50)] p-3 shadow-[var(--shadow-xs)]"
      >
        <div className="mb-2 flex items-center gap-2 rounded-campo border border-[var(--border-subtle)] bg-tinta-50 p-2">
          <FileText size={16} className="text-peligro" aria-hidden />
          <span className="text-xs font-semibold">hoja-produccion.pdf</span>
        </div>
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-tinta-800">
          {cuerpo}
        </p>
      </div>
    </div>
  );
}
