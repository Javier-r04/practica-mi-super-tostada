"use client";

import { useState } from "react";
import { Button, Input, Label, Spinner, TextField } from "@heroui/react";

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
  const vacio = valor.trim().length === 0;
  const esCorreccion = Boolean(numeroDte);

  return (
    <form
      className="grid gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        const recortado = valor.trim();
        if (!recortado || disabled) return;
        onSave(recortado);
      }}
    >
      <TextField
        isDisabled={disabled}
        value={valor}
        onChange={setValor}
      >
        <Label>Número de DTE</Label>
        <Input
          autoFocus
          className="font-mono tabular-nums"
          id={id}
          inputMode="numeric"
          placeholder="Número DTE"
          title={hint}
        />
      </TextField>
      <Button
        className="justify-self-start"
        aria-label={hint ? `Guardar DTE — ${hint}` : undefined}
        isDisabled={disabled || vacio}
        isPending={loading}
        type="submit"
        variant="primary"
      >
        {({ isPending }) => (
          <>
            {isPending ? <Spinner color="current" size="sm" /> : null}
            {esCorreccion ? "Guardar cambio" : "Guardar DTE"}
          </>
        )}
      </Button>
    </form>
  );
}
