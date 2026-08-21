"use client";

import { useQuery } from "@tanstack/react-query";
import { Copy, Download, Printer } from "lucide-react";
import { useState } from "react";
import {
  MENSAJE_HOJA_NO_MATERIALIZADA,
  type ActorPublico,
  type HojaPublica,
  type OperacionResumen,
} from "@misupertostada/shared";
import { api, ApiError } from "@/lib/api";
import { PanelShell } from "@/components/layout/panel-shell";
import { usePedidosSse } from "@/hooks/use-pedidos-sse";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { RowSkeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { HojaGrupos } from "@/components/fulfillment/hoja-grupos";
import { ConsolidadoPreview } from "@/components/fulfillment/consolidado-preview";

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
  usePedidosSse(Boolean(me.data));

  const v2 = (hoja.data?.version ?? 1) > 1;
  const [soloCambios, setSoloCambios] = useState(true);
  const sinHoja =
    hoja.error instanceof ApiError && hoja.error.code === "HOJA_NO_MATERIALIZADA";

  async function copiar() {
    if (!fecha) return;
    const texto = await api<string>(`/hojas/${fecha}.txt`);
    await navigator.clipboard.writeText(texto);
  }

  async function descargar(ext: "pdf" | "txt") {
    if (!fecha) return;
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
  }

  function imprimir() {
    void (async () => {
      if (!fecha) return;
      const blob = await api<Blob>(`/hojas/${fecha}.pdf`);
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener");
    })();
  }

  return (
    <PanelShell title="Producción">
      <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr] lg:items-start">
        <Card
          flush
          title={
            hoja.data
              ? `Hoja de producción · versión ${hoja.data.version}`
              : "Hoja de producción"
          }
          subtitle={
            hoja.data?.motivoReapertura
              ? `Día reabierto · “${hoja.data.motivoReapertura}”`
              : fecha
                ? `Fecha de operación: ${fecha}`
                : undefined
          }
          actions={
            hoja.data ? (
              <div className="flex flex-wrap items-center gap-2">
                {hoja.data.diaEstado === "REABIERTO" && (
                  <Badge tone="amber">Reabierto</Badge>
                )}
                {v2 && (
                  <Checkbox
                    id="solo-cambios"
                    label="Solo cambios"
                    size="sm"
                    checked={soloCambios}
                    onChange={(e) => setSoloCambios(e.target.checked)}
                    className="[&_label]:min-h-0 [&_label]:items-center"
                  />
                )}
                <Button size="sm" variant="secondary" onClick={imprimir}>
                  <Printer size={15} aria-hidden />
                  Imprimir
                </Button>
              </div>
            ) : undefined
          }
        >
          {hoja.isLoading && <RowSkeleton rows={6} />}
          {sinHoja && (
            <EmptyState
              title={MENSAJE_HOJA_NO_MATERIALIZADA}
              description="Cierre la ventana desde Hoy. Alex no debe ver un consolidado a medias."
            />
          )}
          {hoja.data && (
            <>
              {hoja.data.esSabado && (
                <p className="border-b border-[var(--border-subtle)] bg-[var(--yellow-100)] px-4 py-2 text-sm font-semibold text-marca-prof">
                  Sábado: toda la carga sale de planta.
                </p>
              )}
              <HojaGrupos
                grupos={hoja.data.grupos}
                soloCambios={v2 && soloCambios}
              />
            </>
          )}
        </Card>

        <div className="grid gap-4">
          <Card
            title="Consolidado que recibe Alex"
            subtitle="Descargar para enviar por WhatsApp"
          >
            {hoja.data ? (
              <div className="grid gap-3">
                <ConsolidadoPreview
                  cuerpo={hoja.data.texto}
                  version={hoja.data.version}
                />
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="secondary" onClick={() => void copiar()}>
                    <Copy size={15} aria-hidden />
                    Copiar consolidado
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => void descargar("pdf")}>
                    <Download size={15} aria-hidden />
                    Descargar PDF
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => void descargar("txt")}>
                    Descargar texto
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-tinta-500">
                El texto y el PDF aparecen cuando se cierra la ventana.
              </p>
            )}
          </Card>
          <Card title="Reglas aplicadas hoy" tone="paper">
            <ul className="grid list-disc gap-1.5 pl-4 text-sm text-tinta-800">
              <li>
                Sábado: toda la carga sale de planta, sin importar el punto de carga
                del producto.
              </li>
              <li>La hoja no se materializa hasta el cierre de la ventana.</li>
              <li>Al reabrir no se reenvían mensajes ya enviados.</li>
            </ul>
          </Card>
        </div>
      </div>
    </PanelShell>
  );
}
