"use client";

import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import type { ImportReporte, ImportTipo } from "@misupertostada/shared";
import { api, API_URL } from "@/lib/api";
import { ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";

export function CsvImportDialog({
  tipo,
  open,
  onClose,
  onDone,
}: {
  tipo: ImportTipo;
  open: boolean;
  onClose: () => void;
  onDone: () => void;
}) {
  const [csv, setCsv] = useState("");
  const [reporte, setReporte] = useState<ImportReporte | null>(null);
  const [error, setError] = useState<string | null>(null);

  const preview = useMutation({
    mutationFn: () =>
      api<ImportReporte>("/catalogo/import/preview", {
        method: "POST",
        body: JSON.stringify({ tipo, csv }),
      }),
    onSuccess: (data) => {
      setReporte(data);
      setError(null);
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "No se pudo validar"),
  });

  const confirmar = useMutation({
    mutationFn: () =>
      api<ImportReporte>("/catalogo/import/confirmar", {
        method: "POST",
        body: JSON.stringify({ tipo, csv }),
      }),
    onSuccess: () => {
      onDone();
      setCsv("");
      setReporte(null);
      onClose();
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "No se pudo importar"),
  });

  async function descargarPlantilla() {
    const res = await fetch(`${API_URL}/catalogo/import/plantillas/${tipo}.csv`, {
      credentials: "include",
    });
    const text = await res.text();
    const blob = new Blob([text], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${tipo}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Importar CSV"
      description="Se importan solo las filas válidas. Las que fallan quedan en el reporte."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cerrar
          </Button>
          {reporte && reporte.validas > 0 && (
            <Button
              variant="accent"
              loading={confirmar.isPending}
              onClick={() => confirmar.mutate()}
            >
              Importar {reporte.validas} válidas
            </Button>
          )}
        </>
      }
    >
      <div className="grid gap-3">
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => void descargarPlantilla()}>
            Descargar plantilla
          </Button>
        </div>
        <input
          type="file"
          accept=".csv,text/csv"
          className="text-sm"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            setCsv(await file.text());
            setReporte(null);
          }}
        />
        {csv && !reporte && (
          <Button
            variant="secondary"
            loading={preview.isPending}
            onClick={() => preview.mutate()}
          >
            Validar archivo
          </Button>
        )}
        {error && <p className="text-sm text-peligro">{error}</p>}
        {reporte && (
          <div className="max-h-48 overflow-auto text-sm">
            <p className="mb-2 text-tinta-500">
              {reporte.validas} válidas · {reporte.invalidas} con error
            </p>
            <ul className="grid gap-1">
              {reporte.filas
                .filter((f) => !f.ok)
                .map((f) => (
                  <li key={f.indice} className="text-peligro">
                    Fila {f.indice}: {f.error}
                  </li>
                ))}
            </ul>
          </div>
        )}
      </div>
    </Dialog>
  );
}
