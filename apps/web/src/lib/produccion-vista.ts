import {
  FAMILIAS,
  type Familia,
  type LineaProducto,
  type UnidadMedida,
} from "@misupertostada/shared";

export type DeltaCantidad = { de: number; a: number };

export type GrupoFamilia = {
  familia: Familia;
  lineas: LineaProducto[];
};

export type TotalFamilia = {
  familia: Familia;
  cantidad: number;
  /** Unidad con más kilos/piezas en esa familia; LIBRA si no hay líneas. */
  unidadDominante: UnidadMedida;
};

/** Filtra la hoja a solo líneas con `cambio` cuando la corregida pide “Solo cambios”. */
export function lineasVisibles(
  lineas: readonly LineaProducto[],
  soloCambios: boolean,
): LineaProducto[] {
  if (!soloCambios) return [...lineas];
  return lineas.filter((l) => Boolean(l.cambio));
}

/** En una hoja corregida, línea ajustada: cantidad anterior → nueva. */
export function deltaCantidad(
  linea: LineaProducto,
): DeltaCantidad | undefined {
  if (linea.cantidadAnterior == null) return undefined;
  return { de: linea.cantidadAnterior, a: linea.cantidad };
}

/**
 * Agrupa por familia en orden de catálogo (Tortilla → Tostada → Fritura).
 * Dentro de cada familia, orden estable por nombre canónico.
 * El punto de carga queda en la fila (badge), no en el header.
 */
export function gruposPorFamilia(
  lineas: readonly LineaProducto[],
): GrupoFamilia[] {
  const mapa = new Map<Familia, LineaProducto[]>();
  for (const familia of FAMILIAS) mapa.set(familia, []);

  for (const linea of lineas) {
    const familia = familiaDe(linea);
    mapa.get(familia)?.push(linea);
  }

  return FAMILIAS.map((familia) => {
    const delGrupo = [...(mapa.get(familia) ?? [])].sort((a, b) =>
      a.nombreCanonico.localeCompare(b.nombreCanonico, "es"),
    );
    return { familia, lineas: delGrupo };
  }).filter((g) => g.lineas.length > 0);
}

/**
 * Totales para la tira KPI. Siempre las tres familias, Tortilla primero.
 * Familia en 0 se muestra igual (Alex confirma que no hay).
 */
export function totalesPorFamilia(
  lineas: readonly LineaProducto[],
): TotalFamilia[] {
  return FAMILIAS.map((familia) => {
    const delGrupo = lineas.filter((l) => familiaDe(l) === familia);
    const cantidad = delGrupo.reduce((acc, l) => acc + l.cantidad, 0);
    return {
      familia,
      cantidad,
      unidadDominante: unidadDominanteDe(delGrupo),
    };
  });
}

function familiaDe(linea: LineaProducto): Familia {
  if (linea.familia && (FAMILIAS as readonly string[]).includes(linea.familia)) {
    return linea.familia;
  }
  // Snapshots viejos sin familia: al final del orden de catálogo.
  return "FRITURA";
}

function unidadDominanteDe(lineas: readonly LineaProducto[]): UnidadMedida {
  if (lineas.length === 0) return "LIBRA";
  const porUnidad = new Map<UnidadMedida, number>();
  for (const l of lineas) {
    porUnidad.set(l.unidadMedida, (porUnidad.get(l.unidadMedida) ?? 0) + l.cantidad);
  }
  let mejor: UnidadMedida = lineas[0]!.unidadMedida;
  let max = -1;
  for (const [unidad, total] of porUnidad) {
    if (total > max) {
      max = total;
      mejor = unidad;
    }
  }
  return mejor;
}
