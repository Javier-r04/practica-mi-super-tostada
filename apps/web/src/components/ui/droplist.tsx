"use client";

import { Check, ChevronDown, Search } from "lucide-react";
import {
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { Field } from "@/components/ui/field";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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

  /**
   * El reset va en el cambio de apertura, no en un efecto sobre `open`: es la
   * misma interacción del usuario, y así el listado nunca se pinta un frame
   * con el filtro de la vez anterior.
   */
  function cambiarApertura(next: boolean) {
    if (next) {
      setQ("");
      const idx = options.findIndex((o) => o.value === value);
      setActive(idx < 0 ? 0 : idx);
    }
    setOpen(next);
  }

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
      cambiarApertura(true);
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
      <div className={cn("relative", className)}>
        <input type="hidden" name={name} value={value} />
        <Popover open={open} onOpenChange={cambiarApertura} modal>
          <PopoverTrigger asChild>
            <button
              id={id}
              type="button"
              role="combobox"
              disabled={disabled}
              aria-haspopup="listbox"
              aria-expanded={open}
              aria-controls={listId}
              aria-invalid={error ? true : undefined}
              aria-required={required || undefined}
              data-open={open ? "true" : undefined}
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
          </PopoverTrigger>

          <PopoverContent
            align="start"
            side="bottom"
            sideOffset={6}
            collisionPadding={12}
            onKeyDown={onListKey}
            onOpenAutoFocus={(e) => {
              if (!searchable) return;
              e.preventDefault();
              searchRef.current?.focus();
            }}
            className="w-[var(--radix-popover-trigger-width)] max-h-[min(320px,50vh)] overflow-hidden"
          >
            {searchable && (
              <div className="px-2 pb-1 pt-2">
                <div className="mst-search flex h-9 items-center gap-2 rounded-pill bg-[var(--ink-100)] px-3">
                  <Search
                    size={15}
                    className="shrink-0 text-[var(--text-subtle)]"
                    aria-hidden
                  />
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
                    autoComplete="off"
                    className="mst-search__input min-w-0 flex-1 appearance-none border-0 bg-transparent p-0 text-sm text-tinta-800 shadow-none outline-none placeholder:text-tinta-500"
                  />
                </div>
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
          </PopoverContent>
        </Popover>
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
