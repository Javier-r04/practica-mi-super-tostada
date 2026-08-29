import {
  FAMILIA_ETIQUETA,
  FAMILIAS,
  type ClienteProductoFila,
  type Familia,
  type PedidoBandeja,
  type PedidoEstado,
  type PeriodoTablero,
} from "@misupertostada/shared";
import {
  esFechaIso,
  rangoUiDePreset,
  type PresetCalendario,
} from "./fecha-ui";

/** Filtro de segmento en la bandeja (además de la fecha de operación). */
export type PedidoSegmento = "todos" | "vivos" | "ANULADO";

export type GrupoCaptura = {
  key: "favoritos" | Familia;
  label: string;
  filas: ClienteProductoFila[];
};

export type PedidosUrlState = {
  periodo?: PeriodoTablero;
  desde?: string;
  hasta?: string;
  fechaOperacion?: string;
  clienteId?: string;
  historial?: boolean;
  pedidoId?: string;
  estado?: PedidoSegmento;
};

/** ¿El snapshot del servidor debe pisar el formulario local? */
export function debeAplicarSnapshotServidor(input: {
  pedidoIdLocal: string;
  pedidoIdServidor: string;
  dirty: boolean;
}): boolean {
  if (input.pedidoIdLocal !== input.pedidoIdServidor) return true;
  return !input.dirty;
}

/** Estado efectivo para la query API a partir del segmento. */
export function estadoDeSegmento(
  segmento: PedidoSegmento,
): PedidoEstado | undefined {
  if (segmento === "todos" || segmento === "vivos") return undefined;
  return "ANULADO";
}

/** Filtra anulados en cliente cuando el segmento es "vivos". */
export function aplicarSegmentoLista(
  rows: readonly PedidoBandeja[],
  segmento: PedidoSegmento,
): PedidoBandeja[] {
  if (segmento === "vivos") {
    return rows.filter((p) => p.estado !== "ANULADO");
  }
  if (segmento === "ANULADO") {
    return rows.filter((p) => p.estado === "ANULADO");
  }
  return [...rows];
}

/**
 * Búsqueda local: nombre de restaurante, correlativo, o alias de producto
 * si el mapa trae aliases por cliente (join opcional).
 */
export function filtrarBandeja(
  rows: readonly PedidoBandeja[],
  q: string,
  aliasesPorCliente?: ReadonlyMap<string, readonly string[]>,
): PedidoBandeja[] {
  const needle = q.trim().toLowerCase();
  if (!needle) return [...rows];
  return rows.filter((p) => {
    if (p.clienteNombre.toLowerCase().includes(needle)) return true;
    if (String(p.correlativo).includes(needle)) return true;
    const aliases = aliasesPorCliente?.get(p.clienteId) ?? [];
    return aliases.some((a) => a.toLowerCase().includes(needle));
  });
}

/**
 * Agrupa catálogo de captura: favoritos primero ("Lo que pide siempre"),
 * luego familias en orden de catálogo.
 */
export function agruparProductosCaptura(
  filas: readonly ClienteProductoFila[],
): GrupoCaptura[] {
  const activos = filas.filter((f) => f.productoActivo);
  const favoritos = activos
    .filter((f) => f.favorito)
    .sort((a, b) => a.orden - b.orden || a.nombreCanonico.localeCompare(b.nombreCanonico, "es"));

  const grupos: GrupoCaptura[] = [];
  if (favoritos.length > 0) {
    grupos.push({
      key: "favoritos",
      label: "Lo que pide siempre",
      filas: favoritos,
    });
  }

  const idsFavorito = new Set(favoritos.map((f) => f.productoId));
  for (const familia of FAMILIAS) {
    const delGrupo = activos
      .filter((f) => f.familia === familia && !idsFavorito.has(f.productoId))
      .sort(
        (a, b) =>
          a.orden - b.orden ||
          a.nombreCanonico.localeCompare(b.nombreCanonico, "es"),
      );
    if (delGrupo.length === 0) continue;
    grupos.push({
      key: familia,
      label: FAMILIA_ETIQUETA[familia],
      filas: delGrupo,
    });
  }
  return grupos;
}

/** Productos del catálogo del cliente que aún no están en el pedido. */
export function productosAgregables(
  catalogo: readonly ClienteProductoFila[],
  productoIdsEnPedido: ReadonlySet<string>,
): ClienteProductoFila[] {
  return catalogo.filter(
    (f) =>
      f.productoActivo &&
      f.precioCentavos != null &&
      !productoIdsEnPedido.has(f.productoId),
  );
}

/** Query string de `/pedidos` a partir del estado de filtros. */
export function buildPedidosHref(state: PedidosUrlState): string {
  const s = new URLSearchParams();
  if (state.historial) {
    if (state.clienteId) s.set("clienteId", state.clienteId);
    s.set("historial", "1");
  } else if (state.periodo || state.desde) {
    if (state.periodo) s.set("periodo", state.periodo);
    if (state.desde) s.set("desde", state.desde);
    if (state.hasta) s.set("hasta", state.hasta);
    if (state.clienteId) s.set("clienteId", state.clienteId);
  } else {
    if (state.fechaOperacion) s.set("fechaOperacion", state.fechaOperacion);
    if (state.clienteId) s.set("clienteId", state.clienteId);
  }
  if (state.pedidoId) s.set("pedidoId", state.pedidoId);
  if (state.estado && state.estado !== "todos") s.set("estado", state.estado);
  const q = s.toString();
  return q ? `/pedidos?${q}` : "/pedidos";
}

/**
 * Rango de la bandeja. `null` = historial de un cliente (sin recorte de fechas).
 * Deep link `fechaOperacion` (Hoy / ficha) sigue siendo un solo día.
 *
 * `fechaHoy` es la operación **en curso**: el atajo «Hoy» y el ancla de los
 * rangos multi-día. `fechaDefecto` es la operación con la que abre la bandeja
 * sin filtro —el foco: captura con la ventana abierta, en curso cuando cerró—.
 * Son distintas media jornada: a las 20:00 los pedidos entran en la ventana de
 * captura, y abrir en la operación que ya se repartió mostraba una bandeja
 * congelada mientras el SSE llenaba otra. Omitir `fechaDefecto` conserva el
 * comportamiento viejo (todo anclado a «hoy»).
 */
export function parsePedidosRango(
  sp: URLSearchParams,
  fechaHoy: string,
  fechaDefecto: string = fechaHoy,
): { periodo: PeriodoTablero; desde: string; hasta: string } | null {
  const clienteId = sp.get("clienteId");
  const historial = sp.get("historial") === "1";
  const fechaOp = sp.get("fechaOperacion") ?? "";
  const desdeUrl = sp.get("desde") ?? "";
  const hastaUrl = sp.get("hasta") ?? "";
  const periodoRaw = sp.get("periodo");

  if (historial && clienteId && !fechaOp && !desdeUrl) return null;

  // Sin nada en la URL manda el foco, no «hoy».
  if (!fechaOp && !desdeUrl && !hastaUrl && !periodoRaw) {
    return {
      periodo: fechaDefecto === fechaHoy ? "hoy" : "rango",
      desde: fechaDefecto,
      hasta: fechaDefecto,
    };
  }

  if (fechaOp && esFechaIso(fechaOp) && !desdeUrl && !periodoRaw) {
    return {
      periodo: fechaOp === fechaHoy ? "hoy" : "rango",
      desde: fechaOp,
      hasta: fechaOp,
    };
  }

  const periodo: PeriodoTablero =
    periodoRaw === "hoy" ||
    periodoRaw === "semana" ||
    periodoRaw === "quincena" ||
    periodoRaw === "mes" ||
    periodoRaw === "rango"
      ? periodoRaw
      : "hoy";

  if (periodo === "rango") {
    const desde = esFechaIso(desdeUrl) ? desdeUrl : fechaHoy;
    const hasta = esFechaIso(hastaUrl) ? hastaUrl : desde;
    return { periodo, desde, hasta };
  }

  const preset = periodo as PresetCalendario;
  const resuelto = rangoUiDePreset(preset, fechaHoy);
  if (periodo === "hoy") {
    return { periodo: "hoy", desde: fechaHoy, hasta: fechaHoy };
  }
  return {
    periodo,
    desde: resuelto?.desde ?? fechaHoy,
    hasta: resuelto?.hasta ?? fechaHoy,
  };
}

export function parsePedidoSegmento(
  raw: string | null | undefined,
): PedidoSegmento {
  if (raw === "vivos" || raw === "ANULADO") return raw;
  return "todos";
}
