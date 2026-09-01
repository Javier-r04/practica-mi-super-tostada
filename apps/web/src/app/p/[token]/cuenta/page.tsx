"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Alert,
  Button,
  Card,
  Label,
  TextArea,
} from "@heroui/react";
import { Receipt } from "lucide-react";
import { ComprobantePicker } from "@/components/receivables/comprobante-picker";
import {
  MENSAJE_ABONO_PENDIENTE,
  MENSAJE_DESCRIPCION_REQUERIDA,
  quetzalesTextoACentavos,
  type PortalCuenta,
} from "@misupertostada/shared";
import { api, ApiError } from "@/lib/api";
import { toastError, toastPromise } from "@/lib/toast";
import { avisoLimiteCredito } from "@/lib/portal-vista";
import { usePortalSession } from "@/components/portal/portal-session";
import { PortalShell } from "@/components/portal/portal-shell";
import { ContadorFacturas } from "@/components/domain/contador-facturas";
import { EstadoBadge } from "@/components/domain/estado-badge";
import { Money } from "@/components/domain/money";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { NumeroDtePortal } from "@/components/portal/numero-dte";
import { subirComprobanteAbonoPortal } from "@/lib/upload-asset";
import { useState } from "react";

export default function PortalCuentaPage() {
  const { token, sesion } = usePortalSession();
  const qc = useQueryClient();
  const [monto, setMonto] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [archivo, setArchivo] = useState<File | null>(null);
  const [abonoId, setAbonoId] = useState<string | null>(null);

  const cuenta = useQuery({
    queryKey: ["portal", token, "cuenta"],
    queryFn: () =>
      api<PortalCuenta>(`/p/${encodeURIComponent(token)}/cuenta`),
    initialData: sesion.cuenta,
  });

  const reportar = useMutation({
    mutationFn: async () => {
      if (!archivo || !abonoId) {
        throw new Error("Adjunte la foto de la transferencia");
      }
      const montoCentavos = quetzalesTextoACentavos(monto);
      const comprobanteAssetId = await subirComprobanteAbonoPortal(
        token,
        archivo,
        abonoId,
      );
      return api(`/p/${encodeURIComponent(token)}/abonos`, {
        method: "POST",
        body: JSON.stringify({
          id: abonoId,
          idempotencyKey: `portal-abono-${abonoId}`,
          montoCentavos,
          descripcion: descripcion.trim(),
          comprobanteAssetId,
        }),
      });
    },
    onSuccess: () => {
      setMonto("");
      setDescripcion("");
      setArchivo(null);
      setAbonoId(null);
      void qc.invalidateQueries({ queryKey: ["portal", token, "cuenta"] });
    },
  });

  function enviarComprobante() {
    if (!archivo || !abonoId) {
      toastError("Adjunte la foto de la transferencia");
      return;
    }
    if (!descripcion.trim()) {
      toastError(MENSAJE_DESCRIPCION_REQUERIDA);
      return;
    }
    try {
      quetzalesTextoACentavos(monto);
    } catch (err) {
      toastError(err instanceof Error ? err.message : "Monto inválido");
      return;
    }

    void toastPromise(reportar.mutateAsync(), {
      loading: "Enviando comprobante",
      loadingDescription: "Subiendo la imagen y registrando su transferencia…",
      success: "Comprobante recibido",
      successDescription: MENSAJE_ABONO_PENDIENTE,
      error: "No se pudo enviar el comprobante",
    });
  }

  const data = cuenta.data ?? sesion.cuenta;
  const aviso = avisoLimiteCredito(data);

  return (
    <PortalShell clienteNombre={sesion.cliente.nombre}>
      <div className="grid gap-4 py-4">
        <div>
          <h1 className="text-xl font-semibold text-tinta-900">Su cuenta</h1>
          <p className="mt-1 text-sm text-tinta-500">
            Saldo pendiente, abonos y reporte de transferencias.
          </p>
        </div>

        {cuenta.isPending && !cuenta.data ? (
          <Skeleton className="h-20 w-full rounded-tarjeta" />
        ) : cuenta.error instanceof ApiError ? (
          <Alert status="danger">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>No se pudo cargar la cuenta</Alert.Title>
              <Alert.Description>{cuenta.error.message}</Alert.Description>
            </Alert.Content>
          </Alert>
        ) : (
          <>
            <ContadorFacturas
              pendientes={data.facturasPendientes}
              montoCentavos={data.saldoCentavos}
              destacado={aviso != null}
            />

            {data.transferenciasEnRevisionCentavos > 0 ? (
              <Alert status="warning">
                <Alert.Indicator />
                <Alert.Content>
                  <Alert.Title>Transferencias en revisión</Alert.Title>
                  <Alert.Description>
                    Tiene{" "}
                    <Money
                      centavos={data.transferenciasEnRevisionCentavos}
                      tone="pendiente"
                    />{" "}
                    en comprobantes que aún no confirma la fábrica. Su saldo no
                    baja hasta entonces.
                  </Alert.Description>
                </Alert.Content>
              </Alert>
            ) : null}

            <section className="grid gap-2">
              <h2 className="px-1 mst-label">Facturas abiertas</h2>
              <Card className="gap-0 overflow-hidden p-0">
                {data.facturas.length === 0 ? (
                  <EmptyState
                    icon={<Receipt size={22} aria-hidden />}
                    title="No tiene facturas pendientes."
                    description="Cuando haya saldo, lo verá aquí."
                  />
                ) : (
                  <ul>
                    {data.facturas.map((f) => (
                      <li
                        key={f.id}
                        className="flex min-h-fila flex-wrap items-center gap-2 border-b border-[var(--border-subtle)] px-4 py-3 last:border-b-0"
                      >
                        <div className="min-w-0 flex-1">
                          <NumeroDtePortal numeroDte={f.numeroDte} />
                          <p className="text-xs tabular-nums text-tinta-500">
                            {f.antiguedadDias}{" "}
                            {f.antiguedadDias === 1 ? "día" : "días"}
                          </p>
                        </div>
                        <EstadoBadge estado={f.estado} size="sm" />
                        <div className="w-full text-right sm:w-auto">
                          <Money
                            centavos={f.saldoCentavos}
                            tone={
                              f.estado === "VENCIDO"
                                ? "vencido"
                                : f.estado === "ABONO_PARCIAL"
                                  ? "pendiente"
                                  : "default"
                            }
                          />
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </section>

            <section className="grid gap-2">
              <h2 className="px-1 mst-label">Sus abonos</h2>
              <Card className="gap-0 overflow-hidden p-0">
                {data.abonos.length === 0 ? (
                  <EmptyState
                    title="Aún no hay abonos registrados"
                    description="Los pagos en efectivo con el repartidor y las transferencias confirmadas aparecen aquí."
                  />
                ) : (
                  <ul>
                    {data.abonos.map((a) => (
                      <li
                        key={a.id}
                        className="grid gap-2 border-b border-[var(--border-subtle)] px-4 py-3 last:border-b-0"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="text-sm font-medium text-tinta-900">
                              {a.metodo === "TRANSFERENCIA"
                                ? "Transferencia"
                                : "Efectivo"}{" "}
                              · {a.fecha}
                            </p>
                            {a.descripcion ? (
                              <p className="text-xs text-tinta-500">
                                {a.descripcion}
                              </p>
                            ) : null}
                          </div>
                          <div className="flex items-center gap-2">
                            <EstadoBadge dominio="abono" estado={a.estado} size="sm" />
                            <Money centavos={a.montoCentavos} />
                          </div>
                        </div>
                        {a.estado === "PENDIENTE" ? (
                          <p className="text-xs text-tinta-500">
                            {MENSAJE_ABONO_PENDIENTE}
                          </p>
                        ) : null}
                        {a.estado === "RECHAZADO" && a.motivoRechazo ? (
                          <p className="text-xs text-[var(--estado-vencido-fg)]">
                            {a.motivoRechazo}
                          </p>
                        ) : null}
                        {a.aplicaciones.length > 0 ? (
                          <ul className="grid gap-1 rounded-campo bg-tinta-50 px-3 py-2 text-xs text-tinta-600">
                            {a.aplicaciones.map((ap) => (
                              <li
                                key={`${a.id}-${ap.facturaId}`}
                                className="flex justify-between gap-2"
                              >
                                <span className="font-mono">
                                  {ap.numeroDte ?? "Sin DTE"}
                                </span>
                                <Money centavos={ap.montoCentavos} tone="muted" />
                              </li>
                            ))}
                          </ul>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </section>

            <section className="grid gap-3 rounded-tarjeta border border-[var(--border-subtle)] bg-blanco p-4">
              <div>
                <h2 className="text-base font-semibold text-tinta-900">
                  Reportar transferencia
                </h2>
                <p className="mt-1 text-sm text-tinta-500">
                  Suba el comprobante y una nota. Queda en revisión hasta que la
                  fábrica confirme el depósito.
                </p>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="monto-transferencia">Monto transferido</Label>
                <input
                  className="w-full rounded-campo border border-[var(--border-default)] px-3 py-2.5 text-sm tabular-nums"
                  id="monto-transferencia"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={monto}
                  onChange={(e) => setMonto(e.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="desc-transferencia">Descripción</Label>
                <TextArea
                  id="desc-transferencia"
                  placeholder="Banco, referencia, fecha del depósito…"
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                />
              </div>
              <ComprobantePicker
                label="Comprobante de transferencia"
                hint="JPEG, PNG o WebP. Obligatorio."
                selectorOrigen
                value={archivo}
                onChange={(file) => {
                  setArchivo(file);
                  setAbonoId(file ? crypto.randomUUID() : null);
                }}
              />
              <Button
                className="min-h-11"
                isPending={reportar.isPending}
                variant="primary"
                onPress={enviarComprobante}
              >
                Enviar comprobante
              </Button>
            </section>
          </>
        )}
      </div>
    </PortalShell>
  );
}
