"use client";

import {
  Button,
  Card,
  Chip,
  Input,
  Label,
  Modal,
  SearchField,
  Table,
  TextField,
} from "@heroui/react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { History } from "lucide-react";
import { useState } from "react";
import {
  AUDIT_PAGE_SIZE_DEFAULT,
  type AuditLista,
  type AuditEntry,
} from "@misupertostada/shared";
import { api } from "@/lib/api";
import { EmptyState } from "@/components/ui/empty-state";
import { RowSkeleton } from "@/components/ui/skeleton";

function qs(params: Record<string, string | number | undefined>): string {
  const u = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === "") continue;
    u.set(k, String(v));
  }
  const s = u.toString();
  return s ? `?${s}` : "";
}

/* El color no decora: separa lo que crea, lo que altera y lo que solo consulta.
   Auditoría se lee de corrido, así que solo se marca lo que no es rutina. */
function colorAccion(accion: string): "success" | "warning" | undefined {
  const a = accion.toUpperCase();
  if (a.includes("CREAR") || a.includes("NUEVO")) return "success";
  if (a.includes("ACTUALIZAR") || a.includes("EDITAR") || a.includes("ANULAR")) {
    return "warning";
  }
  return undefined;
}

export function HistorialCard() {
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [accion, setAccion] = useState("");
  const [entidad, setEntidad] = useState("");
  const [q, setQ] = useState("");
  const [offset, setOffset] = useState(0);
  const [detalle, setDetalle] = useState<AuditEntry | null>(null);

  const limit = AUDIT_PAGE_SIZE_DEFAULT;

  const data = useQuery({
    queryKey: ["audit", { desde, hasta, accion, entidad, q, offset }],
    queryFn: () =>
      api<AuditLista>(
        `/audit${qs({ desde, hasta, accion, entidad, q, limit, offset })}`,
      ),
  });

  const total = data.data?.total ?? 0;
  const items = data.data?.items ?? [];
  const pagina = Math.floor(offset / limit) + 1;
  const paginas = Math.max(1, Math.ceil(total / limit));
  const hayFiltro = Boolean(desde || hasta || accion || entidad || q);

  /* Cualquier cambio de filtro devuelve a la primera página: si no, la lista
     queda en un desplazamiento que ya no existe y aparece vacía sin motivo. */
  function filtrar(set: (v: string) => void) {
    return (v: string) => {
      set(v);
      setOffset(0);
    };
  }

  return (
    <Card className="w-full">
      <Card.Header className="flex flex-col items-start gap-1">
        <Card.Title>Historial de acciones</Card.Title>
        <Card.Description>
          Quién hizo qué y a qué hora. Es solo lectura: no se edita ni se borra,
          ni siquiera desde aquí.
        </Card.Description>
      </Card.Header>

      <Card.Content className="grid gap-4">
        <section className="grid gap-3" aria-label="Filtrar el historial">
          <SearchField
            aria-label="Buscar en el historial"
            value={q}
            onChange={filtrar(setQ)}
          >
            <SearchField.Group>
              <SearchField.SearchIcon />
              <SearchField.Input placeholder="Usuario, entidad o identificador" />
              <SearchField.ClearButton />
            </SearchField.Group>
          </SearchField>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <TextField type="date" value={desde} onChange={filtrar(setDesde)}>
              <Label>Desde</Label>
              <Input className="tabular-nums" />
            </TextField>
            <TextField type="date" value={hasta} onChange={filtrar(setHasta)}>
              <Label>Hasta</Label>
              <Input className="tabular-nums" />
            </TextField>
            <TextField value={accion} onChange={filtrar(setAccion)}>
              <Label>Acción</Label>
              <Input placeholder="Ej. CREAR_PEDIDO" />
            </TextField>
            <TextField value={entidad} onChange={filtrar(setEntidad)}>
              <Label>Entidad</Label>
              <Input placeholder="Ej. Pedido" />
            </TextField>
          </div>
        </section>

        {data.isLoading ? (
          <RowSkeleton rows={8} />
        ) : (
          <div className="overflow-x-auto">
          <Table>
            <Table.ScrollContainer>
              <Table.Content
                aria-label="Registros de auditoría"
                className="min-w-[720px]"
              >
                <Table.Header>
                  <Table.Column isRowHeader id="cuando">
                    Cuándo
                  </Table.Column>
                  <Table.Column id="quien">Quién</Table.Column>
                  <Table.Column id="accion">Acción</Table.Column>
                  <Table.Column id="entidad">Entidad</Table.Column>
                  <Table.Column id="detalle">Detalle</Table.Column>
                </Table.Header>
                <Table.Body
                  items={items}
                  renderEmptyState={() => (
                    <EmptyState
                      icon={<History size={22} aria-hidden />}
                      title={
                        hayFiltro
                          ? "Ningún registro con esos filtros"
                          : "Todavía no hay movimientos"
                      }
                      description={
                        hayFiltro
                          ? "Amplíe el rango de fechas o borre la acción y la entidad; la búsqueda es exacta al texto."
                          : "En cuanto alguien capture, entregue o cobre, el movimiento aparece aquí."
                      }
                      action={
                        hayFiltro ? (
                          <Button
                            size="sm"
                            variant="tertiary"
                            onPress={() => {
                              setDesde("");
                              setHasta("");
                              setAccion("");
                              setEntidad("");
                              setQ("");
                              setOffset(0);
                            }}
                          >
                            Quitar filtros
                          </Button>
                        ) : null
                      }
                    />
                  )}
                >
                  {(row: AuditEntry) => (
                    <Table.Row id={row.id}>
                      <Table.Cell className="whitespace-nowrap tabular-nums">
                        <div className="font-semibold text-tinta-900">
                          {format(new Date(row.createdAt), "dd MMM yyyy", {
                            locale: es,
                          })}
                        </div>
                        <div className="text-xs text-tinta-500">
                          {format(new Date(row.createdAt), "HH:mm:ss")}
                        </div>
                      </Table.Cell>
                      <Table.Cell className="font-medium text-tinta-900">
                        {row.actorUsername ?? row.actorTipo}
                      </Table.Cell>
                      <Table.Cell>
                        <Chip
                          color={colorAccion(row.accion)}
                          size="sm"
                          variant="soft"
                        >
                          {row.accion}
                        </Chip>
                      </Table.Cell>
                      <Table.Cell>
                        <div className="font-medium text-tinta-900">
                          {row.entidad}
                        </div>
                        <div className="font-mono text-xs tabular-nums text-tinta-500">
                          {row.entidadId.slice(0, 8)}
                        </div>
                      </Table.Cell>
                      <Table.Cell className="text-right">
                        <Button
                          aria-label={`Ver el detalle de ${row.accion}`}
                          size="sm"
                          variant="tertiary"
                          onPress={() => setDetalle(row)}
                        >
                          Ver
                        </Button>
                      </Table.Cell>
                    </Table.Row>
                  )}
                </Table.Body>
              </Table.Content>
            </Table.ScrollContainer>
          </Table>
          </div>
        )}
      </Card.Content>

      <Card.Footer className="flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="mst-label tabular-nums" aria-live="polite">
          {data.isLoading
            ? "Cargando registros…"
            : total === 0
              ? "0 registros"
              : `${offset + 1}–${Math.min(offset + limit, total)} de ${total} · página ${pagina} de ${paginas}`}
        </p>
        <div className="flex shrink-0 gap-2">
          <Button
            isDisabled={offset === 0}
            size="sm"
            variant="secondary"
            onPress={() => setOffset(Math.max(0, offset - limit))}
          >
            Anterior
          </Button>
          <Button
            isDisabled={offset + limit >= total}
            size="sm"
            variant="secondary"
            onPress={() => setOffset(offset + limit)}
          >
            Siguiente
          </Button>
        </div>
      </Card.Footer>

      <DetalleModal entry={detalle} onClose={() => setDetalle(null)} />
    </Card>
  );
}

function DetalleModal({
  entry,
  onClose,
}: {
  entry: AuditEntry | null;
  onClose: () => void;
}) {
  if (!entry) return null;

  return (
    <Modal.Backdrop
      isOpen
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <Modal.Container size="lg">
        <Modal.Dialog>
          <Modal.CloseTrigger />
          <Modal.Header>
            <Modal.Heading>Detalle del registro</Modal.Heading>
            <p className="text-sm tabular-nums text-tinta-500">
              {format(
                new Date(entry.createdAt),
                "dd 'de' MMMM 'de' yyyy, HH:mm:ss",
                { locale: es },
              )}
            </p>
          </Modal.Header>

          <Modal.Body>
            <div className="grid gap-5">
              <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                <div>
                  <dt className="mst-label text-[11px]">Acción</dt>
                  <dd className="mt-1">
                    <Chip
                      color={colorAccion(entry.accion)}
                      size="sm"
                      variant="soft"
                    >
                      {entry.accion}
                    </Chip>
                  </dd>
                </div>
                <div className="min-w-0">
                  <dt className="mst-label text-[11px]">Entidad</dt>
                  <dd className="mt-1 font-medium text-tinta-900">
                    {entry.entidad}
                    <span className="block truncate font-mono text-xs font-normal text-tinta-500">
                      {entry.entidadId}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className="mst-label text-[11px]">Quién</dt>
                  <dd className="mt-1 font-medium text-tinta-900">
                    {entry.actorUsername ?? entry.actorTipo}
                    {entry.ip ? (
                      <span className="block font-mono text-xs font-normal tabular-nums text-tinta-500">
                        {entry.ip}
                      </span>
                    ) : null}
                  </dd>
                </div>
              </dl>

              {entry.antes != null || entry.despues != null ? (
                <div className="grid gap-4 border-t border-[var(--border-subtle)] pt-4 sm:grid-cols-2">
                  {entry.antes != null ? (
                    <div>
                      <p className="mst-label mb-2 text-[11px]">Antes</p>
                      <pre className="max-h-64 overflow-auto rounded-campo bg-[var(--ink-50)] p-3 text-xs leading-relaxed text-tinta-800">
                        {JSON.stringify(entry.antes, null, 2)}
                      </pre>
                    </div>
                  ) : null}
                  {entry.despues != null ? (
                    <div>
                      <p className="mst-label mb-2 text-[11px]">Después</p>
                      <pre className="max-h-64 overflow-auto rounded-campo bg-[var(--ink-50)] p-3 text-xs leading-relaxed text-tinta-800">
                        {JSON.stringify(entry.despues, null, 2)}
                      </pre>
                    </div>
                  ) : null}
                </div>
              ) : (
                <p className="text-xs text-tinta-500">
                  Este movimiento no guardó un antes ni un después: quedó
                  registrado solo el hecho.
                </p>
              )}
            </div>
          </Modal.Body>

          <Modal.Footer>
            <Button variant="tertiary" onPress={onClose}>
              Cerrar
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
