"use client";

import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "size"> & {
  label?: ReactNode;
  hint?: string;
  error?: string;
  size?: "sm" | "md" | "lg";
};

export const Checkbox = forwardRef<HTMLInputElement, Props>(function Checkbox(
  {
    id: idProp,
    label,
    hint,
    error,
    size = "md",
    className,
    disabled,
    required,
    ...rest
  },
  ref,
) {
  const autoId = useId();
  const id = idProp ?? autoId;
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;

  return (
    <div className={cn("grid gap-1", className)}>
      <label
        htmlFor={id}
        className={cn(
          "inline-flex max-w-full items-center gap-2.5 text-sm text-tinta-800",
          size === "md" && "min-h-tap",
          size === "lg" && "min-h-tap",
          disabled ? "cursor-not-allowed opacity-45" : "cursor-pointer",
        )}
      >
        <input
          ref={ref}
          id={id}
          type="checkbox"
          disabled={disabled}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : hint ? hintId : undefined}
          className={cn(
            "mst-checkbox",
            label != null && "mt-0.5 self-start",
            size === "sm" && "mst-checkbox--sm",
            size === "lg" && "mst-checkbox--lg",
          )}
          {...rest}
        />
        {label != null && (
          <span className="min-w-0 flex-1 pt-px font-semibold leading-snug text-pretty">
            {label}
            {required ? (
              <span className="text-peligro" aria-hidden>
                {" "}
                *
              </span>
            ) : null}
          </span>
        )}
      </label>
      {error && (
        <span id={errorId} className="text-xs text-peligro" role="alert">
          {error}
        </span>
      )}
      {!error && hint && (
        <span id={hintId} className="text-xs text-tinta-500">
          {hint}
        </span>
      )}
    </div>
  );
});

type ChecklistItem = {
  id: string;
  label: ReactNode;
  checked: boolean;
  disabled?: boolean;
  hint?: string;
};

/** Lista de checks táctiles para filtros o preferencias (no sustituye tablas densas). */
export function Checklist({
  items,
  onChange,
  className,
  label,
}: {
  items: ChecklistItem[];
  onChange: (id: string, checked: boolean) => void;
  className?: string;
  label?: string;
}) {
  const groupLabel = useId();
  return (
    <fieldset
      className={cn(
        "grid gap-1 rounded-campo border border-[var(--border-subtle)] bg-blanco p-2",
        className,
      )}
      aria-labelledby={label ? groupLabel : undefined}
    >
      {label ? (
        <legend id={groupLabel} className="mst-label mb-1 px-1">
          {label}
        </legend>
      ) : null}
      {items.map((item) => (
        <Checkbox
          key={item.id}
          id={item.id}
          label={item.label}
          hint={item.hint}
          checked={item.checked}
          disabled={item.disabled}
          size="md"
          className="rounded-campo px-2 py-1 hover:bg-tinta-50"
          onChange={(e) => onChange(item.id, e.target.checked)}
        />
      ))}
    </fieldset>
  );
}
