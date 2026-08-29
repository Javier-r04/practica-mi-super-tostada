import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

const tones = {
  default:
    "bg-blanco text-tinta-800 border-[var(--border-subtle)] shadow-tarjeta",
  paper: "bg-papel text-tinta-800 border-[var(--cream-500)] shadow-tarjeta",
  brand:
    "bg-[var(--surface-brand)] text-[var(--text-on-brand)] border-[var(--green-900)] shadow-modal",
  accent:
    "bg-blanco text-tinta-800 border-[var(--border-accent)] shadow-tarjeta",
};

export function Card({
  title,
  subtitle,
  actions,
  flush = false,
  tone = "default",
  children,
  className,
  id,
}: {
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  flush?: boolean;
  tone?: keyof typeof tones;
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  const onBrand = tone === "brand";
  return (
    <section
        className={cn(
          "flex flex-col overflow-hidden rounded-tarjeta border",
          tones[tone],
          className,
        )}
        id={id}
    >
      {(title || actions) && (
        <header
          className={cn(
            "flex shrink-0 flex-col gap-2 px-5 pt-5 sm:flex-row sm:items-center sm:justify-between",
            flush ? "pb-4" : "pb-1.5",
          )}
        >
          <div className="min-w-0">
            {title && (
              <h2
                className={cn(
                  "text-pretty text-base font-semibold leading-snug tracking-tight",
                  onBrand ? "text-blanco" : "text-tinta-900",
                )}
              >
                {title}
              </h2>
            )}
            {subtitle && (
              <p
                className={cn(
                  "mt-1 text-pretty text-xs leading-normal",
                  onBrand ? "text-[var(--green-200)]" : "text-tinta-500",
                )}
              >
                {subtitle}
              </p>
            )}
          </div>
          {actions && <div className="shrink-0">{actions}</div>}
        </header>
      )}
      <div
        className={cn(
          "min-h-0 flex-1",
          flush ? "p-0" : "px-5 pb-5 pt-2",
        )}
      >
        {children}
      </div>
    </section>
  );
}
