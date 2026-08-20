import type { ReactNode } from "react";
import { Inbox } from "lucide-react";

export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="grid justify-items-center gap-2 px-6 py-12 text-center">
      <span className="grid size-12 place-items-center rounded-full bg-marca-soft text-marca">
        {icon ?? <Inbox size={22} aria-hidden />}
      </span>
      <h3 className="text-base font-semibold text-wrap text-tinta-900">{title}</h3>
      {description && (
        <p className="max-w-[38ch] text-sm leading-relaxed text-pretty text-tinta-500">
          {description}
        </p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
