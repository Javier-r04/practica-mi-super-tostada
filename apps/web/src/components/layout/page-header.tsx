import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function PageToolbar({
  description,
  meta,
  actions,
  className,
}: {
  description?: string;
  meta?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0">
        {description && (
          <p className="max-w-[62ch] text-sm text-pretty text-tinta-500">
            {description}
          </p>
        )}
        {meta && (
          <p className={cn("mst-label", description && "mt-1")}>
            {meta}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      )}
    </div>
  );
}
