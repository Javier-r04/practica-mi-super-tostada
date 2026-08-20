"use client";

import { cn } from "@/lib/utils";

export function QuantityStepper({
  value,
  onChange,
  min = 0,
  max = 9999,
  unidad,
  disabled = false,
}: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  unidad?: string;
  disabled?: boolean;
}) {
  const set = (next: number) => {
    const clamped = Math.min(max, Math.max(min, Math.trunc(next)));
    onChange(clamped);
  };

  return (
    <div
      className={cn(
        "inline-flex h-11 overflow-hidden rounded-campo border border-[var(--border-default)] bg-blanco",
        disabled && "opacity-45",
      )}
    >
      <button
        type="button"
        aria-label="Restar"
        disabled={disabled || value <= min}
        onClick={() => set(value - 1)}
        className="grid size-11 shrink-0 place-items-center text-lg font-semibold text-marca disabled:cursor-not-allowed disabled:text-tinta-500"
      >
        −
      </button>
      <span className="flex min-w-[68px] items-baseline justify-center gap-1 border-x border-[var(--border-subtle)] pt-2.5">
        <span className="text-sm font-semibold tabular-nums text-tinta-900">
          {value}
        </span>
        {unidad ? (
          <span className="text-[12px] font-semibold lowercase text-tinta-500">
            {unidad}
          </span>
        ) : null}
      </span>
      <button
        type="button"
        aria-label="Sumar"
        disabled={disabled || value >= max}
        onClick={() => set(value + 1)}
        className="grid size-11 shrink-0 place-items-center text-lg font-semibold text-marca disabled:cursor-not-allowed disabled:text-tinta-500"
      >
        +
      </button>
    </div>
  );
}
