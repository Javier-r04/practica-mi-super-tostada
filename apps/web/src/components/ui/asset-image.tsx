"use client";

import { useEffect, useState } from "react";
import { API_URL } from "@/lib/api";
import { cn } from "@/lib/utils";

type Variante = "thumb" | "card";

export function AssetImage({
  assetId,
  alt,
  variante = "thumb",
  className,
  /** Path absoluto desde la API (p. ej. `/p/{token}/assets/{id}`). Sin cookie de staff. */
  srcPath,
}: {
  assetId: string;
  alt: string;
  variante?: Variante;
  className?: string;
  srcPath?: string;
}) {
  const path = srcPath ?? `/assets/${assetId}`;
  const url = `${API_URL}${path}${path.includes("?") ? "&" : "?"}v=${variante}`;

  // El resultado se guarda junto con la URL que lo produjo. Así cambiar de
  // asset no necesita un reset síncrono en el efecto: mientras `estado.url`
  // no coincida con la actual, lo que hay en pantalla es de otra imagen y se
  // trata como «cargando».
  const [estado, setEstado] = useState<{
    url: string;
    src: string | null;
    failed: boolean;
  }>({ url: "", src: null, failed: false });

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;

    void (async () => {
      try {
        const res = await fetch(url, {
          credentials: srcPath ? "omit" : "include",
          signal: AbortSignal.timeout(15_000),
        });
        if (!res.ok) throw new Error("asset");
        const blob = await res.blob();
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setEstado({ url, src: objectUrl, failed: false });
      } catch {
        if (!cancelled) setEstado({ url, src: null, failed: true });
      }
    })();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [url, srcPath]);

  const vigente = estado.url === url;
  const failed = vigente && estado.failed;
  const src = vigente ? estado.src : null;

  // Cargando y roto se pintaban igual, así que una foto lenta en el catálogo
  // era indistinguible de una que nunca va a llegar. La que carga late; la
  // que falló se queda quieta y con nombre accesible.
  if (failed) {
    return (
      <span
        className={cn("block bg-tinta-100", className)}
        role="img"
        aria-label={alt}
      />
    );
  }

  if (!src) {
    return (
      <span
        className={cn("block animate-pulse bg-tinta-100", className)}
        aria-hidden
      />
    );
  }

  return (
    // Outline sutil para que el borde no se funda con la superficie (feel-better).
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={cn(
        "object-cover outline outline-1 outline-black/10 -outline-offset-1",
        className,
      )}
    />
  );
}
