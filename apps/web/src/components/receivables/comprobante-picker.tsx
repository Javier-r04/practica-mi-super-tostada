"use client";

import { Button, Modal } from "@heroui/react";
import { Camera, FolderOpen, ImageIcon, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useEsMobile } from "@/hooks/use-es-mobile";
import { cn } from "@/lib/utils";

const MIME_COMPROBANTE = "image/jpeg,image/png,image/webp";

type OrigenArchivo = "camara" | "galeria" | "archivos";

const OPCIONES_ORIGEN: {
  id: OrigenArchivo;
  label: string;
  descripcion: string;
  icon: typeof Camera;
}[] = [
  {
    id: "camara",
    label: "Abrir cámara",
    descripcion: "Tomar foto del comprobante",
    icon: Camera,
  },
  {
    id: "galeria",
    label: "Abrir galería",
    descripcion: "Elegir una foto guardada",
    icon: ImageIcon,
  },
  {
    id: "archivos",
    label: "Explorador de archivos",
    descripcion: "Buscar imagen en el dispositivo",
    icon: FolderOpen,
  },
];

export function ComprobantePicker({
  label,
  hint,
  placeholder,
  value,
  onChange,
  disabled,
  className,
  /** Portal: en móvil pregunta cámara/galería/archivos; en desktop abre el explorador. */
  selectorOrigen = false,
}: {
  label?: string;
  hint?: string;
  placeholder?: string;
  value: File | null;
  onChange: (file: File | null) => void;
  disabled?: boolean;
  className?: string;
  selectorOrigen?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const camaraRef = useRef<HTMLInputElement>(null);
  const galeriaRef = useRef<HTMLInputElement>(null);
  const archivosRef = useRef<HTMLInputElement>(null);
  const [selectorAbierto, setSelectorAbierto] = useState(false);
  const esMobile = useEsMobile();
  const promptMovil = selectorOrigen && esMobile;

  const textoPlaceholder = useMemo(() => {
    if (placeholder !== undefined) return placeholder;
    if (selectorOrigen) {
      return esMobile
        ? "Toque para elegir cámara, galería o archivos"
        : "Haga clic para elegir un archivo";
    }
    return "Toque para tomar o elegir foto del comprobante";
  }, [placeholder, selectorOrigen, esMobile]);

  const previewUrl = useMemo(
    () => (value ? URL.createObjectURL(value) : null),
    [value],
  );

  useEffect(() => {
    if (!previewUrl) return;
    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  function limpiarInputs() {
    for (const ref of [inputRef, camaraRef, galeriaRef, archivosRef]) {
      if (ref.current) ref.current.value = "";
    }
  }

  function elegirArchivo(file: File | null) {
    onChange(file);
    limpiarInputs();
    setSelectorAbierto(false);
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    elegirArchivo(e.target.files?.[0] ?? null);
  }

  function abrirOrigen(origen: OrigenArchivo) {
    setSelectorAbierto(false);
    window.setTimeout(() => {
      const ref =
        origen === "camara"
          ? camaraRef
          : origen === "galeria"
            ? galeriaRef
            : archivosRef;
      ref.current?.click();
    }, 120);
  }

  function abrirSelector() {
    if (disabled) return;
    if (promptMovil) {
      setSelectorAbierto(true);
      return;
    }
    if (selectorOrigen) {
      archivosRef.current?.click();
      return;
    }
    inputRef.current?.click();
  }

  const zona = (
  <>
    <button
      type="button"
      disabled={disabled}
      onClick={abrirSelector}
      className={cn(
        "relative flex min-h-40 w-full cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden rounded-campo bg-tinta-100 px-4 py-6",
        "border border-dashed border-[var(--border-default)]",
        "transition-colors duration-control hover:border-[var(--border-accent)]",
        "disabled:pointer-events-none disabled:opacity-50",
        "focus-visible:outline-none focus-visible:shadow-foco",
        previewUrl && "border-solid border-[var(--border-subtle)]",
      )}
      aria-label={
        previewUrl ? "Cambiar comprobante" : "Agregar comprobante"
      }
    >
      {previewUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={previewUrl}
          alt=""
          className="absolute inset-0 size-full object-contain p-2"
        />
      ) : (
        <>
          <Camera size={20} className="text-tinta-500" aria-hidden />
          <span className="max-w-[16rem] text-center text-xs text-tinta-500">
            {textoPlaceholder}
          </span>
        </>
      )}
    </button>

    {previewUrl ? (
      <Button
        isDisabled={disabled}
        size="sm"
        variant="ghost"
        className="absolute top-2 right-2 z-10 min-h-8 bg-blanco/90 shadow-sm"
        onPress={() => {
          onChange(null);
          limpiarInputs();
        }}
      >
        <X size={14} aria-hidden />
        Quitar
      </Button>
    ) : null}
  </>
  );

  return (
    <div className={cn("grid gap-1.5", className)}>
      {label ? (
        <span className="text-sm font-medium text-tinta-900">{label}</span>
      ) : null}

      <div className="relative">{zona}</div>

      {hint ? <p className="text-xs text-tinta-500">{hint}</p> : null}

      {!selectorOrigen ? (
        <input
          ref={inputRef}
          type="file"
          accept={MIME_COMPROBANTE}
          className="sr-only"
          disabled={disabled}
          onChange={onInputChange}
        />
      ) : (
        <>
          <input
            ref={camaraRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            disabled={disabled}
            onChange={onInputChange}
          />
          <input
            ref={galeriaRef}
            type="file"
            accept="image/*"
            className="sr-only"
            disabled={disabled}
            onChange={onInputChange}
          />
          <input
            ref={archivosRef}
            type="file"
            accept={MIME_COMPROBANTE}
            className="sr-only"
            disabled={disabled}
            onChange={onInputChange}
          />
        </>
      )}

      {promptMovil ? (
        <Modal.Backdrop
          isOpen={selectorAbierto}
          onOpenChange={(abierto) => {
            if (!abierto) setSelectorAbierto(false);
          }}
        >
          <Modal.Container size="sm" placement="bottom">
            <Modal.Dialog className="pb-[max(1rem,env(safe-area-inset-bottom))]">
              <div
                className="mx-auto mb-3 mt-1 h-1 w-10 rounded-full bg-tinta-200"
                aria-hidden
              />
              <Modal.CloseTrigger />
              <Modal.Header className="pb-2">
                <Modal.Heading>Subir comprobante</Modal.Heading>
                <p className="text-sm text-tinta-500">
                  Elija de dónde quiere adjuntar la imagen.
                </p>
              </Modal.Header>
              <Modal.Body className="grid gap-3 pb-1">
                <div
                  role="listbox"
                  aria-label="Origen del comprobante"
                  className="overflow-hidden rounded-tarjeta border border-[var(--border-subtle)] bg-blanco"
                >
                  {OPCIONES_ORIGEN.map((opcion, indice) => {
                    const Icono = opcion.icon;
                    return (
                      <button
                        key={opcion.id}
                        type="button"
                        role="option"
                        aria-selected={false}
                        className={cn(
                          "flex w-full min-h-14 touch-manipulation items-center gap-3 px-4 py-3 text-left",
                          "bg-blanco text-tinta-900 transition-colors duration-control",
                          "hover:bg-tinta-50 active:bg-tinta-100",
                          "focus:outline-none focus-visible:bg-tinta-50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-marca/25",
                          indice > 0 &&
                            "border-t border-[var(--border-subtle)]",
                        )}
                        onClick={() => abrirOrigen(opcion.id)}
                      >
                        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-tinta-100 text-tinta-700">
                          <Icono size={18} aria-hidden strokeWidth={1.75} />
                        </span>
                        <span className="min-w-0 grid gap-0.5">
                          <span className="text-sm font-medium leading-tight">
                            {opcion.label}
                          </span>
                          <span className="text-xs leading-snug text-tinta-500">
                            {opcion.descripcion}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
                <Button
                  className="min-h-11 w-full"
                  variant="tertiary"
                  onPress={() => setSelectorAbierto(false)}
                >
                  Cancelar
                </Button>
              </Modal.Body>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      ) : null}
    </div>
  );
}
