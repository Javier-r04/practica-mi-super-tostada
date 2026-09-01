"use client";

import { useId, useState, useEffect, useRef } from "react";
import { Clock, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Field } from "./field";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

type Props = {
  id?: string;
  label?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  value: string; // formato "HH:mm" (24h)
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
  name?: string;
};

export function TimeField({
  id: idProp,
  label,
  hint,
  error,
  required,
  value,
  onChange,
  disabled,
  className,
  name,
}: Props) {
  const autoId = useId();
  const id = idProp ?? autoId;
  const panelId = `${id}-panel`;
  const [open, setOpen] = useState(false);

  const val = value || "00:00";
  const [hStr, mStr] = val.split(":");
  const h = hStr || "00";
  const m = mStr || "00";

  const display = value || "--:--";

  const hoursRef = useRef<HTMLDivElement>(null);
  const minsRef = useRef<HTMLDivElement>(null);

  // Auto-scroll a la selección cuando se abre
  useEffect(() => {
    if (open) {
      setTimeout(() => {
        const hBtn = hoursRef.current?.querySelector(`[data-selected="true"]`);
        const mBtn = minsRef.current?.querySelector(`[data-selected="true"]`);
        if (hBtn) hBtn.scrollIntoView({ block: "center" });
        if (mBtn) mBtn.scrollIntoView({ block: "center" });
      }, 0);
    }
  }, [open]);

  return (
    <Field label={label} hint={hint} error={error} required={required} htmlFor={id}>
      <div className={cn("relative", className)}>
        <input type="hidden" name={name} value={value} />
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button
              id={id}
              type="button"
              role="combobox"
              disabled={disabled}
              aria-haspopup="dialog"
              aria-expanded={open}
              aria-controls={panelId}
              aria-invalid={error ? true : undefined}
              aria-required={required || undefined}
              className={cn(
                "mst-control flex items-center gap-2 px-3 text-left",
                !value && "text-tinta-500",
                value && "tabular-nums text-tinta-800"
              )}
            >
              <Clock
                size={16}
                className="mst-calendar-trigger-icon shrink-0 text-[var(--text-subtle)]"
                aria-hidden
              />
              <span className="min-w-0 flex-1 truncate text-pretty">
                {display}
              </span>
              <ChevronDown
                size={16}
                className={cn(
                  "mst-calendar-trigger-icon shrink-0 opacity-70 text-[var(--text-subtle)] transition-transform",
                  open && "rotate-180"
                )}
                aria-hidden
              />
            </button>
          </PopoverTrigger>
          <PopoverContent
            id={panelId}
            align="start"
            className="w-[14rem] p-0 overflow-hidden"
          >
            <div className="flex bg-[var(--ink-50)] text-xs font-semibold text-tinta-500 border-b border-[var(--border-subtle)]">
              <div className="flex-1 py-1.5 text-center">Horas</div>
              <div className="flex-1 py-1.5 text-center">Minutos</div>
            </div>
            <div className="flex h-56">
              <div ref={hoursRef} className="flex-1 overflow-y-auto [scrollbar-hide::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] border-r border-[var(--border-subtle)] py-2">
                {Array.from({ length: 24 }).map((_, i) => {
                  const hh = i.toString().padStart(2, "0");
                  const isSelected = hh === h;
                  return (
                    <button
                      key={hh}
                      type="button"
                      data-selected={isSelected}
                      className={cn(
                        "w-full py-2 text-center text-sm tabular-nums transition-colors",
                        isSelected ? "bg-marca text-blanco font-semibold" : "text-tinta-800 hover:bg-tinta-50"
                      )}
                      onClick={() => onChange(`${hh}:${m}`)}
                    >
                      {hh}
                    </button>
                  );
                })}
              </div>
              <div ref={minsRef} className="flex-1 overflow-y-auto [scrollbar-hide::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] py-2">
                {Array.from({ length: 60 }).map((_, i) => {
                  const mm = i.toString().padStart(2, "0");
                  const isSelected = mm === m;
                  return (
                    <button
                      key={mm}
                      type="button"
                      data-selected={isSelected}
                      className={cn(
                        "w-full py-2 text-center text-sm tabular-nums transition-colors",
                        isSelected ? "bg-marca text-blanco font-semibold" : "text-tinta-800 hover:bg-tinta-50"
                      )}
                      onClick={() => onChange(`${h}:${mm}`)}
                    >
                      {mm}
                    </button>
                  );
                })}
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </Field>
  );
}
