import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "green" | "amber";
}) {
  const tones = {
    neutral: "bg-[var(--ink-100)] text-[var(--ink-600)]",
    green: "bg-[var(--green-100)] text-[var(--green-700)]",
    amber: "bg-[var(--amber-100)] text-[var(--amber-700)]",
  };
  return (
    <span
      className={cn(
        "inline-flex h-[22px] items-center rounded-pill px-2 text-[12px] font-semibold uppercase tracking-[0.08em]",
        tones[tone],
      )}
    >
      {children}
    </span>
  );
}

export function Tag({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex h-7 items-center rounded-pill border border-[var(--green-200)] bg-[var(--green-50)] px-2 text-xs font-semibold text-marca">
      {children}
    </span>
  );
}
