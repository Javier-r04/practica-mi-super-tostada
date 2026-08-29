import { buildPedidosHref } from "./pedido-vista";
import { fechaFocoUi } from "./ejes-vista";

/**
 * `horario` es `null` cuando `ventana_semanal` no tiene filas: no hay ventana y
 * no hay hora que anunciar. Antes se rellenaba con un 15:00 → 00:00 fijo, que
 * mentía cuando el admin tenía otro horario y ocultaba que faltaba configurarlo.
 */
export function copyVentanaHoy(
  horario: { apertura: string; cierre: string } | null,
): { subtitle: string; empty: string } {
  if (!horario) {
    return {
      subtitle: "Sin horario configurado",
      empty:
        "No hay ventana configurada, así que el portal no acepta pedidos. Defínala en Configuración.",
    };
  }
  const apertura = horario.apertura.slice(0, 5);
  const cierre = horario.cierre.slice(0, 5);
  return {
    subtitle: `${apertura} → ${cierre} · America/Guatemala`,
    empty: `La ventana abre a las ${apertura}. Los del portal y los de llamada aparecen aquí.`,
  };
}

/**
 * Foco de `/hoy`: sobre cuál de los dos ejes de operación se está mirando.
 *
 * - `curso`: la operación que se reparte y se cobra hoy.
 * - `captura`: la ventana que está recibiendo pedidos ahora.
 * - `otra`: una fecha histórica elegida a mano en el calendario.
 */
export type FocoOperacion = "curso" | "captura" | "otra";

export type EjesCalendario = {
  ventanaAbierta: boolean;
  fechaOperacionCaptura: string;
  fechaOperacionEnCurso: string;
};

/**
 * Operación que `/hoy` abre sin filtro en la URL.
 *
 * Con la ventana abierta el trabajo activo es capturar pedidos; con la ventana
 * cerrada es producir y repartir lo que ya se cerró. Fijarlo siempre en una
 * sola de las dos era el origen de abrir en una operación vacía a las 08:00.
 */
export function fechaDefectoHoy(cal: EjesCalendario | undefined): string {
  return fechaFocoUi(cal);
}

export function focoDeFecha(
  fecha: string,
  cal: EjesCalendario | undefined,
): FocoOperacion {
  if (!cal || !fecha) return "curso";
  if (fecha === cal.fechaOperacionEnCurso) return "curso";
  if (fecha === cal.fechaOperacionCaptura) return "captura";
  return "otra";
}

export function fechaDeFoco(
  foco: FocoOperacion,
  cal: EjesCalendario | undefined,
): string {
  if (!cal) return "";
  return foco === "captura"
    ? cal.fechaOperacionCaptura
    : cal.fechaOperacionEnCurso;
}

/** Título y subtítulo del hero según el eje que se está mirando. */
export function copyHeroFoco(foco: FocoOperacion): {
  titulo: string;
  nota: string;
} {
  if (foco === "captura") {
    return {
      titulo: "Monto de la noche",
      nota: "Suma de lo pedido — la factura se arma al entregar.",
    };
  }
  if (foco === "curso") {
    return {
      titulo: "Monto del reparto de hoy",
      nota: "Lo que salió a la calle hoy. La factura se arma al entregar.",
    };
  }
  return {
    titulo: "Monto de la operación",
    nota: "Operación pasada. Suma de lo pedido ese día.",
  };
}

export const PEDIDOS_NOCHE_LIMITE = 8;
/** Primer corte y paso de «Cargar más» en clientes sin pedido. */
export const CLIENTES_SIN_PEDIDO_PASO = 8;

export type PedidoNocheRecorte<T> = {
  visible: T[];
  total: number;
  meta: string | null;
};

export type ListaPaginadaUi<T> = {
  visible: T[];
  total: number;
  hayMas: boolean;
  meta: string | null;
};

/** Query de `/hoy` para una fecha de operación. Nunca la bandeja. */
export function hrefHoyFecha(iso: string): string {
  return iso ? `/hoy?fechaOperacion=${iso}` : "/hoy";
}

/** Deep link a ese pedido en la bandeja de la fecha. */
export function hrefPedidoNoche(input: {
  fechaOperacion: string;
  pedidoId: string;
}): string {
  return buildPedidosHref({
    fechaOperacion: input.fechaOperacion,
    pedidoId: input.pedidoId,
  });
}

/** Ficha del restaurante que aún no pidió (no la bandeja genérica). */
export function hrefClienteSinPedido(clienteId: string): string {
  return `/clientes/${clienteId}`;
}

/** Ficha del cliente al límite de crédito. */
export function hrefLimiteCredito(clienteId: string): string {
  return `/clientes/${clienteId}`;
}

/**
 * Recorte de la lista de pedidos de la noche.
 * Meta visible solo si hay más que el límite ("8 de N").
 */
export function recortarPedidosNoche<T>(
  rows: readonly T[],
  limite = PEDIDOS_NOCHE_LIMITE,
): PedidoNocheRecorte<T> {
  const total = rows.length;
  const visible = rows.slice(0, limite);
  const meta = total > limite ? `${limite} de ${total}` : null;
  return { visible, total, meta };
}

/**
 * Página incremental de «Aún no piden».
 * `visibles` crece con «Cargar más»; la meta siempre refleja cuántos se ven.
 */
export function paginaClientesSinPedido<T>(
  rows: readonly T[],
  visibles: number,
): ListaPaginadaUi<T> {
  const total = rows.length;
  const limite = Math.max(0, visibles);
  const visible = rows.slice(0, limite);
  const mostrados = visible.length;
  const hayMas = total > mostrados;
  const meta =
    total === 0
      ? null
      : hayMas || total > CLIENTES_SIN_PEDIDO_PASO
        ? `${mostrados} de ${total}`
        : null;
  return { visible, total, hayMas, meta };
}

/** Join clienteId → fotoAssetId para avatares (misma query que Pedidos). */
export function mapaFotoCliente(
  clientes: readonly { id: string; fotoAssetId?: string | null }[],
): Map<string, string | null> {
  const map = new Map<string, string | null>();
  for (const c of clientes) {
    map.set(c.id, c.fotoAssetId ?? null);
  }
  return map;
}
