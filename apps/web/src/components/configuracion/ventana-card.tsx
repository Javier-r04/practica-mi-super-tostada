"use client";

import {
  Alert,
  AlertDialog,
  Button,
  Card,
  Input,
  Label,
  Switch,
  TextField,
} from "@heroui/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  HORARIO_SEMANAL_DEFAULT,
  WEEKDAY_ETIQUETA,
  type CalendarioAhora,
  type VentanaDiaDto,
  type VentanaSemanal,
  type WeekdayIso,
} from "@misupertostada/shared";
import { api } from "@/lib/api";
import { toastFromError, toastSuccess } from "@/lib/toast";
import { Skeleton } from "@/components/ui/skeleton";
import {
  errorVentanaSemanal,
  etiquetaFilaVentana,
} from "@/lib/ventana-semanal-vista";

/** Borrador del formulario, no horario vigente. Un solo literal, en shared. */
function vacia(): VentanaDiaDto[] {
  return HORARIO_SEMANAL_DEFAULT.map((dia) => ({ ...dia }));
}

function mismoDia(a: VentanaDiaDto, b: VentanaDiaDto): boolean {
  return (
    a.activa === b.activa &&
    a.apertura.slice(0, 5) === b.apertura.slice(0, 5) &&
    a.cierre.slice(0, 5) === b.cierre.slice(0, 5) &&
    a.cruzaMedianoche === b.cruzaMedianoche
  );
}

type Cambio = { weekday: number; antes: string; despues: string };

export function VentanaCard() {
  const qc = useQueryClient();
  const [dias, setDias] = useState<VentanaDiaDto[] | null>(null);
  const [confirmar, setConfirmar] = useState(false);

  const remoto = useQuery({
    queryKey: ["configuracion", "ventana"],
    queryFn: () => api<VentanaSemanal>("/configuracion/ventana"),
  });
  const cal = useQuery({
    queryKey: ["calendario", "ahora"],
    queryFn: () => api<CalendarioAhora>("/calendario/ahora"),
  });

  const vigente = remoto.data?.dias ?? null;
  const actual = dias ?? vigente ?? vacia();
  const error = useMemo(() => errorVentanaSemanal(actual), [actual]);

  /* El admin tiene que poder leer, antes de guardar, qué días cambió y cómo
     quedan. Es el ajuste que decide a qué hora el portal deja de recibir. */
  const cambios = useMemo<Cambio[]>(() => {
    if (!vigente) return [];
    return actual.flatMap((dia) => {
      const previo = vigente.find((d) => d.weekday === dia.weekday);
      if (!previo || mismoDia(previo, dia)) return [];
      return [
        {
          weekday: dia.weekday,
          antes: etiquetaFilaVentana(previo),
          despues: etiquetaFilaVentana(dia),
        },
      ];
    });
  }, [actual, vigente]);

  const guardar = useMutation<VentanaSemanal, Error, void>({
    mutationFn: () =>
      api<VentanaSemanal>("/configuracion/ventana", {
        method: "PUT",
        body: JSON.stringify({ dias: actual }),
      }),
    onSuccess: (data) => {
      toastSuccess("Horario guardado");
      setDias(data.dias);
      setConfirmar(false);
      qc.invalidateQueries({ queryKey: ["configuracion", "ventana"] });
      qc.invalidateQueries({ queryKey: ["calendario", "ahora"] });
    },
    onError: (err) => {
      setConfirmar(false);
      toastFromError(err);
    },
  });

  function patch(weekday: number, partial: Partial<VentanaDiaDto>) {
    setDias(
      actual.map((d) => (d.weekday === weekday ? { ...d, ...partial } : d)),
    );
  }

  const abierta = cal.data?.ventanaAbierta === true;
  const cargando = remoto.isLoading;
  const sinCambios = cambios.length === 0;

  return (
    <Card className="w-full">
      <Card.Header className="flex flex-col items-start gap-1">
        <Card.Title>Ventana de pedidos</Card.Title>
        <Card.Description>
          Horario semanal en que el portal recibe pedidos. Los pedidos de
          madrugada pertenecen al día que abrió.
        </Card.Description>
      </Card.Header>

      <Card.Content className="grid gap-4">
        {abierta ? (
          <Alert status="warning">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>El portal está abierto ahora</Alert.Title>
              <Alert.Description>
                Adelantar la hora no reabre un ciclo ya cerrado: eso solo se
                hace con Reabrir día en Hoy.
              </Alert.Description>
            </Alert.Content>
          </Alert>
        ) : (
          <p className="text-xs leading-relaxed text-tinta-500">
            El horario nuevo aplica en la próxima apertura. No abre el portal si
            el inicio de hoy ya pasó; para pedidos fuera de hora use Reabrir
            día.
          </p>
        )}

        {error ? (
          <Alert status="danger">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>Ese horario no se puede guardar</Alert.Title>
              <Alert.Description>{error}</Alert.Description>
            </Alert.Content>
          </Alert>
        ) : null}

        {cargando ? (
          <div className="grid gap-3">
            {Array.from({ length: 7 }, (_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-campo" />
            ))}
          </div>
        ) : (
          <ul className="grid gap-3">
            {actual.map((dia) => {
              const cambiado = cambios.some((c) => c.weekday === dia.weekday);
              return (
                <li
                  key={dia.weekday}
                  className={
                    cambiado
                      ? "grid gap-3 rounded-campo border border-[var(--border-accent)] bg-[var(--ink-50)] p-3 sm:grid-cols-[9rem_1fr] sm:items-start"
                      : "grid gap-3 rounded-campo border border-[var(--border-subtle)] p-3 sm:grid-cols-[9rem_1fr] sm:items-start"
                  }
                >
                  <div className="flex items-center justify-between gap-2 sm:block">
                    <p className="text-sm font-semibold text-tinta-900">
                      {WEEKDAY_ETIQUETA[dia.weekday as WeekdayIso]}
                    </p>
                    {cambiado ? (
                      <span className="mst-label text-[11px] text-marca">
                        Sin guardar
                      </span>
                    ) : null}
                  </div>

                  <div className="grid gap-3">
                    <Switch
                      isSelected={dia.activa}
                      onChange={(activa) => patch(dia.weekday, { activa })}
                    >
                      <Switch.Content>
                        <Switch.Control>
                          <Switch.Thumb />
                        </Switch.Control>
                        {dia.activa ? "Recibe pedidos" : "Cerrado todo el día"}
                      </Switch.Content>
                    </Switch>

                    {dia.activa ? (
                      <div className="grid gap-3 sm:grid-cols-[9rem_9rem_1fr] sm:items-start">
                        <TextField
                          type="time"
                          value={dia.apertura.slice(0, 5)}
                          onChange={(val) =>
                            val ? patch(dia.weekday, { apertura: val }) : undefined
                          }
                        >
                          <Label>Abre</Label>
                          <Input className="tabular-nums" />
                        </TextField>
                        <TextField
                          type="time"
                          value={dia.cierre.slice(0, 5)}
                          onChange={(val) =>
                            val ? patch(dia.weekday, { cierre: val }) : undefined
                          }
                        >
                          <Label>Cierra</Label>
                          <Input className="tabular-nums" />
                        </TextField>
                        <div className="flex min-h-11 items-end">
                          <Switch
                            isSelected={dia.cruzaMedianoche}
                            onChange={(cruzaMedianoche) =>
                              patch(dia.weekday, { cruzaMedianoche })
                            }
                          >
                            <Switch.Content>
                              <Switch.Control>
                                <Switch.Thumb />
                              </Switch.Control>
                              Cierra al día siguiente
                            </Switch.Content>
                          </Switch>
                        </div>
                      </div>
                    ) : null}

                    <p className="text-xs tabular-nums text-tinta-500">
                      {etiquetaFilaVentana(dia)}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card.Content>

      <Card.Footer className="flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="mst-label tabular-nums" aria-live="polite">
          {cargando
            ? "Cargando horario…"
            : sinCambios
              ? "Sin cambios pendientes"
              : `${cambios.length} día(s) por guardar`}
        </p>
        <Button
          className="shrink-0"
          isDisabled={Boolean(error) || sinCambios || guardar.isPending || cargando}
          variant="primary"
          onPress={() => setConfirmar(true)}
        >
          Revisar y guardar
        </Button>
      </Card.Footer>

      <AlertDialog.Backdrop isOpen={confirmar} onOpenChange={setConfirmar}>
          <AlertDialog.Container>
            <AlertDialog.Dialog>
              <AlertDialog.CloseTrigger />
              <AlertDialog.Header>
                <AlertDialog.Icon status="warning" />
                <AlertDialog.Heading>
                  ¿Guardar el horario nuevo?
                </AlertDialog.Heading>
              </AlertDialog.Header>
              <AlertDialog.Body>
                <div className="grid gap-3">
                  <ul className="grid gap-2">
                    {cambios.map((c) => (
                      <li
                        key={c.weekday}
                        className="rounded-campo bg-[var(--ink-50)] p-3"
                      >
                        <p className="text-sm font-semibold text-tinta-900">
                          {WEEKDAY_ETIQUETA[c.weekday as WeekdayIso]}
                        </p>
                        <p className="mt-1 text-xs tabular-nums text-tinta-500">
                          Antes: {c.antes}
                        </p>
                        <p className="text-xs tabular-nums text-tinta-900">
                          Queda: {c.despues}
                        </p>
                      </li>
                    ))}
                  </ul>
                  <p className="text-xs leading-relaxed text-tinta-500">
                    {abierta
                      ? "El ciclo abierto ahora no cambia: el horario nuevo empieza a contar en la próxima apertura."
                      : "Aplica desde la próxima apertura. El ciclo de hoy no se reabre con esto."}
                  </p>
                </div>
              </AlertDialog.Body>
              <AlertDialog.Footer>
                <Button
                  variant="tertiary"
                  onPress={() => setConfirmar(false)}
                >
                  Revisar otra vez
                </Button>
                <Button
                  isDisabled={guardar.isPending}
                  variant="primary"
                  onPress={() => guardar.mutate()}
                >
                  {guardar.isPending ? "Un momento…" : "Guardar horario"}
                </Button>
              </AlertDialog.Footer>
            </AlertDialog.Dialog>
          </AlertDialog.Container>
      </AlertDialog.Backdrop>
    </Card>
  );
}
