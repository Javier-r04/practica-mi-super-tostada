"use client";

import {
  Card,
  Checkbox,
  Description,
  Input,
  Label,
  Table,
  TextField,
} from "@heroui/react";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  FAMILIA_ETIQUETA,
  formatearCentavos,
  precioEfectivoCentavos,
  quetzalesTextoACentavos,
  type ClienteProductoFila,
} from "@misupertostada/shared";
import { api } from "@/lib/api";
import { Money } from "@/components/domain/money";
import { EmptyState } from "@/components/ui/empty-state";
import { RowSkeleton } from "@/components/ui/skeleton";

export function ClientePrecios({
  clienteId,
  clienteNombre,
  filas,
  cargando,
  canWrite,
  canPrecio,
}: {
  clienteId: string;
  clienteNombre: string;
  filas: ClienteProductoFila[] | undefined;
  cargando: boolean;
  canWrite: boolean;
  canPrecio: boolean;
}) {
  const qc = useQueryClient();

  function refrescar() {
    return qc.invalidateQueries({
      queryKey: ["clientes", clienteId, "productos"],
    });
  }

  if (cargando) return <RowSkeleton rows={5} />;

  const items = filas ?? [];
  if (items.length === 0) {
    return (
      <EmptyState
        title="Sin productos"
        description="Este cliente aún no tiene productos asignados en el catálogo."
      />
    );
  }

  const acciones = (productoId: string) =>
    accionesFila(clienteId, productoId, refrescar);

  return (
    <>
      <ul className="grid gap-3 lg:hidden">
        {items.map((fila) => (
          <li key={fila.productoId}>
            <Card className="min-w-0 gap-3 p-4">
              <header className="min-w-0">
                <p className="text-sm font-semibold text-pretty text-tinta-900">
                  {fila.nombreCanonico}
                </p>
                <p className="mt-0.5 font-mono text-xs text-tinta-500">
                  {fila.sku} · {FAMILIA_ETIQUETA[fila.familia]}
                </p>
              </header>
              <InlineText
                key={`alias-${fila.alias ?? ""}`}
                etiqueta={`Alias de ${fila.nombreCanonico}`}
                label="Alias"
                value={fila.alias ?? ""}
                disabled={!canWrite}
                onSave={acciones(fila.productoId).alias}
              />
              <div className="grid grid-cols-2 gap-3">
                <div className="min-w-0">
                  <p className="mst-label text-[11px]">Base</p>
                  <Money
                    centavos={fila.precioBaseCentavos}
                    className="mt-1 text-sm text-tinta-500"
                    truncate
                  />
                </div>
                {canPrecio ? (
                  <InlinePrecio
                    key={String(fila.precioCentavos)}
                    etiqueta={`Precio de ${fila.nombreCanonico}`}
                    label="Precio cliente"
                    centavos={fila.precioCentavos}
                    onSave={acciones(fila.productoId).precio}
                  />
                ) : (
                  <div className="min-w-0">
                    <p className="mst-label text-[11px]">Precio cliente</p>
                    <Money
                      centavos={precioEfectivoCentavos({
                        precioClienteCentavos: fila.precioCentavos,
                        precioBaseCentavos: fila.precioBaseCentavos,
                      })}
                      className="mt-1 text-sm"
                      truncate
                    />
                  </div>
                )}
              </div>
              <InlineText
                key={`nota-${fila.notaProduccion ?? ""}`}
                etiqueta={`Nota de producción de ${fila.nombreCanonico}`}
                label="Nota de producción"
                value={fila.notaProduccion ?? ""}
                disabled={!canWrite}
                onSave={acciones(fila.productoId).nota}
              />
              <Checkbox
                aria-label={`Favorito: ${fila.nombreCanonico}`}
                isDisabled={!canWrite}
                isSelected={fila.favorito}
                onChange={(favorito) => {
                  void acciones(fila.productoId).favorito(favorito);
                }}
              >
                <Checkbox.Content>
                  <Checkbox.Control>
                    <Checkbox.Indicator />
                  </Checkbox.Control>
                  Favorito
                </Checkbox.Content>
              </Checkbox>
            </Card>
          </li>
        ))}
      </ul>

      <div className="hidden min-w-0 overflow-x-auto lg:block">
        <Table>
          <Table.ScrollContainer>
            <Table.Content
              aria-label={`Productos de ${clienteNombre}`}
              className="min-w-[720px]"
            >
              <Table.Header>
                <Table.Column isRowHeader id="producto">
                  Producto
                </Table.Column>
                <Table.Column id="familia">Familia</Table.Column>
                <Table.Column id="alias">Alias</Table.Column>
                <Table.Column id="precio_base">Base</Table.Column>
                <Table.Column id="precio">Precio cliente</Table.Column>
                <Table.Column id="nota">Nota producción</Table.Column>
                <Table.Column id="favorito">Favorito</Table.Column>
              </Table.Header>
              <Table.Body items={items}>
                {(fila: ClienteProductoFila) => (
                  <Table.Row id={fila.productoId}>
                    <Table.Cell>
                      <div className="font-semibold text-tinta-900">
                        {fila.nombreCanonico}
                      </div>
                      <div className="font-mono text-xs text-tinta-500">
                        {fila.sku}
                      </div>
                    </Table.Cell>
                    <Table.Cell className="text-tinta-500">
                      {FAMILIA_ETIQUETA[fila.familia]}
                    </Table.Cell>
                    <Table.Cell>
                      <InlineText
                        key={fila.alias ?? ""}
                        etiqueta={`Alias de ${fila.nombreCanonico}`}
                        value={fila.alias ?? ""}
                        disabled={!canWrite}
                        onSave={acciones(fila.productoId).alias}
                      />
                    </Table.Cell>
                    <Table.Cell className="text-right text-tinta-500">
                      <Money centavos={fila.precioBaseCentavos} />
                    </Table.Cell>
                    <Table.Cell className="text-right">
                      {canPrecio ? (
                        <InlinePrecio
                          key={String(fila.precioCentavos)}
                          etiqueta={`Precio de ${fila.nombreCanonico}`}
                          compact
                          centavos={fila.precioCentavos}
                          onSave={acciones(fila.productoId).precio}
                        />
                      ) : (
                        <Money
                          centavos={precioEfectivoCentavos({
                            precioClienteCentavos: fila.precioCentavos,
                            precioBaseCentavos: fila.precioBaseCentavos,
                          })}
                        />
                      )}
                    </Table.Cell>
                    <Table.Cell>
                      <InlineText
                        key={fila.notaProduccion ?? ""}
                        etiqueta={`Nota de producción de ${fila.nombreCanonico}`}
                        value={fila.notaProduccion ?? ""}
                        disabled={!canWrite}
                        onSave={acciones(fila.productoId).nota}
                      />
                    </Table.Cell>
                    <Table.Cell>
                      <div className="flex justify-center">
                        <Checkbox
                          aria-label={`Favorito: ${fila.nombreCanonico}`}
                          isDisabled={!canWrite}
                          isSelected={fila.favorito}
                          onChange={(favorito) => {
                            void acciones(fila.productoId).favorito(favorito);
                          }}
                        >
                          <Checkbox.Content>
                            <Checkbox.Control>
                              <Checkbox.Indicator />
                            </Checkbox.Control>
                          </Checkbox.Content>
                        </Checkbox>
                      </div>
                    </Table.Cell>
                  </Table.Row>
                )}
              </Table.Body>
            </Table.Content>
          </Table.ScrollContainer>
        </Table>
      </div>
    </>
  );
}

function accionesFila(
  clienteId: string,
  productoId: string,
  refrescar: () => Promise<unknown>,
) {
  const guardar = (body: Record<string, unknown>) =>
    patchProducto(clienteId, productoId, body).then(refrescar);
  return {
    alias: (alias: string) => guardar({ alias: alias || null }),
    precio: (precioCentavos: number | null) => guardar({ precioCentavos }),
    nota: (notaProduccion: string) =>
      guardar({ notaProduccion: notaProduccion || null }),
    favorito: (favorito: boolean) => guardar({ favorito }),
  };
}

function patchProducto(
  clienteId: string,
  productoId: string,
  body: Record<string, unknown>,
) {
  return api(`/clientes/${clienteId}/productos/${productoId}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

function InlineText({
  value,
  etiqueta,
  label,
  disabled,
  onSave,
}: {
  value: string;
  etiqueta: string;
  label?: string;
  disabled: boolean;
  onSave: (value: string) => Promise<unknown>;
}) {
  const [text, setText] = useState(value);
  return (
    <TextField
      aria-label={label ? undefined : etiqueta}
      isDisabled={disabled}
      value={text}
      onChange={setText}
      onBlur={() => {
        if (text !== value) void onSave(text);
      }}
    >
      {label ? <Label>{label}</Label> : null}
      <Input className={label ? "w-full" : "min-w-[8rem]"} />
    </TextField>
  );
}

function InlinePrecio({
  centavos,
  etiqueta,
  label,
  compact = false,
  onSave,
}: {
  centavos: number | null;
  etiqueta: string;
  label?: string;
  compact?: boolean;
  onSave: (value: number | null) => Promise<unknown>;
}) {
  const [text, setText] = useState(
    centavos == null
      ? ""
      : formatearCentavos(centavos, { simbolo: false, miles: false }),
  );
  const [error, setError] = useState<string | null>(null);

  return (
    <TextField
      aria-label={label ? undefined : etiqueta}
      className={compact ? "ml-auto w-28" : "w-full"}
      isInvalid={error != null}
      value={text}
      onChange={setText}
      onBlur={() => {
        if (text.trim() === "") {
          setError(null);
          if (centavos != null) void onSave(null);
          return;
        }
        try {
          const next = quetzalesTextoACentavos(text);
          setError(null);
          if (next !== centavos) void onSave(next);
          setText(formatearCentavos(next, { simbolo: false, miles: false }));
        } catch (err) {
          setError(err instanceof Error ? err.message : "Precio inválido");
        }
      }}
    >
      {label ? <Label>{label}</Label> : null}
      <Input
        className="text-right tabular-nums"
        inputMode="decimal"
        placeholder="Q"
      />
      {error ? (
        <Description className="text-peligro">{error}</Description>
      ) : null}
    </TextField>
  );
}
