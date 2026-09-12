"use client";

import {
  Button,
  Card,
  Disclosure,
  Spinner,
} from "@heroui/react";
import { MessageCircle } from "lucide-react";
import type { ClienteSobreLimite } from "@misupertostada/shared";
import { ClienteAvatar } from "@/components/catalog/cliente-avatar";

export function AlertaLimiteCredito({
  clientes,
  puedeRecordar,
  recordarLoadingId,
  alertaAbierta,
  onAlertaChange,
  onRecordar,
}: {
  clientes: ClienteSobreLimite[];
  puedeRecordar: boolean;
  recordarLoadingId?: string;
  alertaAbierta: boolean;
  onAlertaChange: (abierta: boolean) => void;
  onRecordar: (clienteId: string) => void;
}) {
  if (clientes.length === 0) return null;

  return (
    <Card className="gap-0 overflow-hidden p-0">
      <Disclosure
        isExpanded={alertaAbierta}
        onExpandedChange={onAlertaChange}
      >
        <Disclosure.Heading className="transition-colors hover:bg-tinta-50">
          <Button
            className="min-h-16 w-full justify-start rounded-none px-4 py-5 text-left hover:bg-transparent"
            slot="trigger"
            variant="ghost"
          >
            <span className="min-w-0 flex-1">
              <span className="block text-base font-semibold text-tinta-900">
                Al límite de crédito
              </span>
              <span className="mt-1 block text-sm font-normal text-tinta-600">
                {clientes.length} restaurante
                {clientes.length === 1 ? "" : "s"} han alcanzado o superado su límite de facturas pendientes
              </span>
            </span>
            <Disclosure.Indicator />
          </Button>
        </Disclosure.Heading>
        <Disclosure.Content>
          <Disclosure.Body className="p-0">
            <ul className="grid max-h-56 gap-2 overflow-y-auto border-t border-[var(--border-subtle)] px-4 py-3">
              {clientes.map((c) => (
                <li
                  key={c.clienteId}
                  className="flex min-h-12 flex-wrap items-center gap-3 rounded-[calc(var(--radius-card)-0.5rem)] border border-peligro/35 bg-tinta-50 px-3 py-2.5"
                >
                  <ClienteAvatar
                    fotoAssetId={c.fotoAssetId}
                    nombre={c.nombre}
                    size="sm"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-tinta-900">
                      {c.nombre}
                    </p>
                    <p className="mst-label mt-0.5 tabular-nums text-peligro">
                      {c.pendientes}/{c.limite} facturas pendientes
                    </p>
                  </div>
                  <Button
                    aria-label={
                      puedeRecordar
                        ? `Recordar a ${c.nombre}: envía el estado de cuenta por WhatsApp`
                        : "No tiene permiso para enviar WhatsApp"
                    }
                    className="min-h-11 shrink-0"
                    isDisabled={!puedeRecordar}
                    isPending={recordarLoadingId === c.clienteId}
                    size="sm"
                    variant="secondary"
                    onPress={() => onRecordar(c.clienteId)}
                  >
                    {({ isPending }) => (
                      <>
                        {isPending ? (
                          <Spinner color="current" size="sm" />
                        ) : (
                          <MessageCircle size={15} aria-hidden />
                        )}
                        Recordar
                      </>
                    )}
                  </Button>
                </li>
              ))}
            </ul>
          </Disclosure.Body>
        </Disclosure.Content>
      </Disclosure>
    </Card>
  );
}
