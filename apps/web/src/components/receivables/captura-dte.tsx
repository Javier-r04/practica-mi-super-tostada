"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { cn } from "@/lib/utils";

export function CapturaDte({
  id = "numero-dte",
  numeroDte,
  disabled,
  hint,
  loading,
  compact,
  onSave,
}: {
  id?: string;
  numeroDte: string | null;
  disabled?: boolean;
  hint?: string;
  loading?: boolean;
  /** Sin label de campo; pensado para celdas de tabla / cards. */
  compact?: boolean;
  onSave: (numeroDte: string) => void;
}) {
  const [valor, setValor] = useState(numeroDte ?? "");
  return (
    <form
      className={cn(
        "flex flex-wrap items-end gap-2",
        compact && "items-center",
      )}
      onSubmit={(e) => {
        e.preventDefault();
        const recortado = valor.trim();
        if (!recortado || disabled) return;
        onSave(recortado);
      }}
    >
      <div className={cn("min-w-[140px] flex-1", compact && "min-w-0")}>
        <Input
          id={id}
          label={compact ? undefined : "Número de DTE"}
          aria-label={compact ? "Número de DTE" : undefined}
          value={valor}
          disabled={disabled}
          title={hint}
          className="font-mono"
          placeholder="Número DTE"
          onChange={(e) => setValor(e.target.value)}
        />
      </div>
      <Button
        type="submit"
        size="sm"
        disabled={disabled || !valor.trim()}
        title={hint}
        loading={loading}
      >
        {compact ? "Guardar" : "Guardar DTE"}
      </Button>
    </form>
  );
}
