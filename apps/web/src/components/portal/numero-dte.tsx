"use client";

import { Button } from "@heroui/react";
import { Copy } from "lucide-react";
import { toastSuccess } from "@/lib/toast";

export function NumeroDtePortal({ numeroDte }: { numeroDte: string | null }) {
  if (!numeroDte) {
    return (
      <p className="text-[13px] text-tinta-500">
        Sin DTE · la fábrica lo registra al facturar
      </p>
    );
  }

  return (
    <div className="flex min-w-0 items-center gap-2">
      <p className="truncate text-[13px] text-tinta-900">{numeroDte}</p>
      <Button
        aria-label={`Copiar DTE ${numeroDte}`}
        // 44 px reales: en el teléfono la etiqueta es `sr-only` y sin altura
        // mínima quedaba un icono de ~32 px.
        className="min-h-tap shrink-0"
        size="sm"
        variant="ghost"
        onPress={async () => {
          try {
            await navigator.clipboard.writeText(numeroDte);
            toastSuccess("Número copiado");
          } catch {
            // El navegador puede bloquear clipboard sin gesto del usuario.
          }
        }}
      >
        <Copy size={14} aria-hidden />
        <span className="sr-only sm:not-sr-only">Copiar</span>
      </Button>
    </div>
  );
}
