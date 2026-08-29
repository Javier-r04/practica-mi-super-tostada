"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Smartphone } from "lucide-react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
};

const MQ_STANDALONE = "(display-mode: standalone)";

function suscribirDisplayMode(onChange: () => void): () => void {
  const mq = window.matchMedia(MQ_STANDALONE);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

function leerStandalone(): boolean {
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return window.matchMedia(MQ_STANDALONE).matches || nav.standalone === true;
}

/** El user-agent no cambia en vida de la pestaña: no hay a qué suscribirse. */
function sinSuscripcion(): () => void {
  return () => {};
}

function leerIos(): boolean {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

export function ChipInstalar() {
  const [evento, setEvento] = useState<BeforeInstallPromptEvent | null>(null);
  // Se leen con useSyncExternalStore en vez de copiarlos a estado en un
  // efecto: son datos que viven en el navegador, y el snapshot de servidor
  // (`standalone = true`) hace que el chip no se pinte hasta hidratar.
  const standalone = useSyncExternalStore(
    suscribirDisplayMode,
    leerStandalone,
    () => true,
  );
  const ios = useSyncExternalStore(sinSuscripcion, leerIos, () => false);

  useEffect(() => {
    function onPrompt(e: Event) {
      e.preventDefault();
      setEvento(e as BeforeInstallPromptEvent);
    }
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (standalone) return null;

  if (evento) {
    return (
      <button
        type="button"
        onClick={() => void evento.prompt()}
        className="inline-flex min-h-9 items-center gap-1.5 rounded-pill border border-[var(--border-default)] bg-blanco px-3 text-xs font-semibold text-marca"
      >
        <Smartphone size={14} aria-hidden />
        Agregar a inicio
      </button>
    );
  }

  if (ios) {
    return (
      <p className="text-xs text-tinta-500">
        Compartir → Agregar a pantalla de inicio
      </p>
    );
  }

  return null;
}
