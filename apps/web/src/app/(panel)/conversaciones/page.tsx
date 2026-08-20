"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, MessageCircle } from "lucide-react";
import { useState } from "react";
import {
  MENSAJE_VENTANA_WA_CERRADA,
  tienePermiso,
  type ActorPublico,
  type ConexionWabaPublica,
  type ConversacionBandeja,
  type ConversacionDetalle,
  type PlantillaWaPublica,
} from "@misupertostada/shared";
import { api, ApiError } from "@/lib/api";
import { PanelShell } from "@/components/layout/panel-shell";
import { PageToolbar } from "@/components/layout/page-header";
import { ListaConversaciones } from "@/components/messaging/lista-conversaciones";
import { HiloConversacion } from "@/components/messaging/hilo-conversacion";
import { ComposerWhatsapp } from "@/components/messaging/composer-whatsapp";
import { VentanaBadge } from "@/components/domain/ventana-badge";
import { usePedidosSse } from "@/hooks/use-pedidos-sse";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Textarea } from "@/components/ui/field";
import { cn } from "@/lib/utils";

export default function ConversacionesPage() {
  const qc = useQueryClient();
  const [sel, setSel] = useState<string | null>(null);
  const [error, setError] = useState<string>();
  const [simular, setSimular] = useState("");

  const me = useQuery({
    queryKey: ["auth", "me"],
    queryFn: () => api<{ usuario: ActorPublico }>("/auth/me"),
  });
  usePedidosSse(Boolean(me.data));

  const puedeEnviar = tienePermiso(
    me.data?.usuario.permisos ?? [],
    "mensajeria.enviar",
  );

  const conexion = useQuery({
    queryKey: ["mensajeria", "conexion"],
    queryFn: () => api<ConexionWabaPublica>("/mensajeria/conexion"),
    enabled: Boolean(me.data),
  });
  const lista = useQuery({
    queryKey: ["conversaciones"],
    queryFn: () => api<ConversacionBandeja[]>("/conversaciones"),
    enabled: Boolean(me.data),
  });
  const plantillas = useQuery({
    queryKey: ["mensajeria", "plantillas"],
    queryFn: () => api<PlantillaWaPublica[]>("/mensajeria/plantillas"),
    enabled: Boolean(me.data),
  });
  const detalle = useQuery({
    queryKey: ["conversaciones", sel],
    queryFn: () => api<ConversacionDetalle>(`/conversaciones/${sel}`),
    enabled: Boolean(sel),
  });

  const leer = useMutation({
    mutationFn: (id: string) =>
      api<ConversacionDetalle>(`/conversaciones/${id}/leer`, { method: "POST" }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["conversaciones"] });
    },
  });

  const enviar = useMutation({
    mutationFn: (input: { id: string; body: unknown }) =>
      api(`/conversaciones/${input.id}/enviar`, {
        method: "POST",
        body: JSON.stringify(input.body),
      }),
    onSuccess: () => {
      setError(undefined);
      void qc.invalidateQueries({ queryKey: ["conversaciones"] });
    },
    onError: (err) => {
      if (err instanceof ApiError && err.code === "VENTANA_WA_CERRADA") {
        setError(MENSAJE_VENTANA_WA_CERRADA);
        return;
      }
      setError(err instanceof ApiError ? err.message : "No se pudo enviar");
    },
  });

  const inbound = useMutation({
    mutationFn: (input: { id: string; body: string; from: string }) =>
      api(`/conversaciones/${input.id}/simular-inbound`, {
        method: "POST",
        body: JSON.stringify({ from: input.from, body: input.body }),
      }),
    onSuccess: () => {
      setSimular("");
      setError(undefined);
      void qc.invalidateQueries({ queryKey: ["conversaciones"] });
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : "No se pudo simular");
    },
  });

  function elegir(id: string) {
    setSel(id);
    setError(undefined);
    leer.mutate(id);
  }

  const hilo = detalle.data;
  const modoDesarrollo = conexion.data?.modoDesarrollo ?? false;

  return (
    <PanelShell title="Conversaciones">
      <div className="grid gap-4">
        <PageToolbar
          description="Ventana de 24 h de Meta: texto libre solo mientras esté abierta. Fuera de ella, plantillas con preview."
          meta={
            conexion.data?.modoDesarrollo
              ? "Modo desarrollo · Fake WhatsApp"
              : conexion.data?.estado === "CONECTADO"
                ? "WABA conectado"
                : undefined
          }
        />

        {error ? (
          <p className="text-sm text-peligro" role="alert">
            {error}
          </p>
        ) : null}

        <div className="grid items-start gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
          <Card
            flush
            title="Conversaciones"
            subtitle="Un hilo por restaurante"
            className={cn(sel && "hidden lg:block")}
          >
            <ListaConversaciones
              items={lista.data ?? []}
              sel={sel}
              loading={lista.isLoading}
              onSelect={elegir}
            />
          </Card>

          <div className={cn(!sel && "hidden lg:block")}>
            {sel && detalle.isLoading ? (
              <Card>
                <div className="grid gap-3">
                  <div className="h-6 w-48 animate-pulse rounded-campo bg-[var(--ink-100)]" />
                  <div className="h-32 animate-pulse rounded-campo bg-[var(--ink-100)]" />
                </div>
              </Card>
            ) : sel && hilo ? (
              <div className="grid gap-3">
                <button
                  type="button"
                  onClick={() => setSel(null)}
                  className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-marca hover:text-marca-hover lg:hidden"
                >
                  <ChevronLeft size={16} aria-hidden />
                  Conversaciones
                </button>
                <Card
                  flush
                  title={hilo.clienteNombre}
                  subtitle={`${hilo.telefonoWa ?? "sin WhatsApp"}${
                    hilo.horarioEntregaFijo
                      ? ` · entrega ${hilo.horarioEntregaFijo}`
                      : ""
                  }`}
                  actions={
                    <VentanaBadge
                      abierta={hilo.ventanaAbierta}
                      tipo="whatsapp"
                      expiraAt={hilo.ventanaExpiraAt}
                    />
                  }
                >
                  <div className="border-t border-[var(--border-subtle)]">
                    <HiloConversacion conversacion={hilo} />
                  </div>
                  <div className="grid gap-3 border-t border-[var(--border-subtle)] bg-blanco p-4">
                    <ComposerWhatsapp
                      conversacion={hilo}
                      plantillas={plantillas.data ?? []}
                      puedeEnviar={puedeEnviar}
                      enviando={enviar.isPending}
                      onEnviarTexto={(cuerpo) =>
                        enviar.mutate({
                          id: hilo.id,
                          body: {
                            tipo: "texto",
                            cuerpo,
                            cuerpoRenderizado: cuerpo,
                          },
                        })
                      }
                      onEnviarPlantilla={(input) =>
                        enviar.mutate({
                          id: hilo.id,
                          body: {
                            tipo: "plantilla",
                            plantillaId: input.plantillaId,
                            params: input.params,
                            cuerpoRenderizado: input.cuerpoRenderizado,
                          },
                        })
                      }
                    />
                    {modoDesarrollo && puedeEnviar ? (
                      <div className="grid gap-2 border-t border-[var(--border-subtle)] pt-3">
                        <Textarea
                          id="simular-inbound"
                          label="Simular respuesta del cliente"
                          rows={2}
                          value={simular}
                          onChange={(e) => setSimular(e.target.value)}
                          hint="Solo en desarrollo. Abre la ventana de 24 h."
                        />
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={!simular.trim() || !hilo.telefonoWa}
                          loading={inbound.isPending}
                          onClick={() =>
                            inbound.mutate({
                              id: hilo.id,
                              body: simular,
                              from: hilo.telefonoWa ?? "50200000000",
                            })
                          }
                        >
                          Simular respuesta del cliente
                        </Button>
                      </div>
                    ) : null}
                  </div>
                </Card>
              </div>
            ) : (
              <EmptyState
                icon={<MessageCircle size={22} aria-hidden />}
                title="Elija una conversación"
                description="La lista muestra no leídos y el countdown de la ventana de 24 h."
              />
            )}
          </div>
        </div>
      </div>
    </PanelShell>
  );
}
