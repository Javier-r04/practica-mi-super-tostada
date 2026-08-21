"use client";

import { useEffect, useRef, useState } from "react";
import {
  formatearCentavos,
  quetzalesTextoACentavos,
  MENSAJE_COMPROBANTE_REQUERIDO,
  MENSAJE_GUARDAR_TELEFONO,
  type PagoMetodo,
} from "@misupertostada/shared";
import { Camera } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Money } from "@/components/domain/money";
import { subirComprobantePago } from "@/lib/upload-asset";
import { avisoSinSenal } from "@/hooks/use-online";

export function DialogoPago({
  open,
  titulo,
  descripcion,
  saldoCentavos,
  online,
  loading,
  error,
  permitirOffline = false,
  onClose,
  onConfirm,
}: {
  open: boolean;
  titulo: string;
  descripcion?: string;
  saldoCentavos: number;
  online: boolean;
  loading?: boolean;
  error?: string;
  /** Solo /reparto. Cartera no lo pasa: sigue exigiendo señal. */
  permitirOffline?: boolean;
  onClose: () => void;
  onConfirm: (input: {
    id: string;
    montoCentavos: number;
    metodo: PagoMetodo;
    comprobanteAssetId?: string;
    archivo?: File;
    blobLocal?: boolean;
  }) => void;
}) {
  const [monto, setMonto] = useState(() => formatearCentavos(saldoCentavos, { simbolo: false }));
  const [metodo, setMetodo] = useState<PagoMetodo>("EFECTIVO");
  const [archivo, setArchivo] = useState<File | null>(null);
  const [localError, setLocalError] = useState<string>();
  const pagoIdRef = useRef(crypto.randomUUID());
  const sinSenal = permitirOffline ? undefined : avisoSinSenal(online);

  useEffect(() => {
    if (!open) return;
    pagoIdRef.current = crypto.randomUUID();
    setMonto(formatearCentavos(saldoCentavos, { simbolo: false }));
    setMetodo("EFECTIVO");
    setArchivo(null);
    setLocalError(undefined);
  }, [open, saldoCentavos]);

  async function guardar() {
    setLocalError(undefined);
    if (!online && !permitirOffline) {
      setLocalError(avisoSinSenal(online));
      return;
    }
    let montoCentavos: number;
    try {
      montoCentavos = quetzalesTextoACentavos(monto);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Monto inválido");
      return;
    }
    if (metodo === "TRANSFERENCIA" && !archivo) {
      setLocalError(MENSAJE_COMPROBANTE_REQUERIDO);
      return;
    }
    const id = pagoIdRef.current;
    if (permitirOffline) {
      onConfirm({
        id,
        montoCentavos,
        metodo,
        archivo: archivo ?? undefined,
        blobLocal: true,
      });
      return;
    }
    if (!online) {
      setLocalError(avisoSinSenal(online));
      return;
    }
    let comprobanteAssetId: string | undefined;
    try {
      if (archivo) comprobanteAssetId = await subirComprobantePago(archivo, id);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "No se pudo subir el comprobante");
      return;
    }
    onConfirm({ id, montoCentavos, metodo, comprobanteAssetId });
  }

  return (
    <Dialog
      open={open}
      title={titulo}
      description={descripcion}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            variant="accent"
            loading={loading}
            disabled={!online && !permitirOffline}
            title={sinSenal}
            onClick={() => void guardar()}
          >
            {permitirOffline && !online ? MENSAJE_GUARDAR_TELEFONO : "Guardar cobro"}
          </Button>
        </>
      }
    >
      <div className="grid gap-3">
        <div className="flex items-center justify-between rounded-campo bg-tinta-50 px-3 py-3 text-sm">
          <span>Saldo pendiente</span>
          <Money centavos={saldoCentavos} tone="pendiente" />
        </div>
        <Input
          id="monto-pago"
          label="Monto recibido"
          inputMode="decimal"
          value={monto}
          onChange={(e) => setMonto(e.target.value)}
          hint="Puede ser un abono parcial. Se aplica a la factura más antigua si cobra al cliente."
        />
        <Field label="Método">
          <SegmentedControl
            label="Método de pago"
            value={metodo}
            onChange={setMetodo}
            fullWidth
            options={
              [
                { id: "EFECTIVO", label: "Efectivo" },
                { id: "TRANSFERENCIA", label: "Transferencia" },
              ] as const
            }
          />
        </Field>
        <Field
          label="Comprobante"
          hint={metodo === "TRANSFERENCIA" ? "Obligatorio en transferencia." : "Opcional en efectivo."}
        >
          <label className="flex min-h-[52px] cursor-pointer items-center justify-center gap-2 rounded-campo border border-dashed border-[var(--border-default)] px-3 text-xs text-tinta-500">
            <Camera size={16} aria-hidden />
            {archivo ? archivo.name : "Tomar foto del recibo"}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={(e) => setArchivo(e.target.files?.[0] ?? null)}
            />
          </label>
        </Field>
        {(localError || error || sinSenal) && (
          <p className="text-sm text-peligro" role="alert">
            {localError ?? error ?? sinSenal}
          </p>
        )}
      </div>
    </Dialog>
  );
}
