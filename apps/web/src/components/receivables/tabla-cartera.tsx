"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Button,
  Chip,
  Disclosure,
  Modal,
  Spinner,
  Table,
} from "@heroui/react";
import { MessageCircle } from "lucide-react";
import type { FacturaCartera } from "@misupertostada/shared";
import { ordenarFacturasFifo } from "@misupertostada/shared";
import { ClienteAvatar } from "@/components/catalog/cliente-avatar";
import { EstadoBadge } from "@/components/domain/estado-badge";
import { Money } from "@/components/domain/money";
import { etiquetaDiaSemanaCorto } from "@/lib/fecha-ui";
import { DialogoCapturaDte } from "./dialogo-captura-dte";
import { BotonDte } from "./boton-dte";
import { cn } from "@/lib/utils";

export type VistaCartera = "factura" | "cliente";

/** El saldo se lee por color antes que por cifra: vencido rojo, pagado verde. */
function tonoSaldo(f: FacturaCartera) {
  if (f.estado === "VENCIDO") return "vencido" as const;
  if (f.estado === "PAGADO") return "pagado" as const;
  return "pendiente" as const;
}

export function TablaCartera({
  facturas,
  vista,
  puedeDte,
  puedeCobrar,
  puedeRecordar,
  hintDte,
  hintCobro,
  dteLoadingId,
  recordarLoadingId,
  onCobrar,
  onDte,
  onRecordar,
}: {
  facturas: FacturaCartera[];
  vista: VistaCartera;
  puedeDte: boolean;
  puedeCobrar: boolean;
  puedeRecordar: boolean;
  hintDte?: string;
  hintCobro?: string;
  dteLoadingId?: string;
  recordarLoadingId?: string;
  onCobrar: (fac: FacturaCartera) => void;
  onDte: (fac: FacturaCartera, numeroDte: string) => void;
  onRecordar: (clienteId: string) => void;
}) {
  const [dteTarget, setDteTarget] = useState<FacturaCartera | null>(null);

  const modalDte = dteTarget ? (
    <DialogoCapturaDte
      clienteNombre={dteTarget.clienteNombre}
      correlativo={dteTarget.correlativo}
      facturaId={dteTarget.id}
      hintDte={hintDte}
      loading={dteLoadingId === dteTarget.id}
      numeroDte={dteTarget.numeroDte}
      puedeDte={puedeDte}
      onClose={() => setDteTarget(null)}
      onSave={(numeroDte) => {
        onDte(dteTarget, numeroDte);
        setDteTarget(null);
      }}
    />
  ) : null;

  if (vista === "cliente") {
    return (
      <>
        <CarteraPorCliente
          dteLoadingId={dteLoadingId}
          facturas={facturas}
          hintCobro={hintCobro}
          hintDte={hintDte}
          puedeCobrar={puedeCobrar}
          puedeDte={puedeDte}
          puedeRecordar={puedeRecordar}
          recordarLoadingId={recordarLoadingId}
          onCobrar={onCobrar}
          onPedirDte={setDteTarget}
          onRecordar={onRecordar}
        />
        {modalDte}
      </>
    );
  }

  return (
    <>
      {/* Móvil: fila-tarjeta. En tablet en ruta la fila de tabla no cabe sin
          scroll horizontal, y el cobro se hace con el pulgar. */}
      <ul className="grid gap-2 p-3 md:hidden">
        {facturas.map((f) => (
          <li key={f.id}>
            <FacturaCard
              factura={f}
              hintCobro={hintCobro}
              hintDte={hintDte}
              puedeCobrar={puedeCobrar}
              puedeDte={puedeDte}
              puedeRecordar={puedeRecordar}
              recordarLoading={recordarLoadingId === f.clienteId}
              onCobrar={onCobrar}
              onPedirDte={setDteTarget}
              onRecordar={onRecordar}
            />
          </li>
        ))}
      </ul>

      <div className="hidden md:block">
        <Table>
          <Table.ScrollContainer>
            <Table.Content
              aria-label="Facturas de cartera"
              className="min-w-[760px]"
            >
              <Table.Header>
                <Table.Column isRowHeader id="cliente">
                  Cliente
                </Table.Column>
                <Table.Column id="dte">DTE</Table.Column>
                <Table.Column id="pedido">Operación</Table.Column>
                <Table.Column id="saldo">Saldo</Table.Column>
                <Table.Column id="estado">Estado</Table.Column>
                <Table.Column id="acciones">Acciones</Table.Column>
              </Table.Header>
              <Table.Body items={facturas}>
                {(f: FacturaCartera) => (
                  <Table.Row id={f.id}>
                    <Table.Cell>
                      <ClienteCell
                        clienteId={f.clienteId}
                        fotoAssetId={f.fotoAssetId}
                        nombre={f.clienteNombre}
                      />
                    </Table.Cell>
                    <Table.Cell>
                      <BotonDte
                        hint={
                          hintDte ??
                          (f.numeroDte
                            ? `Corregir DTE del pedido #${f.correlativo}`
                            : `Capturar DTE del pedido #${f.correlativo}`)
                        }
                        numeroDte={f.numeroDte}
                        puedeEditar={puedeDte}
                        presentacion={f.numeroDte ? "inline" : "pill"}
                        onPress={() => setDteTarget(f)}
                      />
                    </Table.Cell>
                    <Table.Cell className="font-mono text-xs tabular-nums text-tinta-500">
                      <EtiquetaOperacion factura={f} />
                    </Table.Cell>
                    <Table.Cell className="text-right">
                      <DesgloseSaldoFactura factura={f} compacto />
                    </Table.Cell>
                    <Table.Cell>
                      <EstadoBadge estado={f.estado} size="sm" />
                    </Table.Cell>
                    <Table.Cell>
                      {f.estado !== "PAGADO" ? (
                        <div className="flex flex-wrap items-center justify-end gap-1.5">
                          <BotonRecordar
                            cargando={recordarLoadingId === f.clienteId}
                            nombre={f.clienteNombre}
                            puedeRecordar={puedeRecordar}
                            onRecordar={() => onRecordar(f.clienteId)}
                          />
                          <Button
                            aria-label={
                              hintCobro ??
                              `Registrar pago de ${f.clienteNombre}`
                            }
                            isDisabled={!puedeCobrar}
                            size="sm"
                            variant="secondary"
                            onPress={() => onCobrar(f)}
                          >
                            Cobrar
                          </Button>
                        </div>
                      ) : null}
                    </Table.Cell>
                  </Table.Row>
                )}
              </Table.Body>
            </Table.Content>
          </Table.ScrollContainer>
        </Table>
      </div>

      {modalDte}
    </>
  );
}

function BotonRecordar({
  nombre,
  puedeRecordar,
  cargando,
  onRecordar,
  className,
}: {
  nombre: string;
  puedeRecordar: boolean;
  cargando: boolean;
  onRecordar: () => void;
  className?: string;
}) {
  return (
    <Button
      aria-label={
        puedeRecordar
          ? `Recordar a ${nombre}: envía el estado de cuenta por WhatsApp`
          : "No tiene permiso para enviar WhatsApp"
      }
      className={className}
      isDisabled={!puedeRecordar}
      isPending={cargando}
      size="sm"
      variant="secondary"
      onPress={onRecordar}
    >
      {({ isPending }) =>
        isPending ? (
          <Spinner color="current" size="sm" />
        ) : (
          <MessageCircle size={15} aria-hidden />
        )
      }
    </Button>
  );
}

function ClienteCell({
  clienteId,
  nombre,
  fotoAssetId,
}: {
  clienteId: string;
  nombre: string;
  fotoAssetId?: string | null;
}) {
  return (
    <Link
      className="group flex min-w-0 items-center gap-2.5 text-inherit no-underline hover:text-inherit hover:no-underline"
      href={`/clientes/${clienteId}`}
    >
      <ClienteAvatar fotoAssetId={fotoAssetId} nombre={nombre} size="sm" />
      <span className="truncate font-semibold text-tinta-900 group-hover:text-marca">
        {nombre}
      </span>
    </Link>
  );
}

/** Cobrado / debe / factura en una sola lectura; evita confundir saldo con monto. */
function DesgloseSaldoFactura({
  factura: f,
  compacto,
  className,
}: {
  factura: FacturaCartera;
  compacto?: boolean;
  className?: string;
}) {
  const tono = tonoSaldo(f);
  const parcial = f.abonadoCentavos > 0 && f.estado !== "PAGADO";

  if (parcial) {
    return (
      <div
        className={cn(
          "grid min-w-0 gap-1 rounded-[calc(var(--radius-card)-0.5rem)] bg-tinta-50 px-2.5 py-2",
          className,
        )}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="mst-label shrink-0 text-[10px]">Cobrado</span>
          <Money
            centavos={f.abonadoCentavos}
            tone="pagado"
            truncate
            className={compacto ? "text-sm" : "text-[15px]"}
          />
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="mst-label shrink-0 text-[10px]">Debe</span>
          <Money
            centavos={f.saldoCentavos}
            tone={tono}
            truncate
            className={compacto ? "text-sm font-semibold" : "text-[15px] font-semibold"}
          />
        </div>
        <p className="text-[10px] tabular-nums text-tinta-500">
          Factura{" "}
          <Money centavos={f.montoCentavos} tone="muted" className="text-[10px]" />
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-2 rounded-[calc(var(--radius-card)-0.5rem)] bg-tinta-50 px-2.5 py-2",
        className,
      )}
    >
      <span className="mst-label shrink-0 text-[10px]">
        {f.estado === "PAGADO" ? "Pagado" : "Debe"}
      </span>
      <Money
        centavos={f.estado === "PAGADO" ? f.montoCentavos : f.saldoCentavos}
        tone={tono}
        truncate
        className={compacto ? "text-sm" : undefined}
      />
    </div>
  );
}

function FacturaCard({
  factura: f,
  puedeDte,
  puedeCobrar,
  puedeRecordar,
  hintCobro,
  hintDte,
  recordarLoading,
  onCobrar,
  onRecordar,
  onPedirDte,
}: {
  factura: FacturaCartera;
  puedeDte: boolean;
  puedeCobrar: boolean;
  puedeRecordar: boolean;
  hintCobro?: string;
  hintDte?: string;
  recordarLoading?: boolean;
  onCobrar: (fac: FacturaCartera) => void;
  onRecordar: (clienteId: string) => void;
  onPedirDte: (fac: FacturaCartera) => void;
}) {
  return (
    <article className="grid min-w-0 gap-2.5 rounded-[calc(var(--radius-card)-0.25rem)] border border-[var(--border-subtle)] bg-blanco p-3">
      <div className="flex items-start gap-2.5">
        <ClienteAvatar
          fotoAssetId={f.fotoAssetId}
          nombre={f.clienteNombre}
          size="sm"
        />
        <div className="min-w-0 flex-1">
          <Link
            className="block truncate font-semibold text-tinta-900 no-underline hover:text-marca hover:no-underline"
            href={`/clientes/${f.clienteId}`}
          >
            {f.clienteNombre}
          </Link>
          <p className="mt-0.5 text-xs tabular-nums text-tinta-500">
            <EtiquetaOperacion factura={f} />
          </p>
          {f.numeroDte ? (
            <div className="mt-1">
              <BotonDte
                hint={
                  hintDte ?? `Corregir DTE del pedido #${f.correlativo}`
                }
                numeroDte={f.numeroDte}
                puedeEditar={puedeDte}
                presentacion="inline"
                onPress={() => onPedirDte(f)}
              />
            </div>
          ) : null}
        </div>
        <EstadoBadge estado={f.estado} size="sm" />
      </div>

      <DesgloseSaldoFactura factura={f} />

      {!f.numeroDte ? (
        <BotonDte
          hint={hintDte ?? `Capturar DTE del pedido #${f.correlativo}`}
          numeroDte={null}
          puedeEditar={puedeDte}
          presentacion="boton"
          onPress={() => onPedirDte(f)}
        />
      ) : null}

      {f.estado !== "PAGADO" ? (
        <div className="flex flex-wrap gap-2">
          <Button
            aria-label={hintCobro ?? `Registrar pago de ${f.clienteNombre}`}
            className="min-h-11 flex-1"
            isDisabled={!puedeCobrar}
            size="sm"
            variant="secondary"
            onPress={() => onCobrar(f)}
          >
            Cobrar
          </Button>
          <BotonRecordar
            cargando={Boolean(recordarLoading)}
            className="min-h-11"
            nombre={f.clienteNombre}
            puedeRecordar={puedeRecordar}
            onRecordar={() => onRecordar(f.clienteId)}
          />
        </div>
      ) : null}
    </article>
  );
}

type GrupoCliente = {
  clienteId: string;
  nombre: string;
  fotoAssetId: string | null;
  saldoCentavos: number;
  facturas: FacturaCartera[];
  sinDte: number;
  vencidas: number;
};

function CarteraPorCliente({
  facturas,
  puedeDte,
  puedeCobrar,
  puedeRecordar,
  hintDte,
  hintCobro,
  dteLoadingId,
  recordarLoadingId,
  onCobrar,
  onRecordar,
  onPedirDte,
}: {
  facturas: FacturaCartera[];
  puedeDte: boolean;
  puedeCobrar: boolean;
  puedeRecordar: boolean;
  hintDte?: string;
  hintCobro?: string;
  dteLoadingId?: string;
  recordarLoadingId?: string;
  onCobrar: (fac: FacturaCartera) => void;
  onRecordar: (clienteId: string) => void;
  onPedirDte: (fac: FacturaCartera) => void;
}) {
  const grupos = useMemo(() => agruparPorCliente(facturas), [facturas]);

  return (
    <ul className="grid gap-2 p-3">
      {grupos.map((g) => {
        const cobrable = g.facturas.find((f) => f.estado !== "PAGADO");
        return (
          <li
            key={g.clienteId}
            className="rounded-[calc(var(--radius-card)-0.25rem)] border border-[var(--border-subtle)] bg-blanco"
          >
            <Disclosure>
              <div className="flex flex-wrap items-center gap-2 p-3">
                <Disclosure.Heading className="min-w-0 flex-1">
                  <Button
                    className="w-full justify-start gap-2.5 text-left"
                    slot="trigger"
                    variant="ghost"
                  >
                    <ClienteAvatar
                      fotoAssetId={g.fotoAssetId}
                      nombre={g.nombre}
                      size="sm"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold text-tinta-900">
                        {g.nombre}
                      </span>
                      <span className="mt-0.5 block truncate text-xs tabular-nums font-normal text-tinta-500">
                        {g.facturas.length} factura
                        {g.facturas.length === 1 ? "" : "s"}
                        {g.sinDte > 0 ? ` · ${g.sinDte} sin DTE` : ""}
                        {g.vencidas > 0
                          ? ` · ${g.vencidas} vencida${g.vencidas === 1 ? "" : "s"}`
                          : ""}
                      </span>
                    </span>
                    <Money
                      centavos={g.saldoCentavos}
                      tone={g.vencidas > 0 ? "vencido" : "pendiente"}
                      truncate
                      className="hidden shrink-0 text-sm sm:block"
                    />
                    <Disclosure.Indicator className="shrink-0" />
                  </Button>
                </Disclosure.Heading>
                <div className="flex w-full items-center justify-between gap-2 pl-11 sm:hidden">
                  <span className="mst-label text-[10px]">Saldo</span>
                  <Money
                    centavos={g.saldoCentavos}
                    tone={g.vencidas > 0 ? "vencido" : "pendiente"}
                    truncate
                    className="text-sm"
                  />
                </div>
                {cobrable ? (
                  <div className="flex w-full gap-2 sm:w-auto">
                    <Button
                      aria-label={hintCobro ?? `Registrar pago de ${g.nombre}`}
                      className="min-h-11 flex-1 sm:flex-none"
                      isDisabled={!puedeCobrar}
                      size="sm"
                      variant="secondary"
                      onPress={() => onCobrar(cobrable)}
                    >
                      Cobrar
                    </Button>
                    <BotonRecordar
                      cargando={recordarLoadingId === g.clienteId}
                      className="min-h-11"
                      nombre={g.nombre}
                      puedeRecordar={puedeRecordar}
                      onRecordar={() => onRecordar(g.clienteId)}
                    />
                  </div>
                ) : null}
              </div>

              <Disclosure.Content>
                <Disclosure.Body className="border-t border-[var(--border-subtle)] p-0">
                  <p className="border-b border-[var(--border-subtle)] px-3 py-2 text-[11px] text-tinta-600">
                    Arriba la factura más vieja: es la que recibe el próximo
                    cobro.
                  </p>
                  <ul>
                    {[...g.facturas]
                      .sort(ordenarFacturasFifo)
                      .map((f, idx) => (
                      <li
                        key={f.id}
                        className="flex flex-wrap items-center gap-2 border-b border-[var(--border-subtle)] px-3 py-2.5 last:border-b-0"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-medium tabular-nums text-tinta-900">
                              #{f.correlativo}
                            </p>
                            {idx === 0 && f.estado !== "PAGADO" ? (
                              <Chip color="warning" size="sm" variant="soft">
                                Siguiente cobro
                              </Chip>
                            ) : null}
                          </div>
                          <p className="mt-0.5 text-[11px] tabular-nums text-tinta-500">
                            <EtiquetaOperacion factura={f} />
                          </p>
                          <div className="mt-0.5">
                            <BotonDte
                              hint={
                                hintDte ??
                                (f.numeroDte
                                  ? `Corregir DTE del pedido #${f.correlativo}`
                                  : `Capturar DTE del pedido #${f.correlativo}`)
                              }
                              numeroDte={f.numeroDte}
                              puedeEditar={puedeDte}
                              presentacion={f.numeroDte ? "inline" : "pill"}
                              onPress={() => onPedirDte(f)}
                            />
                          </div>
                          <div className="mt-1 flex items-center gap-2">
                            <EstadoBadge estado={f.estado} size="sm" />
                            {dteLoadingId === f.id ? (
                              <Chip size="sm" variant="soft">
                                Guardando…
                              </Chip>
                            ) : null}
                          </div>
                        </div>
                        <DesgloseSaldoFactura
                          factura={f}
                          compacto
                          className="shrink-0 sm:text-base"
                        />
                        {f.estado !== "PAGADO" ? (
                          <Button
                            aria-label={
                              hintCobro ??
                              `Registrar pago del pedido #${f.correlativo}`
                            }
                            isDisabled={!puedeCobrar}
                            size="sm"
                            variant="secondary"
                            onPress={() => onCobrar(f)}
                          >
                            Cobrar
                          </Button>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </Disclosure.Body>
              </Disclosure.Content>
            </Disclosure>
          </li>
        );
      })}
    </ul>
  );
}

function agruparPorCliente(facturas: FacturaCartera[]): GrupoCliente[] {
  const map = new Map<string, GrupoCliente>();
  for (const f of facturas) {
    const prev = map.get(f.clienteId);
    if (!prev) {
      map.set(f.clienteId, {
        clienteId: f.clienteId,
        nombre: f.clienteNombre,
        fotoAssetId: f.fotoAssetId,
        saldoCentavos: f.estado === "PAGADO" ? 0 : f.saldoCentavos,
        facturas: [f],
        sinDte: f.numeroDte ? 0 : 1,
        vencidas: f.estado === "VENCIDO" ? 1 : 0,
      });
      continue;
    }
    map.set(f.clienteId, {
      ...prev,
      saldoCentavos:
        prev.saldoCentavos + (f.estado === "PAGADO" ? 0 : f.saldoCentavos),
      facturas: [...prev.facturas, f],
      sinDte: prev.sinDte + (f.numeroDte ? 0 : 1),
      vencidas: prev.vencidas + (f.estado === "VENCIDO" ? 1 : 0),
    });
  }
  return [...map.values()].sort((a, b) => {
    if (b.vencidas !== a.vencidas) return b.vencidas - a.vencidas;
    const fa = maxFechaOperacion(a.facturas);
    const fb = maxFechaOperacion(b.facturas);
    if (fa !== fb) return fa < fb ? 1 : -1;
    if (b.saldoCentavos !== a.saldoCentavos) {
      return b.saldoCentavos - a.saldoCentavos;
    }
    return a.nombre.localeCompare(b.nombre, "es");
  });
}

function maxFechaOperacion(facturas: FacturaCartera[]): string {
  return facturas.reduce(
    (max, f) => (f.fechaOperacion > max ? f.fechaOperacion : max),
    "",
  );
}

function EtiquetaOperacion({ factura: f }: { factura: FacturaCartera }) {
  return (
    <>
      #{f.correlativo} · {etiquetaDiaSemanaCorto(f.fechaOperacion)}
      {f.antiguedadDias > 0 ? ` · ${f.antiguedadDias}d` : ""}
    </>
  );
}
