"use client";

import { Card } from "@heroui/react";
import { Banknote, ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import type { RutaParada } from "@misupertostada/shared";
import { ClienteAvatar } from "@/components/catalog/cliente-avatar";
import { EstadoBadge } from "@/components/domain/estado-badge";
import { Money } from "@/components/domain/money";
import { Skeleton } from "@/components/ui/skeleton";
import { desgloseCobroParada } from "@/lib/reparto-vista";
import { cn } from "@/lib/utils";

const RAIL_HECHO = "border-l-[var(--green-600)]";
const RAIL_PENDIENTE = "border-l-[var(--amber-600)]";

export function ParadaCard({
  parada,
  sinSincronizar,
  onAbrir,
}: {
  parada: RutaParada;
  sinSincronizar: boolean;
  onAbrir: () => void;
}) {
  const hecho = parada.estado === "ENTREGADO";
  const hora = parada.horarioEntregaFijo ?? "Sin horario";
  const cobro = desgloseCobroParada({
    saldoAnteriorCentavos: parada.saldoAnteriorCentavos,
    factura: parada.factura,
  });
  const estadoLabel = sinSincronizar
    ? "sin sincronizar"
    : hecho
      ? "entregado"
      : "pendiente";
  const badgeCobro =
    cobro.estadoFactura === "PAGADO"
      ? null
      : cobro.facturaAbonadoCentavos > 0
        ? "ABONO_PARCIAL"
        : cobro.mostrarBannerCobrar
          ? "PENDIENTE"
          : null;

  return (
    <button
      type="button"
      onClick={onAbrir}
      aria-label={`${hora} ${parada.clienteNombre} ${estadoLabel}${
        cobro.facturaAbonadoCentavos > 0
          ? `, cobrado ${cobro.facturaAbonadoCentavos} centavos`
          : ""
      }${
        cobro.saldoTotalCentavos > 0
          ? `, por cobrar ${cobro.saldoTotalCentavos} centavos`
          : ""
      }`}
      className={cn(
        "group block w-full rounded-tarjeta text-left",
        "transition-transform duration-control ease-out active:scale-[0.995]",
        "focus-visible:outline-none focus-visible:shadow-foco",
      )}
    >
      <Card
        className={cn(
          "gap-3 border-l-[4px] p-4",
          "transition-[box-shadow,border-color] duration-control ease-out",
          "group-hover:border-[var(--border-strong)] group-hover:shadow-[var(--shadow-md)]",
          hecho ? RAIL_HECHO : RAIL_PENDIENTE,
        )}
      >
        <Card.Header className="flex-row items-start gap-3">
          <ClienteAvatar
            nombre={parada.clienteNombre}
            fotoAssetId={parada.fotoAssetId}
            size="md"
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-display text-xl leading-none tabular-nums text-marca">
                {parada.horarioEntregaFijo ?? "—"}
              </span>
              {sinSincronizar ? (
                <EstadoBadge estado="SIN_SINCRONIZAR" size="sm" />
              ) : (
                <EstadoBadge estado={parada.estado} size="sm" />
              )}
              {badgeCobro ? (
                <EstadoBadge estado={badgeCobro} size="sm" />
              ) : cobro.estadoFactura === "PAGADO" ? (
                <EstadoBadge estado="PAGADO" size="sm" />
              ) : null}
            </div>
            <Card.Title className="mt-1 text-[17px] leading-snug text-pretty text-tinta-900">
              {parada.clienteNombre}
            </Card.Title>
            <p className="mt-0.5 font-mono text-xs tabular-nums text-tinta-500">
              #{parada.correlativo}
            </p>
          </div>
          <ChevronRight
            size={22}
            aria-hidden
            className="mt-1 shrink-0 text-tinta-400 transition-[transform,color] duration-control ease-out group-hover:translate-x-0.5 group-hover:text-marca"
          />
        </Card.Header>

        <Card.Content className="mt-auto grid gap-2">
          <div className="grid grid-cols-2 gap-2 rounded-[calc(var(--radius-card)-6px)] bg-[var(--ink-50)] px-3 py-2.5">
            <Cifra
              etiqueta={cobro.facturaMontoCentavos != null ? "Factura" : "Pedido"}
              valor={
                <Money
                  centavos={
                    cobro.facturaMontoCentavos ?? parada.totalEstimadoCentavos
                  }
                  className="text-[15px]"
                />
              }
            />
            <Cifra
              etiqueta={etiquetaColumnaCobro(cobro)}
              valor={valorColumnaCobro(cobro)}
            />
          </div>

          {cobro.mostrarBannerCobrar && (
            <div
              className={cn(
                "grid gap-2 rounded-[calc(var(--radius-card)-6px)] px-3 py-2.5",
                cobro.facturaAbonadoCentavos > 0
                  ? "border border-[color-mix(in_srgb,var(--green-600)_25%,transparent)] bg-[var(--green-50)]"
                  : "border border-[color-mix(in_srgb,var(--amber-600)_28%,transparent)] bg-[var(--amber-100)]",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-2">
                  <span
                    className={cn(
                      "inline-flex size-8 shrink-0 items-center justify-center rounded-full",
                      cobro.facturaAbonadoCentavos > 0
                        ? "bg-[var(--green-100)] text-[var(--green-800)]"
                        : "bg-[var(--yellow-200)] text-aviso-700",
                    )}
                  >
                    <Banknote size={16} aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <p className="mst-label text-[11px]">
                      {subtituloBannerCobro(cobro)}
                    </p>
                    {cobro.facturaAbonadoCentavos > 0 && (
                      <p className="mt-1 text-sm font-semibold text-tinta-900">
                        Cobrado hoy{" "}
                        <Money
                          centavos={cobro.facturaAbonadoCentavos}
                          tone="pagado"
                          className="text-sm font-semibold"
                        />
                      </p>
                    )}
                    {cobro.facturaSaldoCentavos > 0 && (
                      <p
                        className={cn(
                          "text-sm font-semibold text-tinta-900",
                          cobro.facturaAbonadoCentavos > 0 ? "mt-0.5" : "mt-1",
                        )}
                      >
                        Debe hoy{" "}
                        <Money
                          centavos={cobro.facturaSaldoCentavos}
                          tone="pendiente"
                          className="text-sm font-semibold"
                        />
                      </p>
                    )}
                    {cobro.saldoAnteriorCentavos > 0 && (
                      <p className="mt-0.5 text-[11px] text-tinta-600">
                        + saldo anterior{" "}
                        <Money
                          centavos={cobro.saldoAnteriorCentavos}
                          tone="pendiente"
                          className="text-[11px] font-semibold"
                        />
                      </p>
                    )}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <p className="mst-label text-[10px]">Total</p>
                  <Money
                    centavos={cobro.saldoTotalCentavos}
                    tone="pendiente"
                    className="text-[17px] font-semibold"
                  />
                </div>
              </div>
            </div>
          )}

          {!cobro.mostrarBannerCobrar &&
            cobro.facturaAbonadoCentavos > 0 &&
            cobro.estadoFactura === "PAGADO" && (
              <div className="flex items-center justify-between gap-2 rounded-[calc(var(--radius-card)-6px)] bg-[var(--green-50)] px-3 py-2.5">
                <span className="text-sm text-tinta-700">Cobrado hoy</span>
                <Money
                  centavos={cobro.facturaAbonadoCentavos}
                  tone="pagado"
                  className="text-[15px] font-semibold"
                />
              </div>
            )}
        </Card.Content>
      </Card>
    </button>
  );
}

function etiquetaColumnaCobro(
  cobro: ReturnType<typeof desgloseCobroParada>,
): string {
  if (cobro.facturaMontoCentavos != null) {
    if (cobro.facturaAbonadoCentavos > 0) return "Cobrado hoy";
    if (cobro.facturaSaldoCentavos > 0) return "Debe hoy";
    return "Cobrado hoy";
  }
  return "Saldo anterior";
}

function valorColumnaCobro(
  cobro: ReturnType<typeof desgloseCobroParada>,
): ReactNode {
  if (cobro.facturaMontoCentavos != null) {
    if (cobro.facturaAbonadoCentavos > 0) {
      return (
        <Money
          centavos={cobro.facturaAbonadoCentavos}
          tone="pagado"
          className="text-[15px]"
        />
      );
    }
    if (cobro.facturaSaldoCentavos > 0) {
      return (
        <Money
          centavos={cobro.facturaSaldoCentavos}
          tone="pendiente"
          className="text-[15px]"
        />
      );
    }
    return (
      <Money
        centavos={cobro.facturaMontoCentavos}
        tone="pagado"
        className="text-[15px]"
      />
    );
  }
  return (
    <Money
      centavos={cobro.saldoAnteriorCentavos}
      tone={cobro.saldoAnteriorCentavos > 0 ? "pendiente" : "muted"}
      className="text-[15px]"
    />
  );
}

function subtituloBannerCobro(
  cobro: ReturnType<typeof desgloseCobroParada>,
): string {
  if (cobro.facturaAbonadoCentavos > 0) return "Abono parcial de hoy";
  if (cobro.saldoAnteriorCentavos > 0 && cobro.facturaSaldoCentavos > 0) {
    return "Por cobrar (hoy + anterior)";
  }
  if (cobro.saldoAnteriorCentavos > 0) return "Saldo anterior";
  return "Por cobrar hoy";
}

function Cifra({ etiqueta, valor }: { etiqueta: string; valor: ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="mst-label text-[11px]">{etiqueta}</p>
      <div className="mt-0.5 tabular-nums">{valor}</div>
    </div>
  );
}

export function ParadaCardSkeleton() {
  return (
    <Card className="gap-3 border-l-[4px] border-l-[var(--ink-100)] p-4">
      <div className="flex items-start gap-3">
        <Skeleton className="size-11 shrink-0 rounded-full" />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-12" />
        </div>
      </div>
      <Skeleton className="h-14 w-full rounded-[calc(var(--radius-card)-6px)]" />
    </Card>
  );
}
