"use client";

import {
  Alert,
  Button,
  Card,
  Chip,
  ComboBox,
  Description,
  Input,
  Label,
  ListBox,
  Modal,
  TextField,
} from "@heroui/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  UNIDAD_CORTA,
  formatearFechaLarga,
  type ClienteBonoPublico,
  type ProductoPublico,
} from "@misupertostada/shared";
import { api, ApiError } from "@/lib/api";
import { toastSuccess } from "@/lib/toast";
import { EmptyState } from "@/components/ui/empty-state";
import { RowSkeleton } from "@/components/ui/skeleton";
import { QuantityStepper } from "@/components/ui/quantity-stepper";

type Props = {
  clienteId: string;
  canWrite: boolean;
};

export function ClienteBonos({ clienteId, canWrite }: Props) {
  const qc = useQueryClient();
  const [productoId, setProductoId] = useState("");
  const [cantidad, setCantidad] = useState(1);
  const [descripcion, setDescripcion] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [anularId, setAnularId] = useState<string | null>(null);
  const [motivo, setMotivo] = useState("");

  const bonos = useQuery({
    queryKey: ["clientes", clienteId, "bonos"],
    queryFn: () => api<ClienteBonoPublico[]>(`/clientes/${clienteId}/bonos`),
  });
  const productos = useQuery({
    queryKey: ["productos"],
    queryFn: () => api<ProductoPublico[]>("/productos"),
    enabled: canWrite,
  });

  const activos = useMemo(
    () => (productos.data ?? []).filter((p) => p.activo),
    [productos.data],
  );

  const productoSel = activos.find((p) => p.id === productoId);
  const unidad = productoSel ? UNIDAD_CORTA[productoSel.unidadMedida] : "un";

  const pendientes = (bonos.data ?? []).filter(
    (b) => !b.anuladoAt && b.cantidadDisponible > 0,
  );
  const historial = (bonos.data ?? []).filter(
    (b) => b.anuladoAt || b.cantidadDisponible === 0,
  );

  const otorgar = useMutation({
    mutationFn: () =>
      api<ClienteBonoPublico>(`/clientes/${clienteId}/bonos`, {
        method: "POST",
        body: JSON.stringify({
          productoId,
          descripcion: descripcion.trim(),
          cantidad,
        }),
      }),
    onSuccess: () => {
      setError(null);
      setProductoId("");
      setCantidad(1);
      setDescripcion("");
      toastSuccess("Bono registrado");
      void qc.invalidateQueries({ queryKey: ["clientes", clienteId, "bonos"] });
    },
    onError: (err) =>
      setError(err instanceof ApiError ? err.message : "No se pudo registrar"),
  });

  const anular = useMutation({
    mutationFn: (bonoId: string) =>
      api<ClienteBonoPublico>(
        `/clientes/${clienteId}/bonos/${bonoId}/anular`,
        {
          method: "PATCH",
          body: JSON.stringify({ motivo: motivo.trim() }),
        },
      ),
    onSuccess: () => {
      setAnularId(null);
      setMotivo("");
      toastSuccess("Bono anulado");
      void qc.invalidateQueries({ queryKey: ["clientes", clienteId, "bonos"] });
    },
    onError: (err) =>
      setError(err instanceof ApiError ? err.message : "No se pudo anular"),
  });

  return (
    <Card className="gap-0 overflow-hidden p-0">
      <Card.Header className="px-4 py-4 pb-3 sm:px-5">
        <Card.Title className="text-base text-tinta-900">
          Bonos de reposición
        </Card.Title>
        <Card.Description>
          Producto dañado que se repone en una entrega. No se cobra.
        </Card.Description>
      </Card.Header>
      <Card.Content className="grid gap-0 p-0">
        {error && (
          <Alert status="danger" className="mx-4 mb-3 sm:mx-5">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Description>{error}</Alert.Description>
            </Alert.Content>
          </Alert>
        )}

        {bonos.isLoading ? (
          <RowSkeleton rows={3} />
        ) : pendientes.length === 0 && historial.length === 0 && !canWrite ? (
          <EmptyState
            title="Sin bonos pendientes"
            description="Cuando junten producto dañado, regístrelo aquí para reponerlo en la siguiente entrega."
          />
        ) : pendientes.length === 0 && historial.length === 0 ? (
          <p className="px-4 pb-1 text-sm text-pretty text-tinta-500 sm:px-5">
            Cuando junten producto dañado, regístrelo abajo. Se repone en una
            entrega, sin cobro.
          </p>
        ) : (
          <ul>
            {pendientes.map((b) => (
              <li
                key={b.id}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3 gap-y-1 border-t border-[var(--border-subtle)] px-4 py-3 first:border-t-0 sm:px-5"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-semibold text-tinta-900">
                      {b.nombreCanonico}
                    </p>
                    <Chip size="sm" variant="soft" color="success">
                      Devolución
                    </Chip>
                  </div>
                  <p className="mt-0.5 text-sm text-pretty text-tinta-500">
                    {b.descripcion}
                  </p>
                  <p className="mt-1 text-[11px] text-tinta-400">
                    {formatearFechaLarga(b.otorgadoAt.slice(0, 10))}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <p className="text-right text-sm font-semibold tabular-nums text-tinta-900">
                    {b.cantidadDisponible}
                    <span className="ml-1 text-xs font-medium text-tinta-500">
                      / {b.cantidadOtorgada} {UNIDAD_CORTA[b.unidadMedida]}
                    </span>
                  </p>
                  {canWrite && (
                    <Button
                      size="sm"
                      variant="tertiary"
                      onPress={() => {
                        setAnularId(b.id);
                        setMotivo("");
                      }}
                    >
                      Anular
                    </Button>
                  )}
                </div>
              </li>
            ))}
            {historial.map((b) => (
              <li
                key={b.id}
                className="flex flex-wrap items-center gap-2 border-t border-[var(--border-subtle)] px-4 py-2.5 text-sm text-tinta-500 sm:px-5"
              >
                <span className="min-w-0 flex-1 truncate">
                  {b.nombreCanonico}
                  <span className="text-tinta-400"> · {b.descripcion}</span>
                </span>
                <span className="tabular-nums text-xs">
                  {b.cantidadOtorgada} {UNIDAD_CORTA[b.unidadMedida]}
                </span>
                <Chip size="sm" variant="soft">
                  {b.anuladoAt ? "Anulado" : "Agotado"}
                </Chip>
              </li>
            ))}
          </ul>
        )}

        {canWrite && (
          <form
            className="grid gap-3 border-t border-[var(--border-subtle)] px-4 py-4 sm:px-5"
            onSubmit={(e) => {
              e.preventDefault();
              if (!productoId || !descripcion.trim()) return;
              otorgar.mutate();
            }}
          >
            <p className="mst-label text-[11px]">Registrar bono</p>
            <ComboBox
              aria-label="Producto"
              selectedKey={productoId || null}
              onSelectionChange={(key) => {
                setProductoId(typeof key === "string" ? key : "");
                setCantidad(1);
              }}
            >
              <Label>Producto</Label>
              <ComboBox.InputGroup>
                <Input placeholder="Buscar producto…" />
                <ComboBox.Trigger />
              </ComboBox.InputGroup>
              <ComboBox.Popover>
                <ListBox>
                  {activos.map((p) => (
                    <ListBox.Item key={p.id} id={p.id} textValue={p.nombreCanonico}>
                      <div className="flex min-w-0 flex-col">
                        <span>{p.nombreCanonico}</span>
                        <Description>{p.sku}</Description>
                      </div>
                      <ListBox.ItemIndicator />
                    </ListBox.Item>
                  ))}
                </ListBox>
              </ComboBox.Popover>
            </ComboBox>
            <TextField
              isRequired
              value={descripcion}
              onChange={setDescripcion}
            >
              <Label>Descripción</Label>
              <Input placeholder="Ej. tortilla quebradita" />
              <Description>Qué pasó con el producto dañado</Description>
            </TextField>
            <div>
              <p className="mst-label mb-2 text-[11px]">
                Cantidad{productoSel ? ` · ${unidad}` : ""}
              </p>
              <QuantityStepper
                value={cantidad}
                onChange={setCantidad}
                min={1}
                max={9999}
                unidad={productoSel ? unidad : undefined}
              />
            </div>
            <Button
              type="submit"
              className="button--accent w-full sm:w-auto"
              isDisabled={
                otorgar.isPending || !productoId || !descripcion.trim()
              }
              variant="primary"
            >
              {otorgar.isPending ? "Guardando…" : "Registrar bono"}
            </Button>
          </form>
        )}
      </Card.Content>

      <Modal isOpen={anularId != null} onOpenChange={() => setAnularId(null)}>
        <Modal.Backdrop>
          <Modal.Container>
            <Modal.Dialog>
              <Modal.Header>
                <Modal.Heading>Anular bono</Modal.Heading>
                <p className="text-sm leading-relaxed text-pretty text-tinta-500">
                  El saldo no usado queda anulado. No se puede deshacer.
                </p>
              </Modal.Header>
              <Modal.Body>
                <TextField isRequired value={motivo} onChange={setMotivo}>
                  <Label>Motivo</Label>
                  <Input placeholder="Ej. se registró por error" />
                </TextField>
              </Modal.Body>
              <Modal.Footer>
                <Button variant="tertiary" onPress={() => setAnularId(null)}>
                  Volver
                </Button>
                <Button
                  variant="danger"
                  isDisabled={!motivo.trim() || anular.isPending}
                  onPress={() => anularId && anular.mutate(anularId)}
                >
                  Anular
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </Card>
  );
}
