import { DateTime } from "luxon";
import { z } from "zod";
import {
  ZONA_NEGOCIO,
  desplazarFecha,
  rangoSemanaIsoGT,
  type BusinessCalendar,
  type FechaCalendario,
} from "./calendar";
import { FAMILIAS, PEDIDO_ORIGENES, PUNTOS_CARGA, UNIDADES_MEDIDA } from "./estados";
import { centavosSchema, redondearBancario } from "./money";

/** Días hábiles vacíos para marcar que un cliente diario dejó de pedir. */
export const DIAS_HABILES_DEJO_DE_PEDIR = 3;

/** Ventana de hábito reciente (días de calendario) previo al silencio. */
export const DIAS_CALENDARIO_HABITO = 30;

export const PERIODOS_TABLERO = ["hoy", "semana", "quincena", "rango"] as const;
export type PeriodoTablero = (typeof PERIODOS_TABLERO)[number];

export const TRAMOS_ANTIGUEDAD = ["0-7", "8-14", "15-30", "31+"] as const;
export type TramoAntiguedad = (typeof TRAMOS_ANTIGUEDAD)[number];

export const CLIENTES_ALERTA_TIPOS = ["SIN_PEDIDO", "DEJO_DE_PEDIR"] as const;
export type ClientesAlertaTipo = (typeof CLIENTES_ALERTA_TIPOS)[number];

function opcionalVacio<T extends z.ZodTypeAny>(
  schema: T,
): z.ZodType<z.infer<T> | undefined> {
  return z.preprocess(
    (value) => (value === "" || value === undefined ? undefined : value),
    schema.optional(),
  ) as z.ZodType<z.infer<T> | undefined>;
}

const fechaCalendarioSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use AAAA-MM-DD");

function exigirEnteros(valores: ReadonlyArray<number>, fn: string): void {
  for (const valor of valores) {
    if (!Number.isInteger(valor)) {
      throw new Error(`${fn}: solo enteros`);
    }
  }
}

function parseFechaGt(fecha: FechaCalendario): DateTime {
  const dt = DateTime.fromISO(String(fecha), { zone: ZONA_NEGOCIO });
  if (!dt.isValid) {
    throw new Error(`Fecha de calendario inválida: ${fecha}`);
  }
  return dt.startOf("day");
}

/** 1–15 o 16–último del mes, zona GT. */
export function rangoQuincena(fecha: FechaCalendario): {
  desde: FechaCalendario;
  hasta: FechaCalendario;
} {
  const dt = parseFechaGt(fecha);
  const y = dt.toFormat("yyyy");
  const m = dt.toFormat("MM");
  if (dt.day <= 15) {
    return { desde: `${y}-${m}-01`, hasta: `${y}-${m}-15` };
  }
  return {
    desde: `${y}-${m}-16`,
    hasta: dt.endOf("month").toISODate() ?? `${y}-${m}-16`,
  };
}

/** Quincena inmediatamente anterior (no la del año pasado). */
export function rangoQuincenaAnterior(fecha: FechaCalendario): {
  desde: FechaCalendario;
  hasta: FechaCalendario;
} {
  const actual = rangoQuincena(fecha);
  return rangoQuincena(desplazarFecha(actual.desde, -1));
}

export function tramoAntiguedad(dias: number): TramoAntiguedad {
  exigirEnteros([dias], "tramoAntiguedad");
  if (dias < 0) {
    throw new Error("tramoAntiguedad: días no puede ser negativo");
  }
  if (dias <= 7) return "0-7";
  if (dias <= 14) return "8-14";
  if (dias <= 30) return "15-30";
  return "31+";
}

/**
 * Puntos base: `parte * 10000 / total` truncado.
 * El resto se reparte aparte con `repartirPuntosBase` para que sumen 10000.
 */
export function puntosBase(parte: number, total: number): number {
  exigirEnteros([parte, total], "puntosBase");
  if (total <= 0) return 0;
  if (parte < 0) {
    throw new Error("puntosBase: parte no puede ser negativa");
  }
  return Math.floor((parte * 10000) / total);
}

/** Reparte 10000 puntos base. El resto va al mayor (empate: el primero). */
export function repartirPuntosBase(
  partes: ReadonlyArray<number>,
): number[] {
  exigirEnteros(partes, "repartirPuntosBase");
  const total = partes.reduce((acc, n) => acc + n, 0);
  if (total <= 0 || partes.length === 0) return partes.map(() => 0);
  const bases = partes.map((p) => Math.floor((p * 10000) / total));
  const resto = 10000 - bases.reduce((acc, n) => acc + n, 0);
  if (resto === 0) return bases;
  let maxIdx = 0;
  for (let i = 1; i < partes.length; i++) {
    if (partes[i]! > partes[maxIdx]!) maxIdx = i;
  }
  const next = [...bases];
  next[maxIdx] = next[maxIdx]! + resto;
  return next;
}

/** Ticket = suma / count, redondeo bancario. Sin facturas → 0, no NaN. */
export function ticketPromedioCentavos(
  sumaCentavos: number,
  countFacturas: number,
): number {
  exigirEnteros([sumaCentavos, countFacturas], "ticketPromedioCentavos");
  if (countFacturas <= 0) return 0;
  return redondearBancario(sumaCentavos / countFacturas);
}

export function medianaEntera(valores: ReadonlyArray<number>): number {
  if (valores.length === 0) return 0;
  exigirEnteros(valores, "medianaEntera");
  const ordenados = [...valores].sort((a, b) => a - b);
  const mid = Math.floor(ordenados.length / 2);
  if (ordenados.length % 2 === 1) return ordenados[mid]!;
  return redondearBancario((ordenados[mid - 1]! + ordenados[mid]!) / 2);
}

/**
 * Últimos N días hábiles ≤ `hasta`, más recientes primero.
 * Domingo y feriados se saltan; el sábado cuenta.
 */
export function ultimosDiasHabiles(
  cal: Pick<BusinessCalendar, "isDiaNoLaborable">,
  hasta: FechaCalendario,
  n: number,
): FechaCalendario[] {
  if (n <= 0) return [];
  const fechas: FechaCalendario[] = [];
  let cursor = hasta;
  let guard = 0;
  while (fechas.length < n && guard < 366) {
    if (!cal.isDiaNoLaborable(cursor)) fechas.push(cursor);
    cursor = desplazarFecha(cursor, -1);
    guard += 1;
  }
  return fechas;
}

/**
 * D6: activo con hábito reciente (pedido en los 3 hábiles previos al
 * silencio) y 0 pedidos en los últimos 3 días hábiles. Don Napo
 * (1×/semana) no tiene ese racimo de hábito, no dispara.
 */
export function evaluaDejoDePedir(input: {
  fechasPedido: ReadonlyArray<FechaCalendario>;
  silencio: ReadonlyArray<FechaCalendario>;
  habito: ReadonlyArray<FechaCalendario>;
}): boolean {
  const pedidos = new Set(input.fechasPedido);
  const pidioEnSilencio = input.silencio.some((f) => pedidos.has(f));
  if (pidioEnSilencio) return false;
  return input.habito.some((f) => pedidos.has(f));
}

export function fechasEnRango(
  desde: FechaCalendario,
  hasta: FechaCalendario,
): FechaCalendario[] {
  const fechas: FechaCalendario[] = [];
  let cursor = desde;
  let guard = 0;
  while (cursor <= hasta && guard < 400) {
    fechas.push(cursor);
    cursor = desplazarFecha(cursor, 1);
    guard += 1;
  }
  return fechas;
}

export function etiquetaPeriodo(input: {
  periodo: PeriodoTablero;
  desde: FechaCalendario;
  hasta: FechaCalendario;
}): string {
  const fmt = (f: FechaCalendario) => {
    const dt = DateTime.fromISO(String(f), { zone: ZONA_NEGOCIO }).setLocale(
      "es-GT",
    );
    return dt.isValid ? dt.toFormat("d LLL") : f;
  };
  if (input.periodo === "hoy" || input.desde === input.hasta) {
    return `Hoy · ${input.desde}`;
  }
  if (input.periodo === "semana") {
    return `Semana ${fmt(input.desde)} – ${fmt(input.hasta)}`;
  }
  if (input.periodo === "quincena") {
    return `Quincena ${fmt(input.desde)} – ${fmt(input.hasta)}`;
  }
  return `${input.desde} – ${input.hasta}`;
}

export const tableroQuerySchema = z
  .object({
    periodo: opcionalVacio(z.enum(PERIODOS_TABLERO)),
    desde: opcionalVacio(fechaCalendarioSchema),
    hasta: opcionalVacio(fechaCalendarioSchema),
    clienteId: opcionalVacio(z.string().uuid()),
    familia: opcionalVacio(z.enum(FAMILIAS)),
    puntoCarga: opcionalVacio(z.enum(PUNTOS_CARGA)),
    origen: opcionalVacio(z.enum(PEDIDO_ORIGENES)),
  })
  .superRefine((value, ctx) => {
    if (value.desde && value.hasta && value.desde > value.hasta) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "desde no puede ser posterior a hasta",
        path: ["desde"],
      });
    }
  });
export type TableroQuery = z.infer<typeof tableroQuerySchema>;

export const filtrosAplicadosSchema = z.object({
  periodo: z.enum(PERIODOS_TABLERO),
  desde: fechaCalendarioSchema,
  hasta: fechaCalendarioSchema,
  clienteId: z.string().uuid().nullable(),
  familia: z.enum(FAMILIAS).nullable(),
  puntoCarga: z.enum(PUNTOS_CARGA).nullable(),
  origen: z.enum(PEDIDO_ORIGENES).nullable(),
  etiqueta: z.string(),
  carteraAplica: z.boolean(),
});
export type FiltrosAplicados = z.infer<typeof filtrosAplicadosSchema>;

export const tableroKpisSchema = z.object({
  ventasCentavos: centavosSchema,
  ventasDeltaCentavos: centavosSchema,
  ventasDeltaPuntosBase: z.number().int(),
  pedidos: z.number().int().nonnegative(),
  portal: z.number().int().nonnegative(),
  manual: z.number().int().nonnegative(),
  porCobrarCentavos: centavosSchema,
  cobradoCentavos: centavosSchema,
  cobradoEfectivoCentavos: centavosSchema,
  cobradoTransferenciaCentavos: centavosSchema,
  clientesAlertaCount: z.number().int().nonnegative(),
  clientesAlertaTipo: z.enum(CLIENTES_ALERTA_TIPOS),
  adopcionPuntosBase: z.number().int().nonnegative(),
});
export type TableroKpis = z.infer<typeof tableroKpisSchema>;

export const clienteSinPedidoSchema = z.object({
  clienteId: z.string().uuid(),
  nombre: z.string(),
});
export type ClienteSinPedido = z.infer<typeof clienteSinPedidoSchema>;

export const rutaConteosSchema = z.object({
  confirmados: z.number().int().nonnegative(),
  enProduccion: z.number().int().nonnegative(),
  entregados: z.number().int().nonnegative(),
  anulados: z.number().int().nonnegative(),
});
export type RutaConteos = z.infer<typeof rutaConteosSchema>;

export const tableroOperacionSchema = z.object({
  pedidos: z.number().int().nonnegative(),
  montoCentavos: centavosSchema,
  portal: z.number().int().nonnegative(),
  manual: z.number().int().nonnegative(),
  ruta: rutaConteosSchema,
  clientesSinPedido: z.array(clienteSinPedidoSchema),
});
export type TableroOperacion = z.infer<typeof tableroOperacionSchema>;

export const clienteSobreLimiteTableroSchema = z.object({
  clienteId: z.string().uuid(),
  nombre: z.string(),
  pendientes: z.number().int().nonnegative(),
  limite: z.number().int().positive(),
});

export const tramoCarteraSchema = z.object({
  clave: z.enum(TRAMOS_ANTIGUEDAD),
  facturas: z.number().int().nonnegative(),
  saldoCentavos: centavosSchema,
});
export type TramoCartera = z.infer<typeof tramoCarteraSchema>;

export const tableroCarteraSchema = z.object({
  saldoCentavos: centavosSchema,
  cobradoEnRango: z.object({
    efectivoCentavos: centavosSchema,
    transferenciaCentavos: centavosSchema,
  }),
  sobreLimite: z.array(clienteSobreLimiteTableroSchema),
  tramos: z.array(tramoCarteraSchema),
});
export type TableroCartera = z.infer<typeof tableroCarteraSchema>;

export const ventasPorDiaSchema = z.object({
  fecha: fechaCalendarioSchema,
  montoCentavos: centavosSchema,
  pedidos: z.number().int().nonnegative(),
});

export const ventasPorClienteSchema = z.object({
  clienteId: z.string().uuid(),
  nombre: z.string(),
  pedidos: z.number().int().nonnegative(),
  montoCentavos: centavosSchema,
  puntosBase: z.number().int().nonnegative(),
});

export const tableroVentasSchema = z.object({
  totalCentavos: centavosSchema,
  anterior: z.object({
    desde: fechaCalendarioSchema,
    hasta: fechaCalendarioSchema,
    totalCentavos: centavosSchema,
    deltaCentavos: centavosSchema,
    deltaPuntosBase: z.number().int(),
  }),
  porDia: z.array(ventasPorDiaSchema),
  porCliente: z.array(ventasPorClienteSchema),
});
export type TableroVentas = z.infer<typeof tableroVentasSchema>;

export const cobradoPorDiaSchema = z.object({
  fecha: fechaCalendarioSchema,
  efectivoCentavos: centavosSchema,
  transferenciaCentavos: centavosSchema,
});

export const productoVolumenSchema = z.object({
  nombreMostrado: z.string(),
  unidadMedida: z.enum(UNIDADES_MEDIDA),
  puntoCarga: z.enum(PUNTOS_CARGA),
  familia: z.enum(FAMILIAS),
  cantidad: z.number().int(),
  montoCentavos: centavosSchema,
});

export const clienteSaludSchema = z.object({
  clienteId: z.string().uuid(),
  nombre: z.string(),
  pedidos: z.number().int().nonnegative(),
  ticketPromedioCentavos: centavosSchema,
  diasPagoMediana: z.number().int().nonnegative(),
  ultimoPedidoFecha: fechaCalendarioSchema.nullable(),
  dejoDePedir: z.boolean(),
});

export const adopcionSchema = z.object({
  portal: z.number().int().nonnegative(),
  manual: z.number().int().nonnegative(),
  puntosBasePortal: z.number().int().nonnegative(),
});

export const tableroSchema = z.object({
  filtrosAplicados: filtrosAplicadosSchema,
  kpis: tableroKpisSchema,
  operacion: tableroOperacionSchema,
  cartera: tableroCarteraSchema,
  ventas: tableroVentasSchema,
  cobradoPorDia: z.array(cobradoPorDiaSchema),
  productos: z.array(productoVolumenSchema),
  clientes: z.array(clienteSaludSchema),
  adopcion: adopcionSchema,
});
export type Tablero = z.infer<typeof tableroSchema>;

export function rangoAnterior(input: {
  periodo: PeriodoTablero;
  desde: FechaCalendario;
  hasta: FechaCalendario;
  cal: Pick<BusinessCalendar, "isDiaNoLaborable" | "getSiguienteDiaHabil">;
}): { desde: FechaCalendario; hasta: FechaCalendario } {
  if (input.periodo === "quincena") {
    return rangoQuincenaAnterior(input.desde);
  }
  if (input.periodo === "semana") {
    const prev = desplazarFecha(input.desde, -1);
    return rangoSemanaIsoGT(prev);
  }
  if (input.periodo === "hoy") {
    let cursor = desplazarFecha(input.desde, -1);
    let guard = 0;
    while (input.cal.isDiaNoLaborable(cursor) && guard < 14) {
      cursor = desplazarFecha(cursor, -1);
      guard += 1;
    }
    return { desde: cursor, hasta: cursor };
  }
  const dtDesde = parseFechaGt(input.desde);
  const dtHasta = parseFechaGt(input.hasta);
  const dias = Math.round(dtHasta.diff(dtDesde, "days").days) + 1;
  const hasta = desplazarFecha(input.desde, -1);
  const desde = desplazarFecha(hasta, -(dias - 1));
  return { desde, hasta };
}
