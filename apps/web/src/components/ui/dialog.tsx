"use client";

import { X } from "lucide-react";
import { useEffect, useId, useRef, type ReactNode } from "react";

export function Dialog({
  open,
  title,
  description,
  children,
  footer,
  onClose,
  tone = "default",
}: {
  open: boolean;
  title: string;
  description?: string;
  children?: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
  tone?: "default" | "danger";
}) {
  const titleId = useId();
  const descId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const acento = tone === "danger" ? "var(--red-600)" : "var(--green-800)";

  useEffect(() => {
    if (!open) return;
    previousFocus.current = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseRef.current();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      previousFocus.current?.focus();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[var(--z-modal)] grid place-items-end bg-[var(--surface-overlay)] p-0 sm:place-items-center sm:p-4">
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        className="max-h-[100dvh] w-full overflow-auto rounded-t-tarjeta bg-blanco shadow-modal focus:outline-none sm:max-h-[90dvh] sm:max-w-[460px] sm:rounded-tarjeta"
        style={{ borderTop: `3px solid ${acento}` }}
      >
        <header className="flex items-start gap-3 px-5 pb-3 pt-5">
          <div className="flex-1">
            <h2 id={titleId} className="text-lg font-semibold text-wrap text-tinta-900">
              {title}
            </h2>
            {description && (
              <p id={descId} className="mt-1 text-sm leading-relaxed text-pretty text-tinta-500">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="inline-flex size-11 shrink-0 items-center justify-center rounded-campo text-tinta-500 hover:bg-tinta-50"
          >
            <X size={18} aria-hidden />
          </button>
        </header>
        {children && <div className="px-5 pb-4">{children}</div>}
        {footer && (
          <footer className="flex flex-wrap justify-end gap-2 border-t border-[var(--border-subtle)] bg-tinta-50 px-5 py-4">
            {footer}
          </footer>
        )}
      </div>
    </div>
  );
}
