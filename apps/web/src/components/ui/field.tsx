import { cn } from "@/lib/utils";
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

export function Field({
  label,
  hint,
  error,
  required,
  htmlFor,
  children,
}: {
  label?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  htmlFor?: string;
  children: ReactNode;
}) {
  const hintId = htmlFor ? `${htmlFor}-hint` : undefined;
  const errorId = htmlFor ? `${htmlFor}-error` : undefined;
  return (
    <div className="grid gap-1.5">
      {label && (
        <label
          htmlFor={htmlFor}
          className="text-[12px] font-semibold uppercase tracking-[0.08em] text-tinta-500"
        >
          {label}
          {required ? (
            <span className="text-peligro" aria-hidden>
              {" "}
              *
            </span>
          ) : null}
        </label>
      )}
      {children}
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
}

const control =
  "h-campo w-full rounded-campo border border-[var(--border-default)] bg-blanco px-3 text-sm text-tinta-800 shadow-[var(--shadow-inset-field)] transition-[border-color,box-shadow] duration-control ease-out placeholder:text-tinta-500 focus:border-[var(--border-focus)] focus:shadow-foco focus:outline-none";

export function Input({
  label,
  hint,
  error,
  required,
  id,
  className,
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  hint?: string;
  error?: string;
}) {
  return (
    <Field label={label} hint={hint} error={error} required={required} htmlFor={id}>
      <input
        id={id}
        required={required}
        aria-required={required || undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={
          error && id ? `${id}-error` : hint && id ? `${id}-hint` : undefined
        }
        className={cn(control, error && "border-peligro", className)}
        {...rest}
      />
    </Field>
  );
}

export function Select({
  label,
  hint,
  error,
  required,
  id,
  children,
  className,
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  hint?: string;
  error?: string;
}) {
  return (
    <Field label={label} hint={hint} error={error} required={required} htmlFor={id}>
      <select
        id={id}
        required={required}
        aria-required={required || undefined}
        aria-invalid={error ? true : undefined}
        className={cn(control, error && "border-peligro", className)}
        {...rest}
      >
        {children}
      </select>
    </Field>
  );
}

export function Textarea({
  label,
  hint,
  error,
  required,
  id,
  className,
  ...rest
}: TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
  hint?: string;
  error?: string;
}) {
  return (
    <Field label={label} hint={hint} error={error} required={required} htmlFor={id}>
      <textarea
        id={id}
        required={required}
        aria-required={required || undefined}
        aria-invalid={error ? true : undefined}
        className={cn(
          control,
          "h-auto min-h-[88px] py-2",
          error && "border-peligro",
          className,
        )}
        {...rest}
      />
    </Field>
  );
}
