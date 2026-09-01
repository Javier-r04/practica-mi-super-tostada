"use client";

import { useRef, useState } from "react";
import {
  Alert,
  Button,
  Description,
  Input,
  Label,
  Modal,
  Spinner,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
} from "@heroui/react";
import {
  formatearCentavos,
  quetzalesTextoACentavos,
  MENSAJE_COMPROBANTE_REQUERIDO,
  MENSAJE_GUARDAR_TELEFONO,
  type PagoMetodo,
} from "@misupertostada/shared";
import { ComprobantePicker } from "@/components/receivables/comprobante-picker";
import { Money } from "@/components/domain/money";
import { subirComprobanteAbono } from "@/lib/upload-asset";
import { avisoSinSenal } from "@/hooks/use-online";

type PropsPago = {
  open: boolean;
  titulo: string;
  descripcion?: string;
  saldoCentavos: number;
  online: boolean;
  loading?: boolean;
  error?: string;
  /** Solo /reparto. Cartera no lo pasa: sigue exigiendo señal. */
  permitirOffline?: boolean;
  /** Por defecto efectivo y transferencia. Reparto solo efectivo. */
  metodos?: readonly PagoMetodo[];
  onClose: () => void;
  onConfirm: (input: {
    id: string;
    montoCentavos: number;
    metodo: PagoMetodo;
    comprobanteAssetId?: string;
    archivo?: File;
    blobLocal?: boolean;
  }) => void;
};

const METODOS_OPCIONES = [
  { id: "EFECTIVO", label: "Efectivo" },
  { id: "TRANSFERENCIA", label: "Transferencia" },
] as const;

const METODOS_DEFAULT: readonly PagoMetodo[] = ["EFECTIVO", "TRANSFERENCIA"];

/**
 * El formulario vive en un componente aparte que solo se monta con el diálogo
 * abierto. Así cada apertura arranca con estado limpio por construcción, en vez
 * de resetear seis `useState` desde un efecto. La `key` cubre el caso de que el
 * saldo cambie con el diálogo ya abierto.
 */
export function DialogoPago(props: PropsPago) {
  if (!props.open) return null;
  return <FormularioPago key={props.saldoCentavos} {...props} />;
}

function FormularioPago({
  titulo,
  descripcion,
  saldoCentavos,
  online,
  loading,
  error,
  permitirOffline = false,
  metodos = METODOS_DEFAULT,
  onClose,
  onConfirm,
}: PropsPago) {
  const metodosVisibles = METODOS_OPCIONES.filter((m) =>
    metodos.some((x) => x === m.id),
  );
  const [monto, setMonto] = useState(() =>
    formatearCentavos(saldoCentavos, { simbolo: false, miles: false }),
  );
  const [metodo, setMetodo] = useState<PagoMetodo>(
    metodosVisibles[0]?.id ?? "EFECTIVO",
  );
  const [archivo, setArchivo] = useState<File | null>(null);
  const [localError, setLocalError] = useState<string>();
  const [subiendo, setSubiendo] = useState(false);
  const pagoIdRef = useRef(crypto.randomUUID());
  const sinSenal = permitirOffline ? undefined : avisoSinSenal(online);
  const mensajeError = localError ?? error ?? sinSenal;

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
      setSubiendo(true);
      if (archivo) comprobanteAssetId = await subirComprobanteAbono(archivo, id);
    } catch (err) {
      setLocalError(
        err instanceof Error ? err.message : "No se pudo subir el comprobante",
      );
      return;
    } finally {
      setSubiendo(false);
    }
    onConfirm({ id, montoCentavos, metodo, comprobanteAssetId });
  }

  return (
    <Modal.Backdrop
      isOpen
      onOpenChange={(abierto) => {
        if (!abierto) onClose();
      }}
    >
      <Modal.Container size="md">
        <Modal.Dialog>
          <Modal.CloseTrigger />
          <Modal.Header>
            <Modal.Heading>{titulo}</Modal.Heading>
            {descripcion && (
              <p className="text-sm text-tinta-500">{descripcion}</p>
            )}
          </Modal.Header>

          <Modal.Body>
            <form
              className="grid gap-4"
              id="registrar-pago"
              onSubmit={(e) => {
                e.preventDefault();
                void guardar();
              }}
            >
              {/* El saldo abre el diálogo porque es la cifra contra la que
                  Carla compara el billete antes de escribir nada. */}
              <div className="flex items-center justify-between rounded-campo bg-tinta-50 px-3 py-3 text-sm">
                <span className="mst-label">Saldo pendiente</span>
                <Money
                  centavos={saldoCentavos}
                  className="text-lg"
                  tone="pendiente"
                />
              </div>

              <TextField value={monto} onChange={setMonto}>
                <Label>Monto recibido</Label>
                <Input
                  autoFocus
                  className="tabular-nums"
                  id="monto-pago"
                  inputMode="decimal"
                />
                <Description>
                  Se aplica a las facturas más antiguas del cliente. Puede ser un
                  abono parcial.
                </Description>
              </TextField>

              {metodosVisibles.length > 1 && (
                <div className="grid gap-1.5">
                  <span
                    className="text-sm font-medium text-tinta-900"
                    id="metodo-pago-label"
                  >
                    Método
                  </span>
                  <ToggleButtonGroup
                    aria-labelledby="metodo-pago-label"
                    disallowEmptySelection
                    fullWidth
                    selectedKeys={new Set([metodo])}
                    selectionMode="single"
                    onSelectionChange={(keys) => {
                      const next = [...keys][0];
                      if (typeof next === "string")
                        setMetodo(next as PagoMetodo);
                    }}
                  >
                    {metodosVisibles.map((m, i) => (
                      <ToggleButton key={m.id} id={m.id}>
                        {i > 0 && <ToggleButtonGroup.Separator />}
                        {m.label}
                      </ToggleButton>
                    ))}
                  </ToggleButtonGroup>
                </div>
              )}

              <ComprobantePicker
                label="Comprobante"
                placeholder="Toque para tomar foto del recibo"
                hint={
                  metodo === "TRANSFERENCIA"
                    ? "Obligatorio en transferencia."
                    : "Opcional en efectivo."
                }
                value={archivo}
                onChange={setArchivo}
              />

              {mensajeError && (
                <Alert status="danger">
                  <Alert.Indicator />
                  <Alert.Content>
                    <Alert.Title>No se registró el pago</Alert.Title>
                    <Alert.Description>{mensajeError}</Alert.Description>
                  </Alert.Content>
                </Alert>
              )}
            </form>
          </Modal.Body>

          <Modal.Footer>
            <Button variant="tertiary" onPress={onClose}>
              Cancelar
            </Button>
            <Button
              form="registrar-pago"
              isDisabled={!online && !permitirOffline}
              isPending={loading || subiendo}
              type="submit"
              variant="primary"
            >
              {({ isPending }) => (
                <>
                  {isPending ? <Spinner color="current" size="sm" /> : null}
                  {permitirOffline && !online
                    ? MENSAJE_GUARDAR_TELEFONO
                    : "Guardar cobro"}
                </>
              )}
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
