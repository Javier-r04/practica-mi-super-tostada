"use client";

import { useMemo, useRef, useState } from "react";
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
  aplicarFifo,
  formatearCentavos,
  ordenarFacturasFifo,
  quetzalesTextoACentavos,
  MENSAJE_COMPROBANTE_REQUERIDO,
  MENSAJE_GUARDAR_TELEFONO,
  PAGO_METODO_ETIQUETA,
  pagoRequiereComprobante,
  type PagoMetodo,
} from "@misupertostada/shared";
import { ComprobantePicker } from "@/components/receivables/comprobante-picker";
import { Money } from "@/components/domain/money";
import { subirComprobanteAbono } from "@/lib/upload-asset";
import { avisoSinSenal } from "@/hooks/use-online";

export type FacturaPendienteCobro = {
  id: string;
  correlativo?: number;
  saldoCentavos: number;
  numeroDte?: string | null;
  emitidaAt?: string | null;
  fechaOperacion?: string;
};

type PropsPago = {
  open: boolean;
  titulo: string;
  descripcion?: string;
  saldoCentavos: number;
  online: boolean;
  loading?: boolean;
  error?: string;
  /** Facturas pendientes del cliente para previsualizar FIFO en vivo. */
  facturasPendientes?: readonly FacturaPendienteCobro[];
  /** Solo /reparto. Cartera no lo pasa: sigue exigiendo señal. */
  permitirOffline?: boolean;
  /** Por defecto efectivo, transferencia y cheque. */
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
  { id: "EFECTIVO" as const, label: PAGO_METODO_ETIQUETA.EFECTIVO },
  { id: "TRANSFERENCIA" as const, label: PAGO_METODO_ETIQUETA.TRANSFERENCIA },
  { id: "CHEQUE" as const, label: PAGO_METODO_ETIQUETA.CHEQUE },
];

const METODOS_DEFAULT: readonly PagoMetodo[] = [
  "EFECTIVO",
  "TRANSFERENCIA",
  "CHEQUE",
];

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
  facturasPendientes,
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

  const facturasOrdenadas = useMemo(() => {
    if (!facturasPendientes?.length) return [];
    return [...facturasPendientes].sort((a, b) =>
      ordenarFacturasFifo(
        {
          emitidaAt: a.emitidaAt ?? null,
          correlativo: a.correlativo,
          fechaOperacion: a.fechaOperacion,
        },
        {
          emitidaAt: b.emitidaAt ?? null,
          correlativo: b.correlativo,
          fechaOperacion: b.fechaOperacion,
        },
      ),
    );
  }, [facturasPendientes]);

  const desgloseFifo = useMemo(() => {
    try {
      const centavos = quetzalesTextoACentavos(monto);
      if (centavos <= 0) return null;
      if (centavos > saldoCentavos) {
        return {
          excede: true,
          centavosExceso: centavos - saldoCentavos,
          asignaciones: [],
        };
      }
      if (!facturasOrdenadas.length) {
        return { excede: false, centavosExceso: 0, asignaciones: [] };
      }
      const { asignaciones } = aplicarFifo(
        facturasOrdenadas.map((f) => ({ id: f.id, saldoCentavos: f.saldoCentavos })),
        centavos,
      );
      return {
        excede: false,
        centavosExceso: 0,
        asignaciones: asignaciones.map((asg) => {
          const fac = facturasOrdenadas.find((f) => f.id === asg.facturaId);
          return {
            ...asg,
            correlativo: fac?.correlativo,
            numeroDte: fac?.numeroDte,
            saldoOriginal: fac?.saldoCentavos ?? asg.montoCentavos,
            seLiquida: asg.montoCentavos >= (fac?.saldoCentavos ?? 0),
          };
        }),
      };
    } catch {
      return null;
    }
  }, [monto, saldoCentavos, facturasOrdenadas]);

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
    if (montoCentavos > saldoCentavos) {
      setLocalError(
        `El monto supera el saldo pendiente (${formatearCentavos(saldoCentavos)}). El sistema no admite registrar saldo a favor.`,
      );
      return;
    }
    if (pagoRequiereComprobante(metodo) && !archivo) {
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
                <span className="mst-label">Saldo pendiente total</span>
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
                  Se aplica a las facturas más antiguas del cliente (FIFO).
                </Description>
              </TextField>

              {desgloseFifo?.excede ? (
                <Alert status="warning">
                  <Alert.Indicator />
                  <Alert.Content>
                    <Alert.Title>El monto excede el saldo pendiente</Alert.Title>
                    <Alert.Description>
                      El valor ingresado supera la deuda en{" "}
                      <Money centavos={desgloseFifo.centavosExceso} />. El negocio
                      no permite cobros en exceso ni registra saldo a favor.
                    </Alert.Description>
                  </Alert.Content>
                </Alert>
              ) : null}

              {desgloseFifo && desgloseFifo.asignaciones.length > 0 ? (
                <div className="grid gap-2 rounded-tarjeta border border-[var(--border-subtle)] bg-tinta-50/70 p-3 text-xs">
                  <div className="flex items-center justify-between font-medium text-tinta-700">
                    <span>Distribución del cobro:</span>
                    <span className="text-tinta-500 font-normal">
                      {desgloseFifo.asignaciones.length} factura
                      {desgloseFifo.asignaciones.length === 1 ? "" : "s"}
                    </span>
                  </div>
                  <ul className="grid gap-1.5">
                    {desgloseFifo.asignaciones.map((asg) => (
                      <li
                        key={asg.facturaId}
                        className="flex items-center justify-between rounded border border-[var(--border-subtle)] bg-white px-2.5 py-1.5"
                      >
                        <div className="min-w-0">
                          <span className="font-mono font-medium text-tinta-900">
                            Pedido #{asg.correlativo ?? "—"}
                          </span>
                          {asg.numeroDte ? (
                            <span className="ml-1.5 text-tinta-500">
                              · DTE {asg.numeroDte}
                            </span>
                          ) : null}
                        </div>
                        <div className="flex items-center gap-2">
                          <Money centavos={asg.montoCentavos} tone="pagado" />
                          {asg.seLiquida ? (
                            <span className="rounded bg-marca-50 px-1.5 py-0.5 text-[10px] font-semibold text-marca-700">
                              Saldada ✓
                            </span>
                          ) : (
                            <span className="rounded bg-aviso-50 px-1.5 py-0.5 text-[10px] font-semibold text-aviso-700">
                              Parcial
                            </span>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

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
                hint={
                  pagoRequiereComprobante(metodo)
                    ? "Obligatorio en transferencia y cheque."
                    : "Opcional en efectivo."
                }
                selectorOrigen
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
              isDisabled={
                Boolean(desgloseFifo?.excede) ||
                (!online && !permitirOffline)
              }
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
