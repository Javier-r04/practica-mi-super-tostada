"use client";

import {
  Button,
  Card,
  Chip,
  Spinner,
  ToggleButton,
  ToggleButtonGroup,
} from "@heroui/react";
import { useQuery } from "@tanstack/react-query";
import { Copy, Download, Factory, Printer } from "lucide-react";
import { useState, type ReactNode } from "react";
import {
  FAMILIA_ETIQUETA,
  MENSAJE_HOJA_NO_MATERIALIZADA,
  UNIDAD_CORTA,
  type ActorPublico,
  type CalendarioAhora,
  type HojaPublica,
} from "@misupertostada/shared";
import { api, ApiError } from "@/lib/api";
import { PanelShell } from "@/components/layout/panel-shell";
import { PageToolbar } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { CintaEje } from "@/components/domain/cinta-eje";
import { copyEjeProduccion, fechaHojaProduccion } from "@/lib/ejes-vista";
import { HojaGrupos } from "@/components/fulfillment/hoja-grupos";
import { ConsolidadoPreview } from "@/components/fulfillment/consolidado-preview";
import { lineasVisibles, totalesPorFamilia } from "@/lib/produccion-vista";
import { avisoReabierto } from "@/lib/reabierto-vista";
import { toastFromError, toastSuccess } from "@/lib/toast";

type VistaHoja = "toda" | "cambios";

const VISTAS = [
  { id: "toda", label: "Toda la hoja" },
  { id: "cambios", label: "Solo cambios" },
] as const;

export default function ProduccionPage() {
  const me = useQuery({
    queryKey: ["auth", "me"],
    queryFn: () => api<{ usuario: ActorPublico }>("/auth/me"),
  });
  const calendario = useQuery({
    queryKey: ["calendario", "ahora"],
    queryFn: () => api<CalendarioAhora>("/calendario/ahora"),
    enabled: Boolean(me.data),
    refetchInterval: 60_000,
  });
  // Producción vive en el eje EN CURSO, no en el foco: Alex produce de
  // madrugada lo que se reparte hoy. Con el foco, a las 15:01 la pantalla
  // saltaba a la ventana recién abierta —que no tiene hoja hasta cerrar— y
  // se vaciaba con «hoja no materializada» a media jornada.
  const fecha =
    fechaHojaProduccion(calendario.data) ||
    calendario.data?.fechaOperacionEnCurso ||
    "";
  const hoja = useQuery({
    queryKey: ["hoja", fecha],
    queryFn: () => api<HojaPublica>(`/hojas/${fecha}`),
    enabled: Boolean(fecha),
    retry: false,
  });

  const aviso = avisoReabierto(calendario.data);
  const corregida = (hoja.data?.version ?? 1) > 1;
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
  const cambios = lineas.filter((l) => l.cambio).length;
  const soloCambios = corregida && vista === "cambios";
  const visibles = lineasVisibles(lineas, soloCambios).length;

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
      <div className="grid gap-5">
        <CintaEje
          copy={calendario.data ? copyEjeProduccion(calendario.data) : undefined}
          loading={!calendario.data}
        />
        <PageToolbar
          className="print:hidden"
          description="Hoja del día: cantidades por familia, listas para producir."
          meta={
            hoja.data
              ? corregida
                ? "Hoja corregida"
                : "Hoja del día"
              : undefined
          }
          actions={
            hoja.data ? (
              <>
                {hoja.data.diaEstado === "REABIERTO" && (
                  <Chip color="warning" size="sm" variant="soft">
                    Reabierto
                  </Chip>
                )}
                {corregida && (
                  <Chip color="warning" size="sm" variant="soft">
                    {cambios === 1
                      ? "1 cambio desde la impresa"
                      : `${cambios} cambios desde la impresa`}
                  </Chip>
                )}
                <Button
                  isPending={imprimiendo}
                  size="sm"
                  variant="secondary"
                  onPress={() => void imprimir()}
                >
                  {({ isPending }) => (
                    <>
                      {isPending ? (
                        <Spinner color="current" size="sm" />
                      ) : (
                        <Printer size={15} aria-hidden />
                      )}
                      Imprimir
                    </>
                  )}
                </Button>
              </>
            ) : undefined
          }
        />

        <span className="sr-only" role="status" aria-live="polite">
          {anuncioCopia}
        </span>

        {hoja.isLoading && (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-[76px] w-full rounded-tarjeta" />
            ))}
          </div>
        )}

        {hoja.data && (
          <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {totales.map((t) => (
              <Cifra
                key={t.familia}
                etiqueta={FAMILIA_ETIQUETA[t.familia]}
                nota={UNIDAD_CORTA[t.unidadDominante]}
                valor={t.cantidad}
              />
            ))}
            <Cifra
              etiqueta="Renglones de la hoja"
              nota={
                corregida
                  ? cambios === 1
                    ? "1 con cambio"
                    : `${cambios} con cambio`
                  : "Sin correcciones"
              }
              tono={corregida ? "aviso" : "neutro"}
              valor={lineas.length}
            />
          </dl>
        )}

        {corregida && hoja.data && (
          <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
            <ToggleButtonGroup
              aria-label="Vista de la hoja"
              disallowEmptySelection
              selectedKeys={new Set([vista])}
              selectionMode="single"
              size="sm"
              onSelectionChange={(keys) => {
                const next = [...keys][0];
                if (typeof next === "string") setVista(next as VistaHoja);
              }}
            >
              {VISTAS.map((v, i) => (
                <ToggleButton key={v.id} id={v.id}>
                  {i > 0 && <ToggleButtonGroup.Separator />}
                  {v.label}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>

            <p className="mst-label tabular-nums" aria-live="polite">
              {visibles} de {lineas.length} renglones
            </p>
          </div>
        )}

        <div
          className={
            hoja.data
              ? "grid gap-4 lg:grid-cols-[1.5fr_1fr] lg:items-start print:grid-cols-1"
              : "grid gap-4"
          }
        >
          <Card className="gap-0 overflow-hidden p-0">
            <Card.Header className="flex flex-col items-start gap-1 p-4 sm:p-5">
              <Card.Title>Hoja de producción</Card.Title>
              <Card.Description>
                {hoja.data?.motivoReapertura
                  ? `Día reabierto · “${hoja.data.motivoReapertura}”`
                  : "Cantidades a producir, agrupadas por familia."}
              </Card.Description>
            </Card.Header>
            <Card.Content
              aria-busy={hoja.isLoading || undefined}
              className="border-t border-[var(--border-subtle)] p-0"
            >
              {hoja.isLoading && <ProduccionSkeleton />}
              {sinHoja && (
                <EmptyState
                  icon={<Factory size={22} aria-hidden />}
                  title={MENSAJE_HOJA_NO_MATERIALIZADA}
                  description={
                    // Un día reabierto no se vuelve a cerrar solo. Sin decirlo
                    // aquí, «cierre la ventana desde Hoy» manda a cerrar la
                    // ventana equivocada: la de esta noche, no la reabierta.
                    aviso?.bloqueaOperacion
                      ? aviso.detalle
                      : "Cierre la ventana desde Hoy. Hasta entonces no hay hoja ni consolidado."
                  }
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
                    <p className="flex flex-wrap items-center gap-2 border-b border-[var(--border-subtle)] bg-[var(--amber-100)] px-4 py-2 text-sm font-semibold text-aviso-700 sm:px-5">
                      <Chip color="warning" size="sm" variant="soft">
                        Sábado
                      </Chip>
                      Toda la carga sale de planta.
                    </p>
                  )}
                  <HojaGrupos
                    lineas={lineas}
                    clientes={hoja.data.snapshot.clientes}
                    soloCambios={soloCambios}
                  />
                </>
              )}
            </Card.Content>
          </Card>

          {hoja.data && (
            <Card className="print:hidden lg:sticky lg:top-[calc(var(--topbar-height)+0.75rem)] lg:flex lg:max-h-[calc(100dvh-var(--topbar-height)-1.5rem)] lg:flex-col lg:overflow-hidden">
              <Card.Header className="flex shrink-0 flex-col items-start gap-1">
                <Card.Title>Consolidado del cierre</Card.Title>
              </Card.Header>
              <Card.Content className="min-h-0 lg:overflow-y-auto">
                <ConsolidadoPreview
                  cuerpo={hoja.data.texto}
                  version={hoja.data.version}
                  fecha={fecha}
                  copiando={copiando}
                  onCopiar={() => void copiar()}
                />
              </Card.Content>
              <Card.Footer className="flex shrink-0 flex-wrap gap-2">
                <Button
                  isPending={copiando}
                  size="sm"
                  variant="primary"
                  onPress={() => void copiar()}
                >
                  {({ isPending }) => (
                    <>
                      {isPending ? (
                        <Spinner color="current" size="sm" />
                      ) : (
                        <Copy size={15} aria-hidden />
                      )}
                      Copiar
                    </>
                  )}
                </Button>
                <Button
                  isPending={descargando === "pdf"}
                  size="sm"
                  variant="secondary"
                  onPress={() => void descargar("pdf")}
                >
                  {({ isPending }) => (
                    <>
                      {isPending ? (
                        <Spinner color="current" size="sm" />
                      ) : (
                        <Download size={15} aria-hidden />
                      )}
                      PDF
                    </>
                  )}
                </Button>
                <Button
                  isPending={descargando === "txt"}
                  size="sm"
                  variant="secondary"
                  onPress={() => void descargar("txt")}
                >
                  {({ isPending }) => (
                    <>
                      {isPending && <Spinner color="current" size="sm" />}
                      TXT
                    </>
                  )}
                </Button>
              </Card.Footer>
            </Card>
          )}
        </div>
      </div>
    </PanelShell>
  );
}

/* Tira de cifras de la hoja: lo primero que Alex mira al llegar a planta.
   Cantidad grande y tabular; la unidad va debajo, no compite con el número. */
function Cifra({
  etiqueta,
  valor,
  nota,
  tono = "neutro",
}: {
  etiqueta: string;
  valor: ReactNode;
  nota?: string;
  tono?: "neutro" | "aviso";
}) {
  return (
    <Card className="gap-1 p-4">
      <dt className="mst-label text-[11px]">{etiqueta}</dt>
      <dd
        className={
          tono === "aviso"
            ? "text-[22px] font-semibold leading-none tabular-nums text-aviso-700"
            : "text-[22px] font-semibold leading-none tabular-nums text-marca"
        }
      >
        {valor}
      </dd>
      {nota && <p className="text-[11px] text-tinta-500">{nota}</p>}
    </Card>
  );
}

function ProduccionSkeleton() {
  return (
    <ul aria-hidden>
      {Array.from({ length: 6 }, (_, i) => (
        <li
          key={i}
          className="flex min-h-fila items-center gap-3 border-b border-[var(--border-subtle)] px-4 last:border-b-0 sm:px-5"
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
