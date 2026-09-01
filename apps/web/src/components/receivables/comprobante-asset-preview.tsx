"use client";

import { ZoomIn } from "lucide-react";
import { useState } from "react";
import { AssetImage } from "@/components/ui/asset-image";
import { api } from "@/lib/api";
import { toastFromError } from "@/lib/toast";
import { cn } from "@/lib/utils";

/** Vista inline de un comprobante ya guardado (panel / bandeja). */
export function ComprobanteAssetPreview({
  assetId,
  alt,
  srcPath,
  className,
}: {
  assetId: string;
  alt: string;
  /** Ruta absoluta desde la API (p. ej. portal sin cookie de staff). */
  srcPath?: string;
  className?: string;
}) {
  const [abriendo, setAbriendo] = useState(false);

  async function abrirCompleto() {
    if (abriendo) return;
    setAbriendo(true);
    try {
      const base = srcPath ?? `/assets/${assetId}`;
      const { url } = await api<{ url: string }>(`${base}/url`, {
        credentials: srcPath ? "omit" : "include",
      });
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (err) {
      toastFromError(err, "No se pudo abrir el comprobante");
    } finally {
      setAbriendo(false);
    }
  }

  return (
    <button
      type="button"
      disabled={abriendo}
      onClick={() => void abrirCompleto()}
      className={cn(
        "group relative min-h-40 w-full cursor-pointer overflow-hidden rounded-campo bg-tinta-100",
        "border border-transparent transition-colors duration-control",
        "hover:border-[var(--border-accent)] focus-visible:border-[var(--border-accent)] focus-visible:shadow-foco focus-visible:outline-none",
        "disabled:cursor-wait disabled:opacity-80",
        className,
      )}
      aria-label={`${alt}. Ver imagen completa`}
    >
      <AssetImage
        assetId={assetId}
        alt={alt}
        variante="card"
        srcPath={srcPath}
        className="absolute inset-0 size-full object-contain p-2"
      />
      <span
        className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-center gap-1.5 bg-gradient-to-t from-tinta-900/50 to-transparent px-3 py-2 text-xs font-medium text-blanco"
        aria-hidden
      >
        <ZoomIn size={14} strokeWidth={2} />
        Ver completo
      </span>
    </button>
  );
}
