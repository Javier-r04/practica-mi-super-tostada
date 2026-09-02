"use client";

import { Button, Chip, Modal, Spinner } from "@heroui/react";
import { Copy } from "lucide-react";
import { useState } from "react";
import { recortarConsolidado } from "@/lib/produccion-vista";

export function ConsolidadoPreview({
  cuerpo,
  version,
  fecha,
  copiando,
  onCopiar,
}: {
  cuerpo: string;
  version: number;
  fecha: string;
  copiando: boolean;
  onCopiar: () => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const corregida = version > 1;
  const { preview, totalLineas, recortado } = recortarConsolidado(cuerpo);
  const cuenta =
    totalLineas === 1 ? "1 línea" : `${totalLineas} líneas`;

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="mst-label tabular-nums">v{version}</span>
        {corregida ? (
          <Chip color="warning" size="sm" variant="soft">
            Solo los cambios
          </Chip>
        ) : null}
      </div>

      <div
        role="region"
        aria-label={
          recortado
            ? "Vista previa del consolidado, texto recortado"
            : corregida
              ? "Texto del consolidado corregido, solo los cambios"
              : "Texto del consolidado"
        }
        className="relative overflow-hidden rounded-campo border border-[var(--border-subtle)] bg-[var(--ink-50)] px-3 py-2.5"
      >
        <p className="whitespace-pre-wrap break-words text-sm leading-relaxed tabular-nums text-tinta-800">
          {preview}
        </p>
        {recortado ? (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-[var(--ink-50)] to-transparent"
          />
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs tabular-nums text-tinta-500">{cuenta}</p>
        {recortado ? (
          <Button size="sm" variant="tertiary" onPress={() => setAbierto(true)}>
            Ver completo
          </Button>
        ) : null}
      </div>

      <Modal.Backdrop
        isOpen={abierto}
        onOpenChange={setAbierto}
      >
        <Modal.Container size="lg">
          <Modal.Dialog>
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading>Consolidado · {fecha}</Modal.Heading>
              <p className="text-sm leading-relaxed text-pretty text-tinta-500">
                Mensaje del cierre. Copiar si hace falta reenviar.
              </p>
            </Modal.Header>
            <Modal.Body>
              <div className="max-h-[70vh] overflow-y-auto rounded-campo border border-[var(--border-subtle)] bg-[var(--ink-50)] px-3 py-2.5">
                <p className="whitespace-pre-wrap break-words text-sm leading-relaxed tabular-nums text-tinta-800">
                  {cuerpo}
                </p>
              </div>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="tertiary" onPress={() => setAbierto(false)}>
                Cerrar
              </Button>
              <Button
                isPending={copiando}
                variant="primary"
                onPress={() => onCopiar()}
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
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </div>
  );
}
