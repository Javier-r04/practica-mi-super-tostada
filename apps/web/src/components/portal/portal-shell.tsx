"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { Wordmark } from "@/components/brand/wordmark";
import { PortalNav } from "@/components/portal/portal-nav";
import { VentanaBadge } from "@/components/domain/ventana-badge";
import { VentanaCountdown } from "@/components/portal/ventana-countdown";
import { usePortalSession } from "@/components/portal/portal-session";
import { propsVentanaCountdown, propsVentanaPedido } from "@/lib/portal-vista";
import { cn } from "@/lib/utils";

type FooterCtx = {
  slot: HTMLElement | null;
  setActivo: (activo: boolean) => void;
};

const PortalFooterContext = createContext<FooterCtx | null>(null);

/**
 * Pie sticky del catálogo. Porta el contenido al chrome del layout para que
 * el header (y el logo) no se remonte al cambiar de pestaña.
 */
export function PortalFooter({ children }: { children: ReactNode }) {
  const ctx = useContext(PortalFooterContext);
  if (!ctx) {
    throw new Error("PortalFooter requiere PortalShell");
  }

  useLayoutEffect(() => {
    ctx.setActivo(true);
    return () => ctx.setActivo(false);
  }, [ctx]);

  if (!ctx.slot) return null;
  return createPortal(children, ctx.slot);
}

/* El portal lo abre el dueño del restaurante desde su teléfono, sin
   entrenamiento: una sola columna, medida de lectura corta y todo lo accionable
   por encima del pulgar (pie pegajoso + barra inferior).

   Montado una sola vez en el layout del token: el logo no se vuelve a pedir
   al cambiar Inicio ↔ Pedir ↔ Pedidos ↔ Cuenta. */
export function PortalShell({
  children,
  mainClassName,
}: {
  children: ReactNode;
  mainClassName?: string;
}) {
  const { sesion } = usePortalSession();
  const raiz = useRef<HTMLDivElement>(null);
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  const [footerActivo, setFooterActivo] = useState(false);
  const setActivo = useCallback((activo: boolean) => {
    setFooterActivo(activo);
  }, []);

  /* El `main` reserva abajo el alto del pie pegajoso. Ese alto se medía a mano
     en `--portal-footer-height` sumando paddings del markup: en cuanto el pie
     crece —un renglón de error, un botón más— el contenido se esconde detrás
     sin que nada lo delate. Se mide el nodo real y se reescribe el token. */
  useEffect(() => {
    const nodo = slot?.parentElement;
    const raizNodo = raiz.current;
    if (!nodo || !raizNodo) return;
    if (!footerActivo) {
      raizNodo.style.removeProperty("--portal-footer-height");
      return;
    }
    const medir = () => {
      raizNodo.style.setProperty(
        "--portal-footer-height",
        `${nodo.getBoundingClientRect().height}px`,
      );
    };
    medir();
    const observer = new ResizeObserver(medir);
    observer.observe(nodo);
    return () => observer.disconnect();
  }, [slot, footerActivo]);
  const footerCtx = useMemo(
    () => ({ slot, setActivo }),
    [slot, setActivo],
  );

  const ventanaPedido = propsVentanaPedido(sesion.ventana);
  const countdown = propsVentanaCountdown(sesion.ventana);
  const hayHorario = Boolean(countdown.cierraAt || countdown.abreAt);

  return (
    <PortalFooterContext.Provider value={footerCtx}>
      <div
        ref={raiz}
        className="flex min-h-[100dvh] w-full flex-col bg-[var(--surface-page)]"
      >
        <header className="sticky top-0 z-[var(--z-sticky)] flex h-14 shrink-0 items-center justify-between gap-2 bg-[var(--surface-brand)] px-4 sm:gap-3 lg:px-6">
          <Wordmark compact onBrand />
          <div className="flex min-w-0 flex-1 items-center justify-end gap-1.5 sm:gap-2">
            <p className="hidden min-w-0 truncate text-sm font-semibold text-blanco lg:block">
              {sesion.cliente.nombre}
            </p>
            {ventanaPedido.reabierta ? (
              <VentanaBadge size="sm" {...ventanaPedido} />
            ) : hayHorario ? (
              <VentanaCountdown
                {...countdown}
                variant="navbar"
                className="min-w-0 shrink"
              />
            ) : (
              <VentanaBadge size="sm" {...ventanaPedido} />
            )}
          </div>
        </header>
        <PortalNav variant="top" />
        <main
          className={cn(
            "mx-auto flex min-h-0 w-full max-w-[var(--page-max)] flex-1 flex-col px-4 lg:px-6 lg:pb-10",
            footerActivo
              ? "pb-[calc(var(--bottombar-height)+var(--portal-footer-height)+env(safe-area-inset-bottom,0px))]"
              : "pb-[calc(var(--bottombar-height)+1rem+env(safe-area-inset-bottom,0px))]",
            mainClassName,
          )}
        >
          {children}
        </main>
        <div
          className={cn(
            "sticky bottom-[calc(var(--bottombar-height)+env(safe-area-inset-bottom,0px))] z-[calc(var(--z-nav)-1)] border-t border-[var(--border-subtle)] bg-blanco shadow-[0_-2px_8px_rgba(23,25,15,.06)] lg:hidden",
            !footerActivo && "hidden",
          )}
        >
          <div
            ref={setSlot}
            className="mx-auto max-w-[var(--page-max)] px-4 py-3"
          />
        </div>
        <PortalNav variant="bottom" />
      </div>
    </PortalFooterContext.Provider>
  );
}
