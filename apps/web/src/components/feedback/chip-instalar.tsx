"use client";

import { useEffect, useState } from "react";
import { Smartphone } from "lucide-react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
};

export function ChipInstalar() {
  const [evento, setEvento] = useState<BeforeInstallPromptEvent | null>(null);
  const [standalone, setStandalone] = useState(true);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(display-mode: standalone)");
    const nav = window.navigator as Navigator & { standalone?: boolean };
    setStandalone(mq.matches || nav.standalone === true);
    setIos(/iphone|ipad|ipod/i.test(window.navigator.userAgent));
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
