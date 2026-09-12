"use client";

import {
  Button,
  ComboBox,
  Input,
  Label,
  ListBox,
  SearchField,
  Select,
  ToggleButton,
  ToggleButtonGroup,
} from "@heroui/react";
import { Filter, X } from "lucide-react";
import {
  PAGO_METODOS,
  PAGO_METODO_ETIQUETA,
  type ClientePublico,
} from "@misupertostada/shared";
import { DateField } from "@/components/ui/date-field";
import { PRESETS_CALENDARIO } from "@/lib/fecha-ui";
import type { VistaCartera } from "./tabla-cartera";

export type TabCartera = "todas" | "pendientes" | "vencidas";

const TODOS = "todos";

export type FiltroChip = {
  key: string;
  label: string;
  clear: () => void;
};

export function FiltrosCartera({
  q,
  onQChange,
  tab,
  onTabChange,
  counts,
  vista,
  onVistaChange,
  sinDte,
  onSinDteChange,
  filtrosAbiertos,
  onToggleFiltros,
  chips,
  totalFiltrado,
  totalMostrado,
  clientes,
  clienteId,
  onClienteChange,
  desde,
  onDesdeChange,
  hasta,
  onHastaChange,
  metodoPago,
  onMetodoPagoChange,
}: {
  q: string;
  onQChange: (q: string) => void;
  tab: TabCartera;
  onTabChange: (tab: TabCartera) => void;
  counts: { todas: number; pendientes: number; vencidas: number };
  vista: VistaCartera;
  onVistaChange: (vista: VistaCartera) => void;
  sinDte: boolean;
  onSinDteChange: (sinDte: boolean) => void;
  filtrosAbiertos: boolean;
  onToggleFiltros: () => void;
  chips: FiltroChip[];
  totalFiltrado: number;
  totalMostrado: number;
  clientes: ClientePublico[];
  clienteId: string;
  onClienteChange: (id: string) => void;
  desde: string;
  onDesdeChange: (d: string) => void;
  hasta: string;
  onHastaChange: (h: string) => void;
  metodoPago: string;
  onMetodoPagoChange: (m: string) => void;
}) {
  const TABS = [
    { id: "pendientes" as const, label: "Pendientes", count: counts.pendientes },
    { id: "vencidas" as const, label: "Vencidas", count: counts.vencidas },
    { id: "todas" as const, label: "Todas", count: counts.todas },
  ];

  const VISTAS = [
    { id: "factura" as const, label: "Recientes primero" },
    { id: "cliente" as const, label: "Por cliente" },
  ];

  return (
    <section className="grid gap-3" aria-label="Buscar y filtrar facturas">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <SearchField
          aria-label="Buscar factura"
          className="min-w-0 flex-1"
          value={q}
          onChange={onQChange}
        >
          <SearchField.Group>
            <SearchField.SearchIcon />
            <SearchField.Input placeholder="Buscar por restaurante, DTE o #pedido" />
            <SearchField.ClearButton />
          </SearchField.Group>
        </SearchField>
        <Button
          aria-expanded={filtrosAbiertos}
          className="shrink-0"
          variant={filtrosAbiertos || chips.length > 0 ? "secondary" : "ghost"}
          onPress={onToggleFiltros}
        >
          <Filter size={16} aria-hidden />
          Filtros
          {chips.length > 0 ? (
            <span className="tabular-nums font-semibold">({chips.length})</span>
          ) : null}
        </Button>
      </div>

      <div className="mst-segmento-activo flex min-w-0 flex-wrap items-center gap-2">
        <ToggleButtonGroup
          aria-label="Estado de facturas"
          disallowEmptySelection
          selectedKeys={new Set([tab])}
          selectionMode="single"
          size="sm"
          onSelectionChange={(keys) => {
            const next = [...keys][0];
            if (typeof next === "string") onTabChange(next as TabCartera);
          }}
        >
          {TABS.map((t, i) => (
            <ToggleButton key={t.id} id={t.id}>
              {i > 0 && <ToggleButtonGroup.Separator />}
              {t.label}
              <span className="tabular-nums text-tinta-500">
                {t.count}
              </span>
            </ToggleButton>
          ))}
        </ToggleButtonGroup>

        <ToggleButtonGroup
          aria-label="Agrupar lista"
          disallowEmptySelection
          selectedKeys={new Set([vista])}
          selectionMode="single"
          size="sm"
          onSelectionChange={(keys) => {
            const next = [...keys][0];
            if (typeof next === "string") onVistaChange(next as VistaCartera);
          }}
        >
          {VISTAS.map((v, i) => (
            <ToggleButton key={v.id} id={v.id}>
              {i > 0 && <ToggleButtonGroup.Separator />}
              {v.label}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>

        <ToggleButton
          isSelected={sinDte}
          size="sm"
          variant="ghost"
          onChange={onSinDteChange}
        >
          Sin DTE
          {sinDte ? <X size={12} aria-hidden /> : null}
        </ToggleButton>

        {chips.map((chip) => (
          <Button
            key={chip.key}
            size="sm"
            variant="tertiary"
            onPress={chip.clear}
          >
            {chip.label}
            <X size={12} aria-hidden />
            <span className="sr-only">Quitar filtro</span>
          </Button>
        ))}

        <p
          className="mst-label w-full tabular-nums sm:ml-auto sm:w-auto text-tinta-600"
          aria-live="polite"
        >
          {totalMostrado} de {totalFiltrado} factura
          {totalFiltrado === 1 ? "" : "s"}
        </p>
      </div>

      {filtrosAbiertos ? (
        <div className="grid gap-3 rounded-tarjeta border border-[var(--border-subtle)] bg-[var(--ink-50)] p-3 sm:grid-cols-2 lg:grid-cols-4">
          <ComboBox
            selectedKey={clienteId || TODOS}
            onSelectionChange={(key) =>
              onClienteChange(!key || key === TODOS ? "" : String(key))
            }
          >
            <Label>Cliente</Label>
            <ComboBox.InputGroup>
              <Input placeholder="Buscar restaurante" />
              <ComboBox.Trigger />
            </ComboBox.InputGroup>
            <ComboBox.Popover>
              <ListBox>
                <ListBox.Item id={TODOS} textValue="Todos">
                  Todos
                  <ListBox.ItemIndicator />
                </ListBox.Item>
                {clientes.map((c) => (
                  <ListBox.Item
                    key={c.id}
                    id={c.id}
                    textValue={c.nombre}
                  >
                    {c.nombre}
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                ))}
              </ListBox>
            </ComboBox.Popover>
          </ComboBox>

          <DateField
            ancla={desde || hasta || undefined}
            id="filtro-desde"
            label="Emitida desde"
            presets={PRESETS_CALENDARIO}
            rangeEnd={hasta || undefined}
            value={desde}
            onChange={onDesdeChange}
            onRangeChange={({ desde: d, hasta: h }) => {
              onDesdeChange(d);
              onHastaChange(h);
            }}
          />
          <DateField
            ancla={hasta || desde || undefined}
            id="filtro-hasta"
            label="Emitida hasta"
            presets={PRESETS_CALENDARIO}
            rangeEnd={desde || undefined}
            value={hasta}
            onChange={onHastaChange}
            onRangeChange={({ desde: d, hasta: h }) => {
              onDesdeChange(d);
              onHastaChange(h);
            }}
          />

          <Select
            placeholder="Todos"
            value={metodoPago || TODOS}
            onChange={(key) =>
              onMetodoPagoChange(!key || key === TODOS ? "" : String(key))
            }
          >
            <Label>Método de pago</Label>
            <Select.Trigger>
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
              <ListBox>
                <ListBox.Item id={TODOS} textValue="Todos">
                  Todos
                  <ListBox.ItemIndicator />
                </ListBox.Item>
                {PAGO_METODOS.map((m) => (
                  <ListBox.Item
                    key={m}
                    id={m}
                    textValue={PAGO_METODO_ETIQUETA[m]}
                  >
                    {PAGO_METODO_ETIQUETA[m]}
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                ))}
              </ListBox>
            </Select.Popover>
          </Select>
        </div>
      ) : null}
    </section>
  );
}
