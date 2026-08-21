"use client";

import { Toaster as Sonner, toast } from "sonner";
import { ApiError } from "@/lib/api";

/**
 * Toaster global. Misma cápsula visual en toda la app;
 * solo cambia el texto vía `toastError` / `toastSuccess` / etc.
 */
export function Toaster() {
  return (
    <Sonner
      theme="light"
      position="top-center"
      closeButton
      duration={4500}
      visibleToasts={3}
      gap={10}
      offset={16}
      className="mst-toaster"
      toastOptions={{
        classNames: {
          toast: "mst-toast",
          title: "mst-toast-title",
          description: "mst-toast-description",
          icon: "mst-toast-icon",
          closeButton: "mst-toast-close",
          error: "mst-toast-error",
          success: "mst-toast-success",
          warning: "mst-toast-warning",
          info: "mst-toast-info",
        },
      }}
    />
  );
}

/** Error operativo: misma UI global, solo cambia el mensaje. */
export function toastError(message: string) {
  toast.error(message);
}

export function toastSuccess(message: string) {
  toast.success(message);
}

export function toastWarning(message: string) {
  toast.warning(message);
}

export function toastInfo(message: string) {
  toast.info(message);
}

function mensajeDeError(err: unknown, fallback: string): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof DOMException && err.name === "AbortError") {
    return "Sin respuesta del servidor. Intente de nuevo.";
  }
  if (err instanceof TypeError) {
    return "No hay conexión con el servidor.";
  }
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

/** Extrae mensaje de ApiError/Error o usa el fallback. */
export function toastFromError(err: unknown, fallback: string) {
  toastError(mensajeDeError(err, fallback));
}
