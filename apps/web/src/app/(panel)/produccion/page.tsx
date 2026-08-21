"use client";

import { useQuery } from "@tanstack/react-query";
import { Copy, Download, Factory, Printer } from "lucide-react";
import { useState, type ReactNode } from "react";
import {
  FAMILIA_ETIQUETA,
  MENSAJE_HOJA_NO_MATERIALIZADA,
  UNIDAD_CORTA,
  type ActorPublico,
  type HojaPublica,
  type OperacionResumen,
} from "@misupertostada/shared";
import { api, ApiError } from "@/lib/api";
import { PanelShell } from "@/components/layout/panel-shell";
import { PageToolbar } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { HojaGrupos } from "@/components/fulfillment/hoja-grupos";
import { ConsolidadoPreview } from "@/components/fulfillment/consolidado-preview";
import { totalesPorFamilia } from "@/lib/produccion-vista";
import { toastFromError, toastSuccess } from "@/lib/toast";

type VistaHoja = "toda" | "cambios";

export default function ProduccionPage() {
  const me = useQuery({
    queryKey: ["auth", "me"],
    queryFn: () => api<{ usuario: ActorPublico }>("/auth/me"),
  });
  const operacion = useQuery({
    queryKey: ["operacion"],
    queryFn: () => api<OperacionResumen>("/operacion"),
    enabled: Boolean(me.data),
  });
  const fecha = operacion.data?.fechaOperacion ?? "";
  const hoja = useQuery({
    queryKey: ["hoja", fecha],
    queryFn: () => api<HojaPublica>(`/hojas/${fecha}`),
    enabled: Boolean(fecha),
    retry: false,
  });

  const v2 = (hoja.data?.version ?? 1) > 1;
  const [vista, setVista] = useState<VistaHoja>("cambios");
  const [copiando, setCopiando] = useState(false);
  const [descargando, setDescargando] = useState<"pdf" | "txt" | null>(null);
  const [imprimiendo, setImprimiendo] = useState(false);
  const [anuncioCopia, setAnuncioCopia] = useState("");

  const sinHoja =
    hoja.error instanceof ApiError && hoja.error.code === "HOJA_NO_MATERIALIZADA";
  const errorHoja =
    hoja.error instanceof ApiError && !sinHoja ? hoja.error : null;

  const lineas = hoja.data?.snapshot.productos ?? [];
  const totales = totalesPorFamilia(lineas);
  const soloCambios = v2 && vista === "cambios";

  function anunciar(mensaje: string) {
    setAnuncioCopia("");
    queueMicrotask(() => setAnuncioCopia(mensaje));
  }

  async function copiar() {
    if (!fecha) return;
    setCopiando(true);
    try {
      const texto = await api<string>(`/hojas/${fecha}.txt`);
      await navigator.clipboard.writeText(texto);
      toastSuccess("Consolidado copiado");
      anunciar("Consolidado copiado al portapapeles");
    } catch (err) {
      toastFromError(err, "No se pudo copiar el consolidado");
      anunciar("No se pudo copiar el consolidado");
    } finally {
      setCopiando(false);
    }
  }

  async function descargar(ext: "pdf" | "txt") {
    if (!fecha) return;
    setDescargando(ext);
    try {
      const payload = await api<Blob | string>(`/hojas/${fecha}.${ext}`);
      const blob =
        typeof payload === "string"
          ? new Blob([payload], { type: "text/plain;charset=utf-8" })
          : payload;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `hoja-${fecha}.${ext}`;
      a.click();
      URL.revokeObjectURL(url);
      toastSuccess(ext === "pdf" ? "PDF descargado" : "Texto descargado");
    } catch (err) {
      toastFromError(err, "No se pudo descargar la hoja");
    } finally {
      setDescargando(null);
    }
  }

  async function imprimir() {
    if (!fecha) return;
    setImprimiendo(true);
    try {
      const blob = await api<Blob>(`/hojas/${fecha}.pdf`);
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener");
      window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch (err) {
      toastFromError(err, "No se pudo abrir el PDF");
    } finally {
      setImprimiendo(false);
    }
  }

  return (
    <PanelShell title="Producción">
      <div className="grid gap-4">
        <PageToolbar
          description="Hoja del día: cantidades por familia. A la derecha, el consolidado del cierre para copiar o descargar."
          meta={
            hoja.data
              ? `versión ${hoja.data.version} · ${fecha}`
              : fecha
                ? fecha
                : undefined
          }
          actions={
            hoja.data ? (
              <>
                {hoja.data.diaEstado === "REABIERTO" && (
                  <Badge tone="amber">Reabierto</Badge>
                )}
                <Button
                  size="sm"
                  variant="secondary"
                  loading={imprimiendo}
                  onClick={() => void imprimir()}
                >
                  <Printer size={15} aria-hidden />
                  Imprimir
                </Button>
                <Button
                  size="sm"
                  variant="accent"
                  loading={copiando}
                  onClick={() => void copiar()}
                >
                  <Copy size={15} aria-hidden />
                  Copiar consolidado
                </Button>
              </>
            ) : undefined
          }
        />

        <span className="sr-only" role="status" aria-live="polite">
          {anuncioCopia}
        </span>

        {hoja.data && (
          <div className="flex flex-wrap gap-3">
            {totales.map((t) => (
              <Metric
                key={t.familia}
                label={FAMILIA_ETIQUETA[t.familia]}
                hint={UNIDAD_CORTA[t.unidadDominante]}
              >
                {t.cantidad}
              </Metric>
            ))}
          </div>
        )}

        <div
          className={
            hoja.data
              ? "grid gap-4 lg:grid-cols-[1.5fr_1fr] lg:items-start"
              : "grid gap-4"
          }
        >
          <Card
            flush
            title="Hoja de producción"
            subtitle={
              hoja.data?.motivoReapertura
                ? `Día reabierto · “${hoja.data.motivoReapertura}”`
                : undefined
            }
            actions={
              v2 && hoja.data ? (
                <SegmentedControl
                  label="Vista de la hoja"
                  value={vista}
                  onChange={setVista}
                  options={[
                    { id: "toda", label: "Toda la hoja" },
                    { id: "cambios", label: "Solo cambios" },
                  ]}
                />
              ) : undefined
            }
          >
            <div aria-busy={hoja.isLoading || undefined}>
              {hoja.isLoading && <ProduccionSkeleton />}
              {sinHoja && (
                <EmptyState
                  icon={<Factory size={22} aria-hidden />}
                  title={MENSAJE_HOJA_NO_MATERIALIZADA}
                  description="Cierre la ventana desde Hoy. Hasta entonces no hay hoja ni consolidado."
                />
              )}
              {errorHoja && (
                <EmptyState
                  icon={<Factory size={22} aria-hidden />}
                  title="No se pudo cargar la hoja"
                  description={errorHoja.message}
                />
              )}
              {hoja.data && (
                <>
                  {hoja.data.esSabado && (
                    <p className="flex flex-wrap items-center gap-2 border-b border-[var(--border-subtle)] bg-[var(--amber-100)] px-4 py-2 text-sm font-semibold text-[var(--amber-700)] sm:px-5">
                      <Badge tone="amber">Sábado</Badge>
                      Toda la carga sale de planta.
                    </p>
                  )}
                  <HojaGrupos lineas={lineas} soloCambios={soloCambios} />
                </>
              )}
            </div>
          </Card>

          {hoja.data && (
            <Card
              title="Consolidado"
              subtitle="Mensaje del cierre · copiar o descargar si hace falta reenviar"
            >
              <div className="grid gap-3">
                <ConsolidadoPreview
                  cuerpo={hoja.data.texto}
                  version={hoja.data.version}
                />
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    loading={copiando}
                    onClick={() => void copiar()}
                  >
                    <Copy size={15} aria-hidden />
                    Copiar
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    loading={descargando === "pdf"}
                    onClick={() => void descargar("pdf")}
                  >
                    <Download size={15} aria-hidden />
                    PDF
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    loading={descargando === "txt"}
                    onClick={() => void descargar("txt")}
                  >
                    TXT
                  </Button>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </PanelShell>
  );
}

function Metric({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="min-w-[7.5rem] flex-1 rounded-tarjeta border border-[var(--border-subtle)] bg-blanco p-4 shadow-tarjeta">
      <div className="mst-label">{label}</div>
      <div className="mt-1.5 font-display text-3xl leading-none tabular-nums text-marca">
        {children}
      </div>
      {hint && <div className="mt-1 text-xs text-tinta-500">{hint}</div>}
    </div>
  );
}

function ProduccionSkeleton() {
  return (
    <ul aria-hidden>
      {Array.from({ length: 6 }, (_, i) => (
        <li
          key={i}
          className="flex min-h-fila items-center gap-3 border-b border-[var(--border-subtle)] px-4 sm:px-5"
        >
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-3.5 w-2/3 max-w-xs" />
            <Skeleton className="h-3 w-28" />
          </div>
          <Skeleton className="h-6 w-12" />
          <Skeleton className="hidden h-5 w-16 rounded-pill sm:block" />
        </li>
      ))}
    </ul>
  );
}
