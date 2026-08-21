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
        "mst-search flex h-campo min-w-0 w-full items-center gap-2.5 rounded-pill",
        "bg-[var(--ink-100)] px-4",
        "transition-[background-color,box-shadow] duration-control ease-out",
        "hover:bg-[var(--ink-200)]",
        "focus-within:bg-blanco focus-within:shadow-foco",
        className,
      )}
    >
      <Search size={16} className="shrink-0 text-[var(--text-subtle)]" aria-hidden />
      <label className="sr-only" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        enterKeyHint="search"
        autoComplete="off"
        className={cn(
          "mst-search__input min-w-0 flex-1 appearance-none bg-transparent",
          "border-0 p-0 text-sm text-tinta-800 shadow-none",
          "outline-none ring-0",
          "placeholder:text-tinta-500",
          "focus:border-0 focus:outline-none focus:ring-0 focus:shadow-none",
          "focus-visible:border-0 focus-visible:outline-none focus-visible:ring-0 focus-visible:shadow-none",
        )}
      />
      {value ? (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Limpiar búsqueda"
          className="inline-flex size-8 shrink-0 items-center justify-center rounded-full text-tinta-500 transition-colors hover:bg-[var(--ink-100)] hover:text-tinta-800 focus-visible:outline-none focus-visible:shadow-foco"
        >
          ×
        </button>
      ) : null}
    </div>
  );
}
