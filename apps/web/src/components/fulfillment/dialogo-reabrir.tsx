"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/field";

export function DialogoReabrir({
  open,
  loading,
  error,
  onClose,
  onConfirm,
}: {
  open: boolean;
  loading: boolean;
  error?: string;
  onClose: () => void;
  onConfirm: (motivo: string) => void;
}) {
  const [motivo, setMotivo] = useState("");
  return (
    <Dialog
      open={open}
      tone="danger"
      title="Reabrir el día cerrado"
      description="No se reenvían los mensajes ya encolados. Al cerrar de nuevo sale la hoja versión 2 con los cambios resaltados."
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button
            variant="danger"
            onClick={() => onConfirm(motivo)}
            loading={loading}
            disabled={motivo.trim().length < 8}
          >
            Reabrir día
          </Button>
        </>
      }
    >
      <Textarea
        id="motivo-reabrir"
        label="Motivo"
        required
        value={motivo}
        onChange={(e) => setMotivo(e.target.value)}
        hint="Mínimo 8 caracteres. Queda en la auditoría."
        error={error}
      />
    </Dialog>
  );
}
