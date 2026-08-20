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
}: {
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  flush?: boolean;
  tone?: keyof typeof tones;
  children: ReactNode;
  className?: string;
}) {
  const onBrand = tone === "brand";
  return (
    <section
      className={cn(
        "overflow-hidden rounded-tarjeta border",
        tones[tone],
        className,
      )}
    >
      {(title || actions) && (
        <header className="flex flex-col gap-3 px-5 pt-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            {title && (
              <h2
                className={cn(
                  "text-base font-semibold",
                  onBrand ? "text-blanco" : "text-tinta-900",
                )}
              >
                {title}
              </h2>
            )}
            {subtitle && (
              <p
                className={cn(
                  "mt-0.5 text-xs",
                  onBrand ? "text-[var(--green-200)]" : "text-tinta-500",
                )}
              >
                {subtitle}
              </p>
            )}
          </div>
          {actions}
        </header>
      )}
      <div className={cn(flush ? "p-0" : "p-5", title && !flush && "pt-4")}>
        {children}
      </div>
    </section>
  );
}
