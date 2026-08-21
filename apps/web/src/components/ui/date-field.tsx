"use client";

import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import {
  formatearFechaLarga,
  type FechaCalendario,
} from "@misupertostada/shared";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { Field } from "@/components/ui/field";
import { cn } from "@/lib/utils";
import {
  aFechaIso,
  celdasMes,
  etiquetaMesAno,
  etiquetasDiasCorto,
  mesAnterior,
  mesSiguiente,
  partesFecha,
} from "@/lib/fecha-ui";

type Props = {
  id?: string;
  label?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  /** ISO YYYY-MM-DD inclusive. */
  min?: string;
  /** ISO YYYY-MM-DD inclusive. */
  max?: string;
  name?: string;
  /** Mostrar acción Limpiar. Desactivar en fecha_operacion obligatoria. */
  clearable?: boolean;
};

function hoyIso(): string {
  const now = new Date();
  return aFechaIso(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

function dentroDeRango(iso: string, min?: string, max?: string): boolean {
  if (min && iso < min) return false;
  if (max && iso > max) return false;
  return true;
}

export function DateField({
  id: idProp,
  label,
  hint,
  error,
  required,
  value,
  onChange,
  placeholder = "Elegir fecha",
  disabled,
  className,
  min,
  max,
  name,
  clearable = true,
}: Props) {
  const autoId = useId();
  const id = idProp ?? autoId;
  const listId = `${id}-calendar`;
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  const partes = partesFecha(value);
  const [vista, setVista] = useState(() => {
    if (partes) return { y: partes.y, m: partes.m };
    const h = partesFecha(hoyIso());
    return h ? { y: h.y, m: h.m } : { y: 2026, m: 1 };
  });

  useEffect(() => {
    if (!open) return;
    if (partes) setVista({ y: partes.y, m: partes.m });
  }, [open, partes?.y, partes?.m]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const display = value
    ? formatearFechaLarga(value as FechaCalendario)
    : placeholder;
  const cells = celdasMes(vista.y, vista.m);
  const today = hoyIso();

  function elegir(iso: string) {
    if (!dentroDeRango(iso, min, max)) return;
    onChange(iso);
    setOpen(false);
  }

  function onTriggerKey(e: KeyboardEvent<HTMLButtonElement>) {
    if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setOpen(true);
    }
  }

  return (
    <Field label={label} hint={hint} error={error} required={required} htmlFor={id}>
      <div ref={rootRef} className={cn("relative", className)}>
        <input type="hidden" name={name} value={value} />
        <button
          id={id}
          type="button"
          disabled={disabled}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls={listId}
          aria-invalid={error ? true : undefined}
          aria-required={required || undefined}
          data-open={open ? "true" : undefined}
          onClick={() => setOpen((v) => !v)}
          onKeyDown={onTriggerKey}
          className={cn(
            "mst-control flex items-center gap-2 px-3 text-left",
            !value && "text-tinta-500",
            value && "tabular-nums text-tinta-800",
          )}
        >
          <CalendarDays
            size={16}
            className="shrink-0 text-[var(--text-subtle)]"
            aria-hidden
          />
          <span className="min-w-0 flex-1 truncate">{display}</span>
        </button>

        {open && (
          <div
            id={listId}
            role="dialog"
            aria-label={label ?? "Calendario"}
            className="mst-popover absolute left-0 right-0 top-[calc(100%+6px)] p-3 sm:right-auto sm:w-[320px]"
          >
            <div className="mb-2 flex items-center gap-1">
              <button
                type="button"
                aria-label="Mes anterior"
                className="inline-flex size-11 items-center justify-center rounded-campo text-tinta-800 hover:bg-tinta-50"
                onClick={() => setVista((v) => mesAnterior(v.y, v.m))}
              >
                <ChevronLeft size={18} aria-hidden />
              </button>
              <p className="flex-1 text-center text-sm font-semibold text-tinta-900">
                {etiquetaMesAno(vista.y, vista.m)}
              </p>
              <button
                type="button"
                aria-label="Mes siguiente"
                className="inline-flex size-11 items-center justify-center rounded-campo text-tinta-800 hover:bg-tinta-50"
                onClick={() => setVista((v) => mesSiguiente(v.y, v.m))}
              >
                <ChevronRight size={18} aria-hidden />
              </button>
            </div>

            <div
              className="grid grid-cols-7 gap-0.5"
              role="grid"
              aria-label={etiquetaMesAno(vista.y, vista.m)}
            >
              {etiquetasDiasCorto().map((d) => (
                <span
                  key={d}
                  className="flex h-8 items-center justify-center text-[11px] font-semibold uppercase tracking-wide text-tinta-500"
                  role="columnheader"
                >
                  {d}
                </span>
              ))}
              {cells.map((iso, i) =>
                iso ? (
                  <button
                    key={iso}
                    type="button"
                    role="gridcell"
                    aria-selected={iso === value}
                    data-today={iso === today ? "true" : undefined}
                    disabled={!dentroDeRango(iso, min, max)}
                    className="mst-calendar-day"
                    onClick={() => elegir(iso)}
                  >
                    {Number(iso.slice(8, 10))}
                  </button>
                ) : (
                  <span key={`empty-${i}`} className="min-h-tap" aria-hidden />
                ),
              )}
            </div>

            <div className="mt-2 flex justify-between border-t border-[var(--border-subtle)] pt-2">
              <button
                type="button"
                className="min-h-11 rounded-campo px-3 text-sm font-semibold text-marca hover:bg-marca-soft"
                onClick={() => {
                  const t = hoyIso();
                  if (dentroDeRango(t, min, max)) elegir(t);
                }}
              >
                Hoy
              </button>
              {clearable && value ? (
                <button
                  type="button"
                  className="min-h-11 rounded-campo px-3 text-sm font-semibold text-tinta-500 hover:bg-tinta-50"
                  onClick={() => {
                    onChange("");
                    setOpen(false);
                  }}
                >
                  Limpiar
                </button>
              ) : (
                <span />
              )}
            </div>
          </div>
        )}
      </div>
    </Field>
  );
}
