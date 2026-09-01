"use client";

import { Modal } from "@heroui/react";
import { CapturaDte } from "./captura-dte";

export function DialogoCapturaDte({
  facturaId,
  numeroDte,
  clienteNombre,
  correlativo,
  puedeDte,
  hintDte,
  loading,
  onClose,
  onSave,
}: {
  facturaId: string;
  numeroDte: string | null;
  clienteNombre: string;
  correlativo: number;
  puedeDte: boolean;
  hintDte?: string;
  loading?: boolean;
  onClose: () => void;
  onSave: (numeroDte: string) => void;
}) {
  return (
    <Modal.Backdrop
      isOpen
      onOpenChange={(abierto) => {
        if (!abierto) onClose();
      }}
    >
      <Modal.Container size="sm">
        <Modal.Dialog>
          <Modal.CloseTrigger />
          <Modal.Header>
            <Modal.Heading>
              {numeroDte ? "Corregir DTE" : "Capturar DTE"}
            </Modal.Heading>
            <p className="text-sm text-tinta-500">
              {clienteNombre} · pedido #{correlativo}
            </p>
          </Modal.Header>
          <Modal.Body>
            <CapturaDte
              disabled={!puedeDte}
              hint={hintDte}
              id={`dte-dialog-${facturaId}`}
              loading={loading}
              numeroDte={numeroDte}
              onSave={onSave}
            />
          </Modal.Body>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
