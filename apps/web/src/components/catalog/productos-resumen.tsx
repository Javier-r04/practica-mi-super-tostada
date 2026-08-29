"use client";

import { Card } from "@heroui/react";
import type { ReactNode } from "react";
import type { ProductoPublico } from "@misupertostada/shared";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export type ResumenProductos = {
  activos: number;
  inactivos: number;
  democracia: number;
  planta: number;
  sinFoto: number;
};

export function resumenProductos(lista: ProductoPublico[]): ResumenProductos {
  const activos = lista.filter((p) => p.activo);
  return {
    activos: activos.length,
    inactivos: lista.length - activos.length,
    democracia: activos.filter((p) => p.puntoCarga === "DEMOCRACIA").length,
    planta: activos.filter((p) => p.puntoCarga === "PLANTA").length,
    sinFoto: activos.filter((p) => !p.fotoAssetId).length,
  };
}

/* El mismo vistazo que en Clientes, pero con lo que decide el día en catálogo:
   qué se carga en cada punto y qué producto todavía no tiene foto —sin foto no
   se reconoce ni en el portal ni en captura. */
export function ProductosResumen({
  resumen,
  cargando,
}: {
  resumen: ResumenProductos | null;
  cargando: boolean;
}) {
  if (cargando || !resumen) {
    return (
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-[76px] w-full rounded-tarjeta" />
        ))}
      </div>
    );
  }

  return (
    <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Cifra
        etiqueta="Productos activos"
        valor={resumen.activos}
        nota={
          resumen.inactivos > 0
            ? `${resumen.inactivos} inactivo${resumen.inactivos === 1 ? "" : "s"}`
            : undefined
        }
      />
      <Cifra etiqueta="Carga en Democracia" valor={resumen.democracia} />
      <Cifra etiqueta="Carga en Planta" valor={resumen.planta} />
      <Cifra
        etiqueta="Sin foto"
        nota="No se reconocen en el portal"
        valor={resumen.sinFoto}
        tono={resumen.sinFoto > 0 ? "aviso" : "ok"}
      />
    </dl>
  );
}

function Cifra({
  etiqueta,
  valor,
  nota,
  tono = "neutro",
}: {
  etiqueta: string;
  valor: ReactNode;
  nota?: string;
  tono?: "neutro" | "ok" | "aviso" | "peligro";
}) {
  return (
    <Card className="gap-1 p-4">
      <dt className="mst-label text-[11px]">{etiqueta}</dt>
      <dd
        className={cn(
          "text-[22px] font-semibold leading-none tabular-nums",
          tono === "peligro"
            ? "text-peligro"
            : tono === "aviso"
              ? "text-aviso-700"
              : tono === "ok"
                ? "text-marca"
                : "text-tinta-900",
        )}
      >
        {valor}
      </dd>
      {nota && <p className="text-[11px] text-tinta-500">{nota}</p>}
    </Card>
  );
}
