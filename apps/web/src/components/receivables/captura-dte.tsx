"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";

export function CapturaDte({
  id = "numero-dte",
  numeroDte,
  disabled,
  hint,
  loading,
  onSave,
}: {
  id?: string;
  numeroDte: string | null;
  disabled?: boolean;
  hint?: string;
  loading?: boolean;
  onSave: (numeroDte: string) => void;
}) {
  const [valor, setValor] = useState(numeroDte ?? "");
  return (
    <form
      className="flex flex-wrap items-end gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        const recortado = valor.trim();
        if (!recortado || disabled) return;
        onSave(recortado);
      }}
    >
      <div className="min-w-[160px] flex-1">
        <Input
          id={id}
          label="Número de DTE"
          value={valor}
          disabled={disabled}
          title={hint}
          className="font-mono"
          placeholder="Sin DTE"
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
        Guardar DTE
      </Button>
    </form>
  );
}
