"use client";

import { useLayoutEffect, useState } from "react";

/** Mismo corte que `lg:` de Tailwind: es el interruptor móvil/escritorio del repo. */
const CONSULTA = "(min-width: 1024px)";

/**
 * Escritorio según el breakpoint `lg`, no según el puntero (para eso está
 * `useEsMobile`). Existe porque hay decisiones que CSS no puede tomar sola:
 * el catálogo del portal pide la foto en `?v=thumb` o en `?v=card` según el
 * layout, y montar los dos árboles para dejar uno en `display:none` hacía que
 * el teléfono descargara cada foto dos veces.
 *
 * Se mide en `useLayoutEffect` y no en `useEffect` para que el primer pintado
 * ya tenga el valor bueno: cuando el catálogo monta, la sesión del portal ya
 * resolvió, así que nunca llega a pintarse con el valor por defecto.
 */
export function useAnchoLg(): boolean {
  const [esLg, setEsLg] = useState(false);

  useLayoutEffect(() => {
    const mq = window.matchMedia(CONSULTA);
    const actualizar = () => setEsLg(mq.matches);
    actualizar();
    mq.addEventListener("change", actualizar);
    return () => mq.removeEventListener("change", actualizar);
  }, []);

  return esLg;
}
