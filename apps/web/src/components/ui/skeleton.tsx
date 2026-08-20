import { cn } from "@/lib/utils";

export function Skeleton({
  className,
}: {
  className?: string;
}) {
  return (
    <div
      aria-hidden
      className={cn(
        "rounded-campo bg-[var(--ink-100)]",
        "motion-safe:animate-pulse",
        className,
      )}
    />
  );
}

export function RowSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <ul aria-hidden>
      {Array.from({ length: rows }, (_, i) => (
        <li
          key={i}
          className="flex min-h-fila items-center gap-3 border-b border-[var(--border-subtle)] px-4"
        >
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 flex-1" />
          <Skeleton className="hidden h-3 w-16 sm:block" />
        </li>
      ))}
    </ul>
  );
}
