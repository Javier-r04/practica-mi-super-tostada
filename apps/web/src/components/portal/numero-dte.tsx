"use client";

import { Button } from "@heroui/react";
import { Copy } from "lucide-react";
import { toastSuccess } from "@/lib/toast";

export function NumeroDtePortal({ numeroDte }: { numeroDte: string | null }) {
  if (!numeroDte) {
    return (
      <p className="font-mono text-[13px] text-tinta-500">
        Sin DTE · la fábrica lo registra al facturar
      </p>
    );
  }

  return (
    <div className="flex min-w-0 items-center gap-2">
      <p className="truncate font-mono text-[13px] text-tinta-900">{numeroDte}</p>
      <Button
        aria-label={`Copiar DTE ${numeroDte}`}
        className="shrink-0"
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
        Copiar
      </Button>
    </div>
  );
}
