"use client";

import { CalendarDays, ChevronDown } from "lucide-react";
import {
  formatearFechaLarga,
  type FechaCalendario,
} from "@misupertostada/shared";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import type { DateRange } from "react-day-picker";
import { Field } from "@/components/ui/field";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  clicPersonalizadoRango,
  dateCivilDesdeIso,
  etiquetaBorradorRango,
  etiquetaRangoCorto,
  etiquetaTriggerFecha,
  esFechaIso,
  fechaPreferidaEnRango,
  hoyCivilIso,
  isoDeCampoUnValor,
  isoCivilDesdeDate,
  ordenarRango,
  rangoUiDePreset,
  type BorradorRango,
  type PresetCalendario,
  PRESETS_CALENDARIO,
} from "@/lib/fecha-ui";

type PresetId = PresetCalendario;

type RangoUi = { desde: string; hasta: string };

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
  min?: string;
  max?: string;
  name?: string;
  clearable?: boolean;
  rangeEnd?: string;
  onRangeChange?: (
    rango: { desde: string; hasta: string },
    preset: PresetId,
  ) => void;
  presets?: false | PresetId[];
  ancla?: string;
  /**
   * Día que el atajo «Hoy» y el marcador de hoy deben usar: la operación
   * **en curso**, no el día de calendario ni la ventana en captura.
   */
  fechaHoy?: string;
  /** Operación **en captura**, para el atajo «Esta noche». */
  fechaNoche?: string;
  tone?: "default" | "onBrand";
};

const PRESET_LABEL: Record<PresetId, string> = {
  hoy: "Hoy",
  noche: "Esta noche",
  semana: "Semana",
  quincena: "Quincena",
  mes: "Mes",
  personalizado: "Personalizado",
};

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
  rangeEnd,
  onRangeChange,
  presets: presetsProp,
  ancla,
  fechaHoy,
  fechaNoche,
  tone = "default",
}: Props) {
  const autoId = useId();
  const id = idProp ?? autoId;
  const listId = `${id}-calendar`;
  const [open, setOpen] = useState(false);
  const [presetActivo, setPresetActivo] = useState<PresetId | null>(null);
  const [borrador, setBorrador] = useState<BorradorRango | null>(null);
  // Espejo del borrador para leerlo dentro de un handler sin depender del
  // render en curso. Se sincroniza en efecto, no durante el render.
  const borradorRef = useRef<BorradorRango | null>(null);
  useEffect(() => {
    borradorRef.current = borrador;
  }, [borrador]);
  const modoRango = Boolean(onRangeChange);
  const hoyIso = fechaHoy && esFechaIso(fechaHoy) ? fechaHoy : hoyCivilIso();
  const nocheIso = fechaNoche && esFechaIso(fechaNoche) ? fechaNoche : null;
  const anclaEfectiva = ancla && esFechaIso(ancla) ? ancla : hoyIso;

  const presetIds = (
    presetsProp === false
      ? []
      : presetsProp && presetsProp.length > 0
        ? presetsProp
        : PRESETS_CALENDARIO
    // «Esta noche» solo aparece cuando apunta a otro día que «Hoy»: durante la
    // ventana ambas operaciones coinciden y un atajo duplicado confunde.
  ).filter((pid) => pid !== "noche" || (nocheIso != null && nocheIso !== hoyIso));

  const display = value
    ? rangeEnd
      ? etiquetaTriggerFecha(value, rangeEnd)
      : formatearFechaLarga(value as FechaCalendario)
    : placeholder;

  const enPersonalizado = borrador !== null;
  const rangoExterno =
    value && rangeEnd ? ordenarRango(value, rangeEnd) : null;
  const rangoBorrador =
    borrador?.desde && borrador.hasta
      ? { desde: borrador.desde, hasta: borrador.hasta }
      : borrador?.desde
        ? { desde: borrador.desde, hasta: undefined }
        : null;
  const rangoVista = enPersonalizado
    ? rangoBorrador
    : rangoExterno
      ? { desde: rangoExterno.desde, hasta: rangoExterno.hasta }
      : value
        ? { desde: value, hasta: value }
        : null;

  const defaultMonth =
    dateCivilDesdeIso(
      rangoVista?.desde || value || anclaEfectiva,
    ) ?? undefined;

  const selectedSingle = dateCivilDesdeIso(value) ?? undefined;
  const selectedRange: DateRange | undefined = (() => {
    if (!rangoVista?.desde) return undefined;
    const from = dateCivilDesdeIso(rangoVista.desde);
    if (!from) return undefined;
    if (!rangoVista.hasta) return { from };
    const to = dateCivilDesdeIso(rangoVista.hasta);
    if (!to) return { from };
    return { from, to };
  })();

  const preview =
    enPersonalizado && borrador
      ? etiquetaBorradorRango(borrador)
      : rangoVista?.desde &&
          rangoVista.hasta &&
          rangoVista.desde !== rangoVista.hasta
        ? etiquetaRangoCorto(rangoVista.desde, rangoVista.hasta)
        : null;

  function cerrar() {
    setOpen(false);
    setBorrador(null);
  }

  function aplicarRango(rango: RangoUi, preset: PresetId) {
    if (!dentroDeRango(rango.desde, min, max)) return;
    if (!dentroDeRango(rango.hasta, min, max)) return;
    if (onRangeChange) {
      onRangeChange(rango, preset);
      cerrar();
      return;
    }
    onChange(
      isoDeCampoUnValor(rango, value, anclaEfectiva, hoyIso),
    );
    cerrar();
  }

  function elegirIso(iso: string) {
    if (!dentroDeRango(iso, min, max)) return;
    if (modoRango && onRangeChange) {
      const actual = borradorRef.current;
      const { borrador: next, rangoListo } = clicPersonalizadoRango(
        actual,
        iso,
      );
      setPresetActivo("personalizado");
      if (rangoListo) {
        borradorRef.current = null;
        aplicarRango(rangoListo, "personalizado");
        return;
      }
      borradorRef.current = next;
      setBorrador(next);
      return;
    }
    setPresetActivo("personalizado");
    setBorrador(null);
    onChange(iso);
    cerrar();
  }

  function aplicarPreset(idPreset: PresetId) {
    if (idPreset === "personalizado") {
      setPresetActivo("personalizado");
      setBorrador(modoRango ? { desde: null, hasta: null } : null);
      return;
    }
    if (idPreset === "hoy") {
      aplicarRango({ desde: hoyIso, hasta: hoyIso }, "hoy");
      return;
    }
    if (idPreset === "noche") {
      const iso = nocheIso ?? hoyIso;
      aplicarRango({ desde: iso, hasta: iso }, "noche");
      return;
    }
    const rangoUi = rangoUiDePreset(idPreset, hoyIso);
    setPresetActivo(idPreset);
    setBorrador(null);
    if (rangoUi) {
      aplicarRango(rangoUi, idPreset);
      return;
    }
    const iso = anclaEfectiva;
    if (dentroDeRango(iso, min, max)) {
      onChange(
        fechaPreferidaEnRango(iso, iso, value, anclaEfectiva),
      );
      cerrar();
    }
  }

  const hoy = hoyIso;
  const presets = presetIds.map((pid) => ({
    id: pid,
    label: PRESET_LABEL[pid],
    iso:
      pid === "noche"
        ? (nocheIso ?? hoy)
        : pid === "hoy" || pid === "personalizado"
          ? hoy
          : (rangoUiDePreset(pid, hoy)?.desde ?? hoy),
  }));

  function onTriggerKey(e: KeyboardEvent<HTMLButtonElement>) {
    if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setOpen(true);
    }
  }

  const disabledDay = (day: Date) =>
    !dentroDeRango(isoCivilDesdeDate(day), min, max);

  return (
    <Field label={label} hint={hint} error={error} required={required} htmlFor={id}>
      <div className={cn("relative", className)}>
        <input type="hidden" name={name} value={value} />
        <Popover
          open={open}
          onOpenChange={(next) => {
            setOpen(next);
            if (!next) setBorrador(null);
          }}
        >
          <PopoverTrigger asChild>
            <button
              id={id}
              type="button"
              role="combobox"
              disabled={disabled}
              aria-haspopup="dialog"
              aria-expanded={open}
              aria-controls={listId}
              aria-invalid={error ? true : undefined}
              aria-required={required || undefined}
              data-open={open ? "true" : undefined}
              onKeyDown={onTriggerKey}
              className={cn(
                "mst-control flex items-center gap-2 px-3 text-left",
                tone === "onBrand" && "mst-control--on-brand",
                !value && tone === "default" && "text-tinta-500",
                value && tone === "default" && "tabular-nums text-tinta-800",
                value && tone === "onBrand" && "tabular-nums",
              )}
            >
              <CalendarDays
                size={16}
                className={cn(
                  "mst-calendar-trigger-icon shrink-0",
                  tone === "default" && "text-[var(--text-subtle)]",
                )}
                aria-hidden
              />
              <span className="min-w-0 flex-1 truncate text-pretty">
                {display}
              </span>
              <ChevronDown
                size={16}
                className={cn(
                  "mst-calendar-trigger-icon shrink-0 opacity-70",
                  tone === "default" && "text-[var(--text-subtle)]",
                )}
                aria-hidden
              />
            </button>
          </PopoverTrigger>
          <PopoverContent
            id={listId}
            align="start"
            className="mst-calendar-popover w-[min(21rem,calc(100vw-2rem))] p-3"
            aria-label={label ?? "Calendario"}
          >
            {preview ? (
              <p className="mst-calendar-range-label mb-2" aria-live="polite">
                {preview}
              </p>
            ) : null}
            {modoRango ? (
              <Calendar
                mode="range"
                defaultMonth={defaultMonth}
                selected={selectedRange}
                today={dateCivilDesdeIso(hoyIso) ?? undefined}
                onDayIso={elegirIso}
                disabled={disabledDay}
              />
            ) : (
              <Calendar
                mode="single"
                defaultMonth={defaultMonth}
                selected={selectedSingle}
                today={dateCivilDesdeIso(hoyIso) ?? undefined}
                onDayIso={elegirIso}
                disabled={disabledDay}
              />
            )}
            {(presets.length > 0 || (clearable && value) || enPersonalizado) && (
              <div className="mt-2.5 flex flex-col gap-2 border-t border-[var(--border-subtle)] pt-2.5">
                {presets.length > 0 ? (
                  <div
                    className="flex flex-wrap justify-center gap-1.5"
                    role="group"
                    aria-label="Atajos de fecha"
                  >
                    {presets.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        className="mst-calendar-preset"
                        data-active={presetActivo === p.id ? "true" : undefined}
                        disabled={!dentroDeRango(p.iso, min, max)}
                        onClick={() => aplicarPreset(p.id)}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                ) : null}
                {enPersonalizado && modoRango ? (
                  <div className="flex justify-center">
                    <button
                      type="button"
                      className="min-h-10 rounded-pill px-3 text-sm font-semibold text-tinta-500 hover:bg-tinta-50"
                      onClick={cerrar}
                    >
                      Cancelar
                    </button>
                  </div>
                ) : clearable && value ? (
                  <div className="flex justify-center">
                    <button
                      type="button"
                      className="min-h-10 rounded-pill px-3 text-sm font-semibold text-tinta-500 hover:bg-tinta-50"
                      onClick={() => {
                        setPresetActivo(null);
                        setBorrador(null);
                        onChange("");
                        cerrar();
                      }}
                    >
                      Limpiar
                    </button>
                  </div>
                ) : null}
              </div>
            )}
          </PopoverContent>
        </Popover>
      </div>
    </Field>
  );
}

