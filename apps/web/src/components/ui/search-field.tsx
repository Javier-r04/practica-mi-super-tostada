"use client";

import { Search } from "lucide-react";
import { useId } from "react";
import { cn } from "@/lib/utils";

export function SearchField({
  value,
  onChange,
  placeholder = "Buscar",
  label = "Buscar",
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  className?: string;
}) {
  const id = useId();
  return (
    <div
      className={cn(
        "flex h-campo items-center gap-2 rounded-pill border border-[var(--border-default)] bg-blanco px-3",
        "shadow-[var(--shadow-inset-field)] transition-[border-color,box-shadow] duration-control ease-out",
        "focus-within:border-[var(--border-focus)] focus-within:shadow-foco",
        className,
      )}
    >
      <Search size={16} className="text-[var(--text-subtle)]" aria-hidden />
      <label className="sr-only" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="min-w-0 flex-1 border-0 bg-transparent text-sm outline-none placeholder:text-tinta-500"
      />
      {value ? (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Limpiar búsqueda"
          className="inline-flex size-8 items-center justify-center text-tinta-500"
        >
          ×
        </button>
      ) : null}
    </div>
  );
}
