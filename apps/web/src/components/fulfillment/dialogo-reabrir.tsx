"use client";

import { useState } from "react";
import {
  Alert,
  Button,
  Description,
  Label,
  Modal,
  Spinner,
  TextArea,
  TextField,
} from "@heroui/react";

const MOTIVO_MINIMO = 8;

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
  const corto = motivo.trim().length < MOTIVO_MINIMO;

  function cerrar() {
    setMotivo("");
    onClose();
  }

  return (
    <Modal.Backdrop
      isOpen={open}
      onOpenChange={(abierto) => {
        if (!abierto) cerrar();
      }}
    >
      <Modal.Container size="lg">
        <Modal.Dialog>
          <Modal.CloseTrigger />
          <Modal.Header>
            <Modal.Heading>Reabrir el día cerrado</Modal.Heading>
            <p className="text-sm leading-relaxed text-pretty text-tinta-500">
              No se reenvían los mensajes ya encolados. Al cerrar de nuevo sale
              la hoja corregida, con los cambios resaltados.
            </p>
          </Modal.Header>

          <Modal.Body>
            <form
              id="reabrir-dia"
              className="grid gap-4"
              onSubmit={(e) => {
                e.preventDefault();
                if (!corto && !loading) onConfirm(motivo);
              }}
            >
              <TextField isRequired value={motivo} onChange={setMotivo}>
                <Label>Motivo</Label>
                <TextArea
                  placeholder="Ej. Kraken cambió el pedido después del cierre"
                  rows={3}
                />
                <Description>
                  Mínimo {MOTIVO_MINIMO} caracteres. Queda en la auditoría.
                </Description>
              </TextField>

              {error && (
                <Alert status="danger">
                  <Alert.Indicator />
                  <Alert.Content>
                    <Alert.Title>No se reabrió</Alert.Title>
                    <Alert.Description>{error}</Alert.Description>
                  </Alert.Content>
                </Alert>
              )}
            </form>
          </Modal.Body>

          <Modal.Footer>
            <Button isDisabled={loading} variant="tertiary" onPress={cerrar}>
              Cancelar
            </Button>
            <Button
              form="reabrir-dia"
              isDisabled={corto}
              isPending={loading}
              type="submit"
              variant="danger"
            >
              {({ isPending }) => (
                <>
                  {isPending && <Spinner color="current" size="sm" />}
                  Reabrir día
                </>
              )}
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
