"use client";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import type { OperacionResumen } from "@misupertostada/shared";

export function DialogoCierre({
  open,
  resumen,
  loading,
  onClose,
  onConfirm,
}: {
  open: boolean;
  resumen: OperacionResumen | undefined;
  loading: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const preview = resumen?.previewCierre;
  return (
    <Dialog
      open={open}
      title="Cerrar ventana y generar hoja"
      description="Se materializa la hoja de producción y se encola el consolidado. Después de esto, reabrir el día requiere motivo."
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button variant="accent" onClick={onConfirm} loading={loading}>
            Cerrar y generar
          </Button>
        </>
      }
    >
      <div className="grid gap-2 text-sm">
        <div className="flex justify-between">
          <span className="text-tinta-500">Pedidos confirmados</span>
          <strong className="tabular-nums">{preview?.confirmados ?? 0}</strong>
        </div>
        <div className="flex justify-between">
          <span className="text-tinta-500">Borradores que quedan fuera</span>
          <strong className="tabular-nums">{preview?.borradores ?? 0}</strong>
        </div>
        <div className="flex justify-between">
          <span className="text-tinta-500">Mensajes a encolar</span>
          <strong className="tabular-nums">{preview?.mensajesAEncolar ?? 0}</strong>
        </div>
      </div>
    </Dialog>
  );
}
