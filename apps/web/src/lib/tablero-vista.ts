import {
  FAMILIA_ETIQUETA,
  FAMILIAS,
  type Familia,
} from "@misupertostada/shared";

/** Meses cortos es-GT. Sin `new Date()`: la fecha ya viene como calendario GT. */
const MESES_CORTOS = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sep",
  "oct",
  "nov",
  "dic",
] as const;

/**
 * Fecha corta para ejes: "21 ago".
 * Entrada = `fecha_operacion` / día de calendario ISO (America/Guatemala).
 */
export function formatearFechaCorta(fecha: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fecha.trim());
  if (!m) return fecha;
  const dia = Number(m[3]);
  const mes = Number(m[2]);
  if (!Number.isFinite(dia) || dia < 1 || mes < 1 || mes > 12) return fecha;
  return `${dia} ${MESES_CORTOS[mes - 1]}`;
}

/** Ticks inclusivos de 0 a max para ejes de dinero (centavos). */
export function ticksEjeCentavos(maxCentavos: number, count = 4): number[] {
  if (maxCentavos <= 0) return [0];
  const steps = Math.max(2, count);
  const out: number[] = [];
  for (let i = 0; i < steps; i++) {
    out.push(Math.round((maxCentavos * i) / (steps - 1)));
  }
  return out;
}

export type ParticipacionItem = {
  id: string;
  label: string;
  valor: number;
};

/** Top N por valor + fila "Otros" con el resto. */
export function participacionTopN(
  items: readonly ParticipacionItem[],
  n: number,
): ParticipacionItem[] {
  const sorted = [...items].sort((a, b) => b.valor - a.valor);
  if (sorted.length <= n) return sorted;
  const top = sorted.slice(0, n);
  const resto = sorted.slice(n);
  const otrosValor = resto.reduce((acc, i) => acc + i.valor, 0);
  if (otrosValor <= 0) return top;
  return [...top, { id: "otros", label: "Otros", valor: otrosValor }];
}

export function serieTodoCero(valores: readonly number[]): boolean {
  return valores.length === 0 || valores.every((v) => v === 0);
}

/**
 * Qué índices del eje X llevan etiqueta.
 * Series densas (> maxLabels) muestran primera, última y cada N.
 */
export function etiquetasEjeX(
  fechas: readonly string[],
  maxLabels = 8,
): boolean[] {
  const n = fechas.length;
  if (n === 0) return [];
  if (n <= maxLabels) return fechas.map(() => true);
  const step = Math.ceil((n - 1) / (maxLabels - 1));
  return fechas.map((_, i) => i === 0 || i === n - 1 || i % step === 0);
}

export type ProductoVolumenVista = {
  nombreMostrado: string;
  unidadMedida: "LIBRA" | "BOLSA" | "UNIDAD";
  puntoCarga: "PLANTA" | "DEMOCRACIA";
  familia: Familia;
  cantidad: number;
};

export type GrupoProductoVolumen = {
  familia: Familia;
  label: string;
  items: ProductoVolumenVista[];
};

/** Agrupa volumen por familia en el orden del catálogo. */
export function agruparProductosPorFamilia(
  productos: readonly ProductoVolumenVista[],
): GrupoProductoVolumen[] {
  const byFam = new Map<Familia, ProductoVolumenVista[]>();
  for (const p of productos) {
    const list = byFam.get(p.familia) ?? [];
    byFam.set(p.familia, [...list, p]);
  }
  return FAMILIAS.filter((f) => (byFam.get(f)?.length ?? 0) > 0).map((f) => ({
    familia: f,
    label: FAMILIA_ETIQUETA[f],
    items: byFam.get(f) ?? [],
  }));
}

/** % entero a partir de puntos base (6200 → 62). */
export function puntosBaseAPct(puntosBase: number): number {
  return Math.trunc(puntosBase / 100);
}

/** Mediana de días de pago que ya merece atención en el tablero. */
export const DIAS_PAGO_LENTO = 7;

export type ClienteSaludVista = {
  clienteId: string;
  nombre: string;
  pedidos: number;
  ticketPromedioCentavos: number;
  diasPagoMediana: number;
  ultimoPedidoFecha: string | null;
  dejoDePedir: boolean;
};

export type SaludClientesVista = {
  dejaronDePedir: ClienteSaludVista[];
  paganLento: ClienteSaludVista[];
  topTicket: ClienteSaludVista[];
  resumen: {
    dejaron: number;
    lentos: number;
    conPedidos: number;
  };
};

/**
 * Parte la lista cruda en señales accionables.
 * El tablero no debe listar todos los activos: solo atención + top ticket.
 */
export function segmentarSaludClientes(
  clientes: readonly ClienteSaludVista[],
  opts?: { maxAtencion?: number; maxTicket?: number; diasLento?: number },
): SaludClientesVista {
  const maxAtencion = opts?.maxAtencion ?? 6;
  const maxTicket = opts?.maxTicket ?? 5;
  const diasLento = opts?.diasLento ?? DIAS_PAGO_LENTO;

  const dejaronDePedir = [...clientes]
    .filter((c) => c.dejoDePedir)
    .sort((a, b) => {
      const fa = a.ultimoPedidoFecha ?? "";
      const fb = b.ultimoPedidoFecha ?? "";
      return fa.localeCompare(fb);
    })
    .slice(0, maxAtencion);

  const idsAtencion = new Set(dejaronDePedir.map((c) => c.clienteId));

  const paganLento = [...clientes]
    .filter(
      (c) =>
        !idsAtencion.has(c.clienteId) &&
        c.diasPagoMediana >= diasLento &&
        c.pedidos > 0,
    )
    .sort((a, b) => b.diasPagoMediana - a.diasPagoMediana)
    .slice(0, Math.max(0, maxAtencion - dejaronDePedir.length));

  const topTicket = [...clientes]
    .filter((c) => c.pedidos > 0 && c.ticketPromedioCentavos > 0)
    .sort((a, b) => b.ticketPromedioCentavos - a.ticketPromedioCentavos)
    .slice(0, maxTicket);

  return {
    dejaronDePedir,
    paganLento,
    topTicket,
    resumen: {
      dejaron: clientes.filter((c) => c.dejoDePedir).length,
      lentos: clientes.filter(
        (c) =>
          !c.dejoDePedir &&
          c.diasPagoMediana >= diasLento &&
          c.pedidos > 0,
      ).length,
      conPedidos: clientes.filter((c) => c.pedidos > 0).length,
    },
  };
}

/** Top N productos por cantidad (aplana familias). */
export function topProductosVolumen<T extends { cantidad: number }>(
  productos: readonly T[],
  n = 8,
): { items: T[]; ocultos: number } {
  const sorted = [...productos].sort((a, b) => b.cantidad - a.cantidad);
  if (sorted.length <= n) return { items: sorted, ocultos: 0 };
  return { items: sorted.slice(0, n), ocultos: sorted.length - n };
}
