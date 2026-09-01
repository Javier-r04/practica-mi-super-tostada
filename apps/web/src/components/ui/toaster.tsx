"use client";

import type { ToastContentValue } from "@heroui/react";
import {
  Toast,
  toast,
  ToastContent,
  ToastDescription,
  ToastIndicator,
  ToastTitle,
} from "@heroui/react";
import { ApiError } from "@/lib/api";

/**
 * Toaster global basado en HeroUI v3.
 * Misma cápsula visual y firma unificada para toda la app.
 */
export function Toaster() {
  return (
    <Toast.Provider placement="top">
      {({ toast: toastItem }) => {
        const content = toastItem.content as ToastContentValue;
        return (
          <Toast
            className="rounded-xl border border-[var(--border-subtle)] bg-blanco/95 backdrop-blur-md shadow-lg"
            toast={toastItem}
            variant={content.variant}
          >
            <ToastContent>
              <div className="flex items-center gap-3">
                <ToastIndicator className="shrink-0" variant={content.variant} />
                <div className="flex flex-col gap-0.5 pe-4">
                  {content.title ? (
                    <ToastTitle className="text-sm font-semibold text-tinta-900">
                      {content.title}
                    </ToastTitle>
                  ) : null}
                  {content.description ? (
                    <ToastDescription className="text-sm font-medium text-tinta-600">
                      {content.description}
                    </ToastDescription>
                  ) : null}
                </div>
              </div>
            </ToastContent>
            <Toast.CloseButton className="absolute end-2 top-1/2 -translate-y-1/2 opacity-60 hover:opacity-100" />
          </Toast>
        );
      }}
    </Toast.Provider>
  );
}

/** Error operativo: misma UI global, solo cambia el mensaje. */
export function toastError(message: string, description?: string) {
  toast.danger(message, {
    description,
    timeout: 5000,
  });
}

export function toastSuccess(message: string, description?: string) {
  toast.success(message, {
    description,
    timeout: 4000,
  });
}

export function toastWarning(message: string, description?: string) {
  toast.warning(message, {
    description,
    timeout: 4500,
  });
}

export function toastInfo(message: string, description?: string) {
  toast.info(message, {
    description,
    timeout: 4000,
  });
}

function mensajeDeError(err: unknown, fallback?: unknown): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof DOMException && err.name === "AbortError") {
    return "Sin respuesta del servidor. Intente de nuevo.";
  }
  if (err instanceof TypeError) {
    return "No hay conexión con el servidor.";
  }
  if (err instanceof Error && err.message) return err.message;
  return typeof fallback === "string" ? fallback : "Ocurrió un error inesperado";
}

/** Toast con estados loading → success/error para operaciones async. */
export function toastPromise<T>(
  promise: Promise<T> | (() => Promise<T>),
  options: {
    loading: string;
    loadingDescription?: string;
    success: string;
    successDescription?: string;
    error?: string;
  },
) {
  const contenido = (titulo: string, descripcion?: string) =>
    descripcion ? (
      <span className="grid gap-0.5">
        <span className="block font-semibold">{titulo}</span>
        <span className="block text-sm font-medium text-tinta-600">
          {descripcion}
        </span>
      </span>
    ) : (
      titulo
    );

  return toast.promise(promise, {
    loading: contenido(options.loading, options.loadingDescription),
    success: contenido(options.success, options.successDescription),
    error: (err) =>
      contenido(
        mensajeDeError(err, options.error ?? "No se pudo completar"),
        undefined,
      ),
  });
}

/** Extrae mensaje de ApiError/Error o usa el fallback. */
export function toastFromError(err: unknown, fallback?: unknown) {
  toastError(mensajeDeError(err, fallback));
}

