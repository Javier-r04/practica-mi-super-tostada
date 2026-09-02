"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Modal, TextField, Label, TextArea } from "@heroui/react";
import { Check, X } from "lucide-react";
import type { AbonoLista, AbonoPublico } from "@misupertostada/shared";
import { api, ApiError } from "@/lib/api";
import { toastFromError, toastSuccess } from "@/lib/toast";
import { Money } from "@/components/domain/money";
import { ClienteAvatar } from "@/components/catalog/cliente-avatar";
import { ComprobanteAssetPreview } from "@/components/receivables/comprobante-asset-preview";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";

export function BandejaTransferencias({
  puedeConfirmar,
}: {
  puedeConfirmar: boolean;
}) {
  const qc = useQueryClient();
  const [rechazando, setRechazando] = useState<AbonoPublico | null>(null);
  const [motivo, setMotivo] = useState("");

  const lista = useQuery({
    queryKey: ["abonos", "PENDIENTE"],
    queryFn: () =>
      api<AbonoLista>("/abonos?estado=PENDIENTE&limit=50"),
  });

  const confirmar = useMutation({
    mutationFn: (id: string) =>
      api(`/abonos/${id}/confirmar`, { method: "POST" }),
    onSuccess: () => {
      toastSuccess("Transferencia confirmada");
      void qc.invalidateQueries({ queryKey: ["abonos"] });
      void qc.invalidateQueries({ queryKey: ["cartera"] });
    },
    onError: (err) => toastFromError(err, "No se pudo confirmar"),
  });

  const rechazar = useMutation({
    mutationFn: ({ id, motivo }: { id: string; motivo: string }) =>
      api(`/abonos/${id}/rechazar`, {
        method: "POST",
        body: JSON.stringify({ motivo }),
      }),
    onSuccess: () => {
      setRechazando(null);
      setMotivo("");
      toastSuccess("Transferencia rechazada");
      void qc.invalidateQueries({ queryKey: ["abonos"] });
      void qc.invalidateQueries({ queryKey: ["cartera"] });
    },
    onError: (err) => toastFromError(err, "No se pudo rechazar"),
  });

  if (lista.isPending) {
    return <Skeleton className="h-40 w-full rounded-tarjeta" />;
  }
  if (lista.error instanceof ApiError) {
    return <p className="text-sm text-tinta-500">{lista.error.message}</p>;
  }

  const items = lista.data?.items ?? [];
  if (items.length === 0) {
    return (
      <EmptyState
        title="Sin transferencias pendientes"
        description="Cuando un cliente suba un comprobante, aparecerá aquí."
      />
    );
  }

  return (
    <>
      <ul className="grid gap-2 p-3">
        {items.map((a) => (
          <li
            key={a.id}
            className="grid gap-3 rounded-[calc(var(--radius-card)-0.25rem)] border border-[var(--border-subtle)] bg-blanco p-3"
          >
            <div className="flex min-w-0 items-start gap-3">
              <ClienteAvatar nombre={a.clienteNombre ?? "?"} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-tinta-900">
                  {a.clienteNombre ?? "Cliente"}
                </p>
                <p className="mt-0.5 text-xs tabular-nums text-tinta-500">
                  {a.fecha}
                </p>
                {a.descripcion ? (
                  <p className="mt-1 text-pretty text-sm text-tinta-700 line-clamp-2">
                    {a.descripcion}
                  </p>
                ) : null}
              </div>
              <Money
                centavos={a.montoCentavos}
                tone="pendiente"
                truncate
                className="shrink-0 text-sm sm:text-base"
              />
            </div>
            {a.comprobanteAssetId ? (
              <ComprobanteAssetPreview
                assetId={a.comprobanteAssetId}
                alt={`Comprobante de ${a.clienteNombre ?? "cliente"}`}
              />
            ) : null}
            {puedeConfirmar ? (
              <div className="flex flex-wrap gap-2">
                <Button
                  className="min-h-11 flex-1"
                  isPending={confirmar.isPending}
                  size="sm"
                  variant="primary"
                  onPress={() => confirmar.mutate(a.id)}
                >
                  <Check size={14} aria-hidden />
                  Confirmar recibida
                </Button>
                <Button
                  className="min-h-11"
                  size="sm"
                  variant="outline"
                  onPress={() => setRechazando(a)}
                >
                  <X size={14} aria-hidden />
                  Rechazar
                </Button>
              </div>
            ) : null}
          </li>
        ))}
      </ul>

      {rechazando ? (
        <Modal.Backdrop
          isOpen
          onOpenChange={(abierto) => {
            if (!abierto) setRechazando(null);
          }}
        >
          <Modal.Container size="sm">
            <Modal.Dialog>
              <Modal.Header>
                <Modal.Heading>Rechazar transferencia</Modal.Heading>
                <p className="text-sm text-tinta-500">
                  {rechazando.clienteNombre} ·{" "}
                  <Money centavos={rechazando.montoCentavos} />
                </p>
              </Modal.Header>
              <Modal.Body>
                <TextField value={motivo} onChange={setMotivo}>
                  <Label>Motivo</Label>
                  <TextArea placeholder="No llegó el depósito, monto incorrecto…" />
                </TextField>
              </Modal.Body>
              <Modal.Footer>
                <Button variant="tertiary" onPress={() => setRechazando(null)}>
                  Cancelar
                </Button>
                <Button
                  isDisabled={motivo.trim().length === 0}
                  isPending={rechazar.isPending}
                  variant="primary"
                  onPress={() =>
                    rechazar.mutate({ id: rechazando.id, motivo: motivo.trim() })
                  }
                >
                  Rechazar
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      ) : null}
    </>
  );
}
