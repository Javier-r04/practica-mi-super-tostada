"use client";

import { Check, ChevronDown, Search } from "lucide-react";
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { Field } from "@/components/ui/field";
import { cn } from "@/lib/utils";

export type DroplistOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

type Props = {
  id?: string;
  label?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  value: string;
  onChange: (value: string) => void;
  options: DroplistOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  /** Búsqueda local cuando la lista es larga (clientes, plantillas). */
  searchable?: boolean;
  searchPlaceholder?: string;
  emptyMessage?: string;
  name?: string;
};

export function Droplist({
  id: idProp,
  label,
  hint,
  error,
  required,
  value,
  onChange,
  options,
  placeholder = "Elegir…",
  disabled,
  className,
  searchable = false,
  searchPlaceholder = "Buscar…",
  emptyMessage = "Sin resultados",
  name,
}: Props) {
  const autoId = useId();
  const id = idProp ?? autoId;
  const listId = `${id}-listbox`;
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);

  const selected = options.find((o) => o.value === value);
  const filtradas = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return options;
    return options.filter((o) => o.label.toLowerCase().includes(needle));
  }, [options, q]);

  useEffect(() => {
    if (!open) return;
    setQ("");
    const idx = Math.max(
      0,
      filtradas.findIndex((o) => o.value === value),
    );
    setActive(idx === -1 ? 0 : idx);
    const t = window.setTimeout(() => {
      if (searchable) searchRef.current?.focus();
    }, 0);
    return () => window.clearTimeout(t);
    // Solo al abrir
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

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

  function elegir(next: string) {
    onChange(next);
    setOpen(false);
  }

  function mover(delta: number) {
    if (filtradas.length === 0) return;
    setActive((i) => {
      let next = i + delta;
      if (next < 0) next = filtradas.length - 1;
      if (next >= filtradas.length) next = 0;
      return next;
    });
  }

  function onTriggerKey(e: KeyboardEvent<HTMLButtonElement>) {
    if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setOpen(true);
    }
  }

  function onListKey(e: KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      mover(1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      mover(-1);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const opt = filtradas[active];
      if (opt && !opt.disabled) elegir(opt.value);
    } else if (e.key === "Home") {
      e.preventDefault();
      setActive(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setActive(filtradas.length - 1);
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
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listId}
          aria-invalid={error ? true : undefined}
          aria-required={required || undefined}
          data-open={open ? "true" : undefined}
          onClick={() => setOpen((v) => !v)}
          onKeyDown={onTriggerKey}
          className={cn(
            "mst-control flex items-center gap-2 px-3 text-left",
            !selected && "text-tinta-500",
            selected && "text-tinta-800",
          )}
        >
          <span className="min-w-0 flex-1 truncate">
            {selected?.label ?? placeholder}
          </span>
          <ChevronDown
            size={16}
            className={cn(
              "shrink-0 text-[var(--text-subtle)] transition-transform duration-control",
              open && "rotate-180",
            )}
            aria-hidden
          />
        </button>

        {open && (
          <div
            className="mst-popover absolute left-0 right-0 top-[calc(100%+6px)] max-h-[min(320px,50vh)] overflow-hidden"
            onKeyDown={onListKey}
          >
            {searchable && (
              <div className="flex items-center gap-2 border-b border-[var(--border-subtle)] px-3 py-2">
                <Search size={15} className="text-[var(--text-subtle)]" aria-hidden />
                <input
                  ref={searchRef}
                  type="search"
                  value={q}
                  onChange={(e) => {
                    setQ(e.target.value);
                    setActive(0);
                  }}
                  placeholder={searchPlaceholder}
                  aria-label={searchPlaceholder}
                  className="min-w-0 flex-1 border-0 bg-transparent text-sm outline-none placeholder:text-tinta-500"
                />
              </div>
            )}
            <ul
              id={listId}
              role="listbox"
              aria-labelledby={id}
              className="max-h-[min(280px,45vh)] overflow-auto py-1"
            >
              {filtradas.length === 0 ? (
                <li className="px-3 py-3 text-sm text-tinta-500">{emptyMessage}</li>
              ) : (
                filtradas.map((opt, i) => {
                  const isSelected = opt.value === value;
                  const isActive = i === active;
                  return (
                    <li key={opt.value || `__empty-${i}`} role="presentation">
                      <button
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        disabled={opt.disabled}
                        id={`${listId}-opt-${i}`}
                        className={cn(
                          "flex min-h-11 w-full items-center gap-2 px-3 text-left text-sm font-semibold",
                          isActive && "bg-marca-soft text-marca",
                          !isActive && isSelected && "text-marca",
                          !isActive && !isSelected && "text-tinta-800 hover:bg-tinta-50",
                          opt.disabled && "opacity-45",
                        )}
                        onMouseEnter={() => setActive(i)}
                        onClick={() => {
                          if (!opt.disabled) elegir(opt.value);
                        }}
                      >
                        <span className="min-w-0 flex-1 truncate">{opt.label}</span>
                        {isSelected ? (
                          <Check size={15} className="shrink-0 text-marca" aria-hidden />
                        ) : (
                          <span className="inline-block size-[15px] shrink-0" aria-hidden />
                        )}
                      </button>
                    </li>
                  );
                })
              )}
            </ul>
          </div>
        )}
      </div>
    </Field>
  );
}

/** Agrupa opciones estáticas cortas (sí / no, presets) sin búsqueda. */
export function DroplistGroup({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("grid gap-3 sm:grid-cols-2 lg:grid-cols-4", className)}>{children}</div>;
}
