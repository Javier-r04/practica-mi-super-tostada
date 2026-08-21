"use client";

import { cn } from "@/lib/utils";

const sizes = {
  md: { wrap: "h-11", btn: "size-11", value: "min-w-[68px] pt-2.5 text-sm" },
  lg: { wrap: "h-[52px]", btn: "size-[52px]", value: "min-w-[76px] pt-3 text-base" },
};

export function QuantityStepper({
  value,
  onChange,
  min = 0,
  max = 9999,
  unidad,
  disabled = false,
  size = "md",
}: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  unidad?: string;
  disabled?: boolean;
  size?: "md" | "lg";
}) {
  const set = (next: number) => {
    const clamped = Math.min(max, Math.max(min, Math.trunc(next)));
    onChange(clamped);
  };
  const s = sizes[size];

  return (
    <div
      className={cn(
        "inline-flex overflow-hidden rounded-campo border border-[var(--border-default)] bg-blanco",
        s.wrap,
        disabled && "opacity-45",
      )}
    >
      <button
        type="button"
        aria-label="Restar"
        disabled={disabled || value <= min}
        onClick={() => set(value - 1)}
        className={cn(
          "grid shrink-0 place-items-center text-lg font-semibold text-marca disabled:cursor-not-allowed disabled:text-tinta-500",
          "focus-visible:outline-none focus-visible:shadow-foco",
          s.btn,
        )}
      >
        −
      </button>
      <span className={cn("flex items-baseline justify-center gap-1 border-x border-[var(--border-subtle)]", s.value)}>
        <span className="font-semibold tabular-nums text-tinta-900">{value}</span>
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
        className={cn(
          "grid shrink-0 place-items-center text-lg font-semibold text-marca disabled:cursor-not-allowed disabled:text-tinta-500",
          "focus-visible:outline-none focus-visible:shadow-foco",
          s.btn,
        )}
      >
        +
      </button>
    </div>
  );
}
