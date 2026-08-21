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
}: {
  assetId: string;
  alt: string;
  variante?: Variante;
  className?: string;
}) {
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;
    setFailed(false);
    setSrc(null);

    void (async () => {
      try {
        const res = await fetch(
          `${API_URL}/assets/${assetId}?v=${variante}`,
          { credentials: "include", signal: AbortSignal.timeout(15_000) },
        );
        if (!res.ok) throw new Error("asset");
        const blob = await res.blob();
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [assetId, variante]);

  if (failed || !src) {
    return (
      <span
        className={cn("block bg-tinta-100", className)}
        aria-hidden={failed ? undefined : true}
        role={failed ? "img" : undefined}
        aria-label={failed ? alt : undefined}
      />
    );
  }

  return (
    // Outline sutil para que el borde no se funda con la superficie (feel-better).
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={cn("object-cover outline outline-1 outline-black/10 -outline-offset-1", className)}
    />
  );
}
