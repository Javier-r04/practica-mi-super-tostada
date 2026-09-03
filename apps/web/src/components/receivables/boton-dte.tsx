"use client";

import { Button } from "@heroui/react";
import { PencilLine, Receipt } from "lucide-react";
import { cn } from "@/lib/utils";

type BotonDteProps = {
  numeroDte: string | null;
  puedeEditar: boolean;
  hint: string;
  onPress: () => void;
  /** inline = número en fila; pill = «Sin DTE» discontinuo; boton = acción ancha en tarjeta */
  presentacion?: "inline" | "pill" | "boton";
  className?: string;
};

export function BotonDte({
  numeroDte,
  puedeEditar,
  hint,
  onPress,
  presentacion = "inline",
  className,
}: BotonDteProps) {
  if (numeroDte) {
    if (presentacion === "boton") {
      return (
        <Button
          aria-label={hint}
          className={cn("min-h-11 gap-1.5", className)}
          isDisabled={!puedeEditar}
          size="sm"
          variant="outline"
          onPress={onPress}
        >
          <span className="tabular-nums">{numeroDte}</span>
          {puedeEditar ? (
            <PencilLine aria-hidden className="size-3.5 text-tinta-500" />
          ) : null}
        </Button>
      );
    }

    return (
      <Button
        aria-label={hint}
        className={cn(
          "inline-flex h-auto min-h-0 items-center gap-1 border-0 bg-transparent p-0 tabular-nums text-tinta-900 shadow-none",
          puedeEditar && "hover:text-marca",
          className,
        )}
        isDisabled={!puedeEditar}
        size="sm"
        variant="ghost"
        onPress={onPress}
      >
        <span>{numeroDte}</span>
        {puedeEditar ? (
          <PencilLine aria-hidden className="size-3.5 shrink-0 text-tinta-500" />
        ) : null}
      </Button>
    );
  }

  const esPill = presentacion === "pill" || presentacion === "boton";

  return (
    <Button
      aria-label={hint}
      className={cn(
        "gap-1.5",
        esPill && "border-dashed border-aviso/50 text-aviso",
        presentacion === "boton" && "min-h-11",
        presentacion === "inline" && "h-auto min-h-0 px-1 text-aviso",
        className,
      )}
      isDisabled={!puedeEditar}
      size="sm"
      variant={presentacion === "inline" ? "ghost" : "outline"}
      onPress={onPress}
    >
      <Receipt size={14} aria-hidden />
      {presentacion === "boton" ? "Capturar DTE" : "Sin DTE"}
      {puedeEditar ? <PencilLine aria-hidden className="size-3.5" /> : null}
    </Button>
  );
}
