"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronDown, MessageCircle, Receipt } from "lucide-react";
import type { FacturaCartera } from "@misupertostada/shared";
import { ClienteAvatar } from "@/components/catalog/cliente-avatar";
import { EstadoBadge } from "@/components/domain/estado-badge";
import { Money } from "@/components/domain/money";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { CapturaDte } from "./captura-dte";

export type VistaCartera = "factura" | "cliente";

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

  if (vista === "cliente") {
    return (
      <>
        <CarteraPorCliente
          facturas={facturas}
          puedeDte={puedeDte}
          puedeCobrar={puedeCobrar}
          puedeRecordar={puedeRecordar}
          hintDte={hintDte}
          hintCobro={hintCobro}
          dteLoadingId={dteLoadingId}
          recordarLoadingId={recordarLoadingId}
          onCobrar={onCobrar}
          onRecordar={onRecordar}
          onPedirDte={setDteTarget}
        />
        {dteTarget ? (
          <DialogoCapturaDte
            factura={dteTarget}
            puedeDte={puedeDte}
            hintDte={hintDte}
            loading={dteLoadingId === dteTarget.id}
            onClose={() => setDteTarget(null)}
            onSave={(numeroDte) => {
              onDte(dteTarget, numeroDte);
              setDteTarget(null);
            }}
          />
        ) : null}
      </>
    );
  }

  return (
    <>
      <ul className="grid gap-2 p-3 md:hidden">
        {facturas.map((f) => (
          <li key={f.id}>
            <FacturaCard
              factura={f}
              puedeDte={puedeDte}
              puedeCobrar={puedeCobrar}
              puedeRecordar={puedeRecordar}
              hintCobro={hintCobro}
              recordarLoading={recordarLoadingId === f.clienteId}
              onCobrar={onCobrar}
              onRecordar={onRecordar}
              onPedirDte={setDteTarget}
            />
          </li>
        ))}
      </ul>

      <div className="hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead className="sticky top-0 z-[1]">
              <tr className="bg-tinta-50">
                {(
                  [
                    ["Cliente", "text-left"],
                    ["DTE", "text-left"],
                    ["Pedido", "text-left"],
                    ["Saldo", "text-right"],
                    ["Estado", "text-left"],
                    ["", "text-right"],
                  ] as const
                ).map(([h, align]) => (
                  <th
                    key={h || "acciones"}
                    scope="col"
                    className={`px-4 py-2.5 mst-label text-[11px] ${align}`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {facturas.map((f) => (
                <tr
                  key={f.id}
                  className="border-b border-[var(--border-subtle)] align-middle"
                >
                  <td className="px-4 py-2.5">
                    <ClienteCell
                      clienteId={f.clienteId}
                      nombre={f.clienteNombre}
                      fotoAssetId={f.fotoAssetId}
                    />
                  </td>
                  <td className="px-4 py-2.5">
                    {f.numeroDte ? (
                      <span className="font-mono text-xs tabular-nums">
                        {f.numeroDte}
                      </span>
                    ) : (
                      <button
                        type="button"
                        disabled={!puedeDte}
                        title={hintDte ?? "Capturar número DTE"}
                        onClick={() => setDteTarget(f)}
                        className="inline-flex min-h-9 items-center rounded-campo border border-dashed border-aviso/50 bg-aviso/5 px-2 text-xs font-semibold text-aviso transition-colors hover:border-aviso disabled:opacity-50"
                      >
                        Sin DTE
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs tabular-nums text-tinta-500">
                    #{f.correlativo}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="grid justify-items-end gap-0.5">
                      <Money
                        centavos={f.saldoCentavos}
                        tone={
                          f.estado === "VENCIDO"
                            ? "vencido"
                            : f.estado === "PAGADO"
                              ? "pagado"
                              : "pendiente"
                        }
                      />
                      {f.abonadoCentavos > 0 && f.estado !== "PAGADO" ? (
                        <span className="text-[11px] tabular-nums text-tinta-500">
                          de <Money centavos={f.montoCentavos} tone="muted" />
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    <EstadoBadge estado={f.estado} size="sm" />
                  </td>
                  <td className="px-4 py-2">
                    {f.estado !== "PAGADO" ? (
                      <div className="flex flex-wrap items-center justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={!puedeRecordar}
                          title={
                            puedeRecordar
                              ? "Envía el estado de cuenta por WhatsApp"
                              : "No tiene permiso para enviar WhatsApp"
                          }
                          loading={recordarLoadingId === f.clienteId}
                          onClick={() => onRecordar(f.clienteId)}
                          aria-label={`Recordar a ${f.clienteNombre}`}
                        >
                          <MessageCircle size={15} aria-hidden />
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={!puedeCobrar}
                          title={hintCobro}
                          aria-label={`Registrar pago de ${f.clienteNombre}`}
                          onClick={() => onCobrar(f)}
                        >
                          Cobrar
                        </Button>
                      </div>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {dteTarget ? (
        <DialogoCapturaDte
          factura={dteTarget}
          puedeDte={puedeDte}
          hintDte={hintDte}
          loading={dteLoadingId === dteTarget.id}
          onClose={() => setDteTarget(null)}
          onSave={(numeroDte) => {
            onDte(dteTarget, numeroDte);
            setDteTarget(null);
          }}
        />
      ) : null}
    </>
  );
}

function DialogoCapturaDte({
  factura,
  puedeDte,
  hintDte,
  loading,
  onClose,
  onSave,
}: {
  factura: FacturaCartera;
  puedeDte: boolean;
  hintDte?: string;
  loading?: boolean;
  onClose: () => void;
  onSave: (numeroDte: string) => void;
}) {
  return (
    <Dialog
      open
      title="Capturar DTE"
      description={`${factura.clienteNombre} · pedido #${factura.correlativo}`}
      onClose={onClose}
    >
      <CapturaDte
        id={`dte-dialog-${factura.id}`}
        numeroDte={factura.numeroDte}
        disabled={!puedeDte}
        hint={hintDte}
        loading={loading}
        onSave={onSave}
      />
    </Dialog>
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
      href={`/clientes/${clienteId}`}
      className="group flex min-w-0 items-center gap-2.5 text-inherit no-underline hover:text-inherit hover:no-underline"
    >
      <ClienteAvatar nombre={nombre} fotoAssetId={fotoAssetId} size="sm" />
      <span className="truncate font-semibold text-tinta-900 group-hover:text-marca">
        {nombre}
      </span>
    </Link>
  );
}

function FacturaCard({
  factura: f,
  puedeDte,
  puedeCobrar,
  puedeRecordar,
  hintCobro,
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
  recordarLoading?: boolean;
  onCobrar: (fac: FacturaCartera) => void;
  onRecordar: (clienteId: string) => void;
  onPedirDte: (fac: FacturaCartera) => void;
}) {
  return (
    <article className="grid gap-2.5 rounded-[calc(var(--radius-card)-0.25rem)] border border-[var(--border-subtle)] bg-blanco p-3">
      <div className="flex items-start gap-2.5">
        <ClienteAvatar
          nombre={f.clienteNombre}
          fotoAssetId={f.fotoAssetId}
          size="sm"
        />
        <div className="min-w-0 flex-1">
          <Link
            href={`/clientes/${f.clienteId}`}
            className="block truncate font-semibold text-tinta-900 no-underline hover:text-marca hover:no-underline"
          >
            {f.clienteNombre}
          </Link>
          <p className="mt-0.5 text-xs tabular-nums text-tinta-500">
            #{f.correlativo}
            {f.numeroDte ? ` · ${f.numeroDte}` : ""}
            {f.antiguedadDias > 0 ? ` · ${f.antiguedadDias}d` : ""}
          </p>
        </div>
        <EstadoBadge estado={f.estado} size="sm" />
      </div>

      <div className="flex items-center justify-between gap-2 rounded-[calc(var(--radius-card)-0.5rem)] bg-tinta-50 px-2.5 py-2">
        <span className="mst-label text-[10px]">Saldo</span>
        <Money
          centavos={f.saldoCentavos}
          tone={
            f.estado === "VENCIDO"
              ? "vencido"
              : f.estado === "PAGADO"
                ? "pagado"
                : "pendiente"
          }
        />
      </div>

      {!f.numeroDte ? (
        <button
          type="button"
          disabled={!puedeDte}
          onClick={() => onPedirDte(f)}
          className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-campo border border-dashed border-aviso/50 bg-aviso/5 text-xs font-semibold text-aviso disabled:opacity-50"
        >
          <Receipt size={14} aria-hidden />
          Capturar DTE
        </button>
      ) : null}

      {f.estado !== "PAGADO" ? (
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="secondary"
            className="min-h-11 flex-1"
            disabled={!puedeCobrar}
            title={hintCobro}
            onClick={() => onCobrar(f)}
          >
            Cobrar
          </Button>
          <Button
            size="sm"
            variant="secondary"
            className="min-h-11"
            disabled={!puedeRecordar}
            title={
              puedeRecordar
                ? "Envía el estado de cuenta por WhatsApp"
                : "No tiene permiso para enviar WhatsApp"
            }
            loading={recordarLoading}
            onClick={() => onRecordar(f.clienteId)}
            aria-label={`Recordar a ${f.clienteNombre}`}
          >
            <MessageCircle size={15} aria-hidden />
          </Button>
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
  const [abiertos, setAbiertos] = useState<Set<string>>(() => new Set());

  function toggle(id: string) {
    setAbiertos((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <ul className="grid gap-2 p-3">
      {grupos.map((g) => {
        const abierto = abiertos.has(g.clienteId);
        const cobrable = g.facturas.find((f) => f.estado !== "PAGADO");
        return (
          <li
            key={g.clienteId}
            className="rounded-[calc(var(--radius-card)-0.25rem)] border border-[var(--border-subtle)] bg-blanco"
          >
            <div className="flex flex-wrap items-center gap-2 p-3">
              <button
                type="button"
                onClick={() => toggle(g.clienteId)}
                className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
                aria-expanded={abierto}
              >
                <ClienteAvatar
                  nombre={g.nombre}
                  fotoAssetId={g.fotoAssetId}
                  size="sm"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-tinta-900">
                    {g.nombre}
                  </p>
                  <p className="mt-0.5 text-xs tabular-nums text-tinta-500">
                    {g.facturas.length} factura
                    {g.facturas.length === 1 ? "" : "s"}
                    {g.sinDte > 0 ? ` · ${g.sinDte} sin DTE` : ""}
                    {g.vencidas > 0 ? ` · ${g.vencidas} vencida${g.vencidas === 1 ? "" : "s"}` : ""}
                  </p>
                </div>
                <Money
                  centavos={g.saldoCentavos}
                  tone={g.vencidas > 0 ? "vencido" : "pendiente"}
                />
                <ChevronDown
                  size={16}
                  className={cn(
                    "shrink-0 text-tinta-500 transition-transform",
                    abierto && "rotate-180",
                  )}
                  aria-hidden
                />
              </button>
              {cobrable ? (
                <div className="flex w-full gap-2 sm:w-auto">
                  <Button
                    size="sm"
                    variant="secondary"
                    className="min-h-10 flex-1 sm:flex-none"
                    disabled={!puedeCobrar}
                    title={hintCobro}
                    onClick={() => onCobrar(cobrable)}
                  >
                    Cobrar
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="min-h-10"
                    disabled={!puedeRecordar}
                    loading={recordarLoadingId === g.clienteId}
                    onClick={() => onRecordar(g.clienteId)}
                    aria-label={`Recordar a ${g.nombre}`}
                  >
                    <MessageCircle size={15} aria-hidden />
                  </Button>
                </div>
              ) : null}
            </div>

            {abierto ? (
              <ul className="border-t border-[var(--border-subtle)]">
                {g.facturas.map((f) => (
                  <li
                    key={f.id}
                    className="flex flex-wrap items-center gap-2 border-b border-[var(--border-subtle)] px-3 py-2.5 last:border-b-0"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium tabular-nums text-tinta-900">
                        #{f.correlativo}
                        {f.numeroDte ? (
                          <span className="ml-2 font-mono text-xs text-tinta-500">
                            {f.numeroDte}
                          </span>
                        ) : (
                          <button
                            type="button"
                            disabled={!puedeDte}
                            title={hintDte}
                            onClick={() => onPedirDte(f)}
                            className="ml-2 inline-flex items-center rounded-campo px-1.5 py-0.5 text-[11px] font-semibold text-aviso disabled:opacity-50"
                          >
                            Sin DTE
                          </button>
                        )}
                      </p>
                      <div className="mt-1">
                        <EstadoBadge estado={f.estado} size="sm" />
                      </div>
                    </div>
                    <Money
                      centavos={f.saldoCentavos}
                      tone={
                        f.estado === "VENCIDO"
                          ? "vencido"
                          : f.estado === "PAGADO"
                            ? "pagado"
                            : "pendiente"
                      }
                    />
                    {f.estado !== "PAGADO" ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={!puedeCobrar}
                        title={hintCobro}
                        onClick={() => onCobrar(f)}
                      >
                        Cobrar
                      </Button>
                    ) : null}
                    {dteLoadingId === f.id ? (
                      <Badge tone="neutral">Guardando…</Badge>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : null}
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
    return b.saldoCentavos - a.saldoCentavos;
  });
}
