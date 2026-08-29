"use client";

import {
  Alert,
  Button,
  Card,
  Chip,
  Description,
  Label,
  SearchField,
  Spinner,
  TextArea,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
} from "@heroui/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, MessageCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
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
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type FiltroBandeja = "todas" | "no_leidos" | "abiertas";

const FILTROS = [
  { id: "todas", label: "Todas" },
  { id: "no_leidos", label: "No leídos" },
  { id: "abiertas", label: "Ventana abierta" },
] as const;

/** Umbral de aviso: menos de dos horas de ventana es "hágalo ahora". */
const POR_CERRAR_MS = 2 * 60 * 60 * 1000;

export default function ConversacionesPage() {
  const qc = useQueryClient();
  const [sel, setSel] = useState<string | null>(null);
  const [error, setError] = useState<string>();
  const [simular, setSimular] = useState("");
  const [q, setQ] = useState("");
  const [filtro, setFiltro] = useState<FiltroBandeja>("todas");
  const ahora = useAhora(30_000);

  const me = useQuery({
    queryKey: ["auth", "me"],
    queryFn: () => api<{ usuario: ActorPublico }>("/auth/me"),
  });

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

  const items = useMemo(() => lista.data ?? [], [lista.data]);

  /* La bandeja se resume antes de leerla: cuánto falta por contestar y cuántas
     ventanas de 24 h se están apagando. Es la decisión de la mañana. */
  const resumen = useMemo(() => {
    let noLeidos = 0;
    let abiertas = 0;
    let porCerrar = 0;
    for (const v of items) {
      if (v.noLeidos > 0) noLeidos += 1;
      if (!v.ventanaAbierta) continue;
      abiertas += 1;
      const restante = v.ventanaExpiraAt
        ? new Date(v.ventanaExpiraAt).getTime() - ahora
        : Number.POSITIVE_INFINITY;
      if (restante > 0 && restante <= POR_CERRAR_MS) porCerrar += 1;
    }
    return { total: items.length, noLeidos, abiertas, porCerrar };
  }, [items, ahora]);

  const filtrados = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return items.filter((v) => {
      if (filtro === "no_leidos" && v.noLeidos === 0) return false;
      if (filtro === "abiertas" && !v.ventanaAbierta) return false;
      if (!needle) return true;
      return [v.clienteNombre, v.ultimoCuerpo ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [items, q, filtro]);

  const hilo = detalle.data;
  const modoDesarrollo = conexion.data?.modoDesarrollo ?? false;
  const restanteHilo =
    hilo?.ventanaAbierta && hilo.ventanaExpiraAt
      ? new Date(hilo.ventanaExpiraAt).getTime() - ahora
      : null;
  const hiloPorCerrar =
    restanteHilo !== null && restanteHilo > 0 && restanteHilo <= POR_CERRAR_MS;

  return (
    <PanelShell title="Conversaciones">
      <div className="grid gap-5">
        <PageToolbar
          description="Ventana de 24 h de Meta: texto libre solo mientras esté abierta. Fuera de ella, plantillas con preview."
          meta={
            conexion.data?.modoDesarrollo ? (
              <Chip color="warning" size="sm" variant="soft">
                Modo desarrollo · Fake WhatsApp
              </Chip>
            ) : conexion.data?.estado === "CONECTADO" ? (
              <Chip color="success" size="sm" variant="soft">
                WABA conectado
              </Chip>
            ) : undefined
          }
        />

        <BandejaResumen cargando={lista.isLoading} resumen={resumen} />

        {error ? (
          <Alert status="danger">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>No se envió</Alert.Title>
              <Alert.Description>{error}</Alert.Description>
            </Alert.Content>
          </Alert>
        ) : null}

        <div className="grid items-start gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
          <Card
            className={cn(
              "gap-0 overflow-hidden p-0",
              sel && "hidden lg:flex",
            )}
          >
            <Card.Header className="gap-3 p-4">
              <div>
                <Card.Title className="text-[15px] text-tinta-900">
                  Conversaciones
                </Card.Title>
                <Card.Description>Un hilo por restaurante</Card.Description>
              </div>

              <SearchField
                aria-label="Buscar conversación"
                className="w-full"
                value={q}
                onChange={setQ}
              >
                <SearchField.Group>
                  <SearchField.SearchIcon />
                  <SearchField.Input placeholder="Restaurante o texto" />
                  <SearchField.ClearButton />
                </SearchField.Group>
              </SearchField>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <ToggleButtonGroup
                  aria-label="Filtrar conversaciones"
                  disallowEmptySelection
                  selectedKeys={new Set([filtro])}
                  selectionMode="single"
                  size="sm"
                  onSelectionChange={(keys) => {
                    const next = [...keys][0];
                    if (typeof next === "string") setFiltro(next as FiltroBandeja);
                  }}
                >
                  {FILTROS.map((f, i) => (
                    <ToggleButton key={f.id} id={f.id}>
                      {i > 0 && <ToggleButtonGroup.Separator />}
                      {f.label}
                    </ToggleButton>
                  ))}
                </ToggleButtonGroup>

                {!lista.isLoading && (
                  <p className="mst-label tabular-nums" aria-live="polite">
                    {filtrados.length} de {resumen.total}
                  </p>
                )}
              </div>
            </Card.Header>

            <div className="border-t border-[var(--border-subtle)]">
              <ListaConversaciones
                items={filtrados}
                sel={sel}
                loading={lista.isLoading}
                vacio={
                  items.length > 0 ? (
                    <EmptyState
                      icon={<MessageCircle size={22} aria-hidden />}
                      title="Ninguna conversación coincide"
                      description={
                        q
                          ? "Pruebe con el nombre del restaurante o una palabra del último mensaje."
                          : filtro === "no_leidos"
                            ? "Todo está leído. Cambie a Todas para ver la bandeja completa."
                            : "Ninguna ventana de 24 h está abierta ahora. Fuera de ella se envía con plantilla."
                      }
                    />
                  ) : undefined
                }
                onSelect={elegir}
              />
            </div>
          </Card>

          <div className={cn("grid gap-3", !sel && "hidden lg:grid")}>
            {sel && detalle.isLoading ? (
              <Card className="gap-3 p-4">
                <Skeleton className="h-6 w-48 rounded-campo" />
                <Skeleton className="h-32 w-full rounded-campo" />
                <Skeleton className="h-24 w-full rounded-campo" />
              </Card>
            ) : sel && hilo ? (
              <>
                <Button
                  className="justify-self-start lg:hidden"
                  size="sm"
                  variant="tertiary"
                  onPress={() => setSel(null)}
                >
                  <ChevronLeft size={16} aria-hidden />
                  Conversaciones
                </Button>

                <Card className="gap-0 overflow-hidden p-0">
                  <Card.Header className="flex-row flex-wrap items-start justify-between gap-3 p-4">
                    <div className="min-w-0">
                      <Card.Title className="truncate text-[15px] text-tinta-900">
                        {hilo.clienteNombre}
                      </Card.Title>
                      <Card.Description className="mt-0.5 truncate">
                        {hilo.telefonoWa ?? "sin WhatsApp"}
                        {hilo.horarioEntregaFijo
                          ? ` · entrega ${hilo.horarioEntregaFijo}`
                          : ""}
                      </Card.Description>
                    </div>
                    <VentanaBadge
                      abierta={hilo.ventanaAbierta}
                      tipo="whatsapp"
                      expiraAt={hilo.ventanaExpiraAt}
                    />
                  </Card.Header>

                  {/* Ventana viva pero a punto de apagarse: el badge ya lleva el
                      reloj, esto dice qué hacer con él antes de que cierre. */}
                  {hiloPorCerrar ? (
                    <div className="px-4 pb-4">
                      <Alert status="warning">
                        <Alert.Indicator />
                        <Alert.Content>
                          <Alert.Title>La ventana cierra pronto</Alert.Title>
                          <Alert.Description>
                            Queda menos de 2 h de texto libre. Después solo salen
                            plantillas aprobadas.
                          </Alert.Description>
                        </Alert.Content>
                      </Alert>
                    </div>
                  ) : null}

                  <HiloConversacion conversacion={hilo} />

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
                        <TextField value={simular} onChange={setSimular}>
                          <Label>Simular respuesta del cliente</Label>
                          <TextArea rows={2} />
                          <Description>
                            Solo en desarrollo. Abre la ventana de 24 h.
                          </Description>
                        </TextField>
                        <Button
                          className="justify-self-start"
                          isDisabled={!simular.trim() || !hilo.telefonoWa}
                          isPending={inbound.isPending}
                          size="sm"
                          variant="secondary"
                          onPress={() =>
                            inbound.mutate({
                              id: hilo.id,
                              body: simular,
                              from: hilo.telefonoWa ?? "50200000000",
                            })
                          }
                        >
                          {({ isPending }) => (
                            <>
                              {isPending && <Spinner color="current" size="sm" />}
                              Simular respuesta del cliente
                            </>
                          )}
                        </Button>
                      </div>
                    ) : null}
                  </div>
                </Card>
              </>
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

function BandejaResumen({
  resumen,
  cargando,
}: {
  resumen: {
    total: number;
    noLeidos: number;
    abiertas: number;
    porCerrar: number;
  };
  cargando: boolean;
}) {
  if (cargando) {
    return (
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-[76px] w-full rounded-tarjeta" />
        ))}
      </div>
    );
  }

  const cifras = [
    { label: "Conversaciones", valor: resumen.total, tono: "text-tinta-900" },
    { label: "Con no leídos", valor: resumen.noLeidos, tono: "text-peligro" },
    { label: "Ventana abierta", valor: resumen.abiertas, tono: "text-marca" },
    {
      label: "Cierra en < 2 h",
      valor: resumen.porCerrar,
      tono: "text-aviso-700",
    },
  ];

  return (
    <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {cifras.map((c) => (
        <Card key={c.label} className="gap-1 p-4">
          <dt className="mst-label text-[11px]">{c.label}</dt>
          <dd
            className={cn(
              "text-[22px] font-semibold leading-none tabular-nums",
              c.valor > 0 ? c.tono : "text-tinta-400",
            )}
          >
            {c.valor}
          </dd>
        </Card>
      ))}
    </dl>
  );
}

/**
 * Reloj compartido de la página. Los contadores de ventana dependen de la hora
 * real, no de la última respuesta del servidor: sin este tick, "cierra en < 2 h"
 * se quedaría congelado hasta el siguiente refetch.
 */
function useAhora(intervaloMs: number): number {
  const [ahora, setAhora] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setAhora(Date.now()), intervaloMs);
    return () => window.clearInterval(id);
  }, [intervaloMs]);
  return ahora;
}
