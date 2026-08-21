"use client";

import { Camera, ImagePlus, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { AssetImage } from "@/components/ui/asset-image";
import { cn } from "@/lib/utils";

export function FotoPicker({
  label = "Foto del restaurante",
  hint = "JPEG, PNG o WebP. Opcional.",
  value,
  existingAssetId,
  onChange,
  onClearExisting,
  disabled,
  shape = "circle",
  className,
}: {
  label?: string;
  hint?: string;
  value: File | null;
  existingAssetId?: string | null;
  onChange: (file: File | null) => void;
  onClearExisting?: () => void;
  disabled?: boolean;
  /** circle = restaurante; rounded = producto / SKU */
  shape?: "circle" | "rounded";
  className?: string;
}) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!value) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(value);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [value]);

  const showingExisting = !value && Boolean(existingAssetId);
  const hasImage = Boolean(preview || showingExisting);

  return (
    <div className={cn("grid gap-2", className)}>
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={inputId} className="mst-label">
          {label}
        </label>
        {hint && <span className="text-xs text-tinta-500">{hint}</span>}
      </div>

      <div className="flex items-center gap-4">
        <button
          type="button"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
          className={cn(
            "relative grid size-20 shrink-0 place-items-center overflow-hidden",
            shape === "circle" ? "rounded-full" : "rounded-campo",
            "border border-dashed border-[var(--border-default)] bg-tinta-50",
            "text-tinta-500 transition-[border-color,background-color,color] duration-150 ease-out",
            "hover:border-marca hover:bg-marca-soft hover:text-marca",
            "disabled:pointer-events-none disabled:opacity-50",
            "focus-visible:outline-none focus-visible:shadow-foco",
            hasImage && "border-solid border-[var(--border-subtle)]",
          )}
          aria-label={hasImage ? "Cambiar foto" : "Agregar foto"}
        >
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={preview}
              alt=""
              className="absolute inset-0 size-full object-cover outline outline-1 outline-black/10 -outline-offset-1"
            />
          ) : showingExisting && existingAssetId ? (
            <AssetImage
              assetId={existingAssetId}
              alt=""
              variante="thumb"
              className="absolute inset-0 size-full"
            />
          ) : (
            <ImagePlus size={22} aria-hidden strokeWidth={1.5} />
          )}
        </button>

        <div className="flex min-w-0 flex-1 flex-wrap gap-2">
          <button
            type="button"
            disabled={disabled}
            onClick={() => inputRef.current?.click()}
            className="inline-flex min-h-11 items-center gap-2 rounded-campo border border-[var(--border-default)] bg-blanco px-3 text-sm font-semibold text-tinta-800 hover:bg-tinta-50 disabled:opacity-50"
          >
            <Camera size={16} aria-hidden strokeWidth={1.5} />
            {hasImage ? "Cambiar" : "Elegir foto"}
          </button>
          {hasImage && (
            <button
              type="button"
              disabled={disabled}
              onClick={() => {
                onChange(null);
                // Si hay asset en servidor, "Quitar" siempre implica quitarlo
                // (también tras elegir un archivo nuevo y cancelar).
                if (existingAssetId) onClearExisting?.();
                if (inputRef.current) inputRef.current.value = "";
              }}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-campo px-3 text-sm font-semibold text-tinta-500 hover:bg-tinta-50 hover:text-peligro disabled:opacity-50"
            >
              <X size={15} aria-hidden />
              Quitar
            </button>
          )}
        </div>
      </div>

      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        disabled={disabled}
        onChange={(e) => {
          const file = e.target.files?.[0] ?? null;
          onChange(file);
        }}
      />
    </div>
  );
}
