"use client";

import { cn } from "@/lib/utils";

export type SegmentOption<T extends string> = {
  id: T;
  label: string;
  /** Contador opcional (p. ej. facturas en un tab). */
  count?: number;
};

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
  className,
  fullWidth,
}: {
  options: readonly SegmentOption<T>[];
  value: T;
  onChange: (id: T) => void;
  label: string;
  className?: string;
  /** En mobile, cada opción ocupa el mismo ancho. */
  fullWidth?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap gap-0.5 rounded-pill bg-[var(--ink-100)] p-1",
        fullWidth ? "w-full" : "inline-flex",
        className,
      )}
      role="tablist"
      aria-label={label}
    >
      {options.map((opt) => {
        const selected = value === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(opt.id)}
            className={cn(
              "inline-flex min-h-10 items-center justify-center gap-1.5 rounded-pill px-3.5 text-sm font-semibold",
              "transition-[background-color,color,box-shadow] duration-control ease-out",
              "focus-visible:outline-none focus-visible:shadow-foco",
              fullWidth && "flex-1 sm:flex-none",
              selected
                ? "bg-blanco text-tinta-900 shadow-[var(--shadow-xs)]"
                : "text-tinta-500 hover:bg-blanco/70 hover:text-tinta-800",
            )}
          >
            {opt.label}
            {opt.count != null ? (
              <span
                className={cn(
                  "tabular-nums text-xs font-semibold",
                  selected ? "text-tinta-500" : "text-tinta-400",
                )}
              >
                {opt.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
