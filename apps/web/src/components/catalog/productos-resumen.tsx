"use client";

import type { ProductoPublico } from "@misupertostada/shared";
import { KpiCard, KpiGrid, KpiGridSkeleton } from "@/components/ui/kpi-grid";

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
    return <KpiGridSkeleton count={4} />;
  }

  return (
    <KpiGrid>
      <KpiCard
        etiqueta="Productos activos"
        valor={resumen.activos}
        nota={
          resumen.inactivos > 0
            ? `${resumen.inactivos} inactivo${resumen.inactivos === 1 ? "" : "s"}`
            : undefined
        }
      />
      <KpiCard etiqueta="Carga en Democracia" valor={resumen.democracia} />
      <KpiCard etiqueta="Carga en Planta" valor={resumen.planta} />
      <KpiCard
        etiqueta="Sin foto"
        nota="No se reconocen en el portal"
        valor={resumen.sinFoto}
        tono={resumen.sinFoto > 0 ? "aviso" : "ok"}
      />
    </KpiGrid>
  );
}
