"use client";

import { ChevronDown } from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

type ScrollFadeListaProps = {
  children: ReactNode;
  className?: string;
  ariaLabel?: string;
};

/**
 * Lista con altura acotada y desvanecido inferior mientras quede contenido
 * fuera de vista. El aviso desaparece al llegar al final del scroll.
 */
export function ScrollFadeLista({
  children,
  className,
  ariaLabel,
}: ScrollFadeListaProps) {
  const ref = useRef<HTMLUListElement>(null);
  const [hayMasAbajo, setHayMasAbajo] = useState(false);

  const actualizar = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const margen = 4;
    setHayMasAbajo(el.scrollHeight - el.scrollTop - el.clientHeight > margen);
  }, []);

  useEffect(() => {
    actualizar();
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(actualizar);
    observer.observe(el);
    return () => observer.disconnect();
  }, [actualizar, children]);

  return (
    <div className="relative">
      <ul
        ref={ref}
        onScroll={actualizar}
        className={className}
        aria-label={ariaLabel}
      >
        {children}
      </ul>
      {hayMasAbajo ? (
        <div
          className={cn(
            "pointer-events-none absolute inset-x-0 bottom-0 flex flex-col items-center justify-end",
            "bg-gradient-to-t from-blanco via-blanco/85 to-transparent pt-10 pb-1.5",
          )}
          aria-hidden
        >
          <span className="flex items-center gap-0.5 text-[11px] font-medium text-tinta-500">
            <ChevronDown size={14} strokeWidth={2.5} aria-hidden />
            Desliza para ver más
          </span>
        </div>
      ) : null}
    </div>
  );
}
