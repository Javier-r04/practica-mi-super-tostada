import { z } from "zod";
import type { WeekdayIso } from "./calendar";

export const WEEKDAYS_ISO = [1, 2, 3, 4, 5, 6, 7] as const satisfies readonly WeekdayIso[];

export const WEEKDAY_ETIQUETA: Record<WeekdayIso, string> = {
  1: "Lunes",
  2: "Martes",
  3: "Miércoles",
  4: "Jueves",
  5: "Viernes",
  6: "Sábado",
  7: "Domingo",
};

const horaSchema = z
  .string()
  .regex(/^\d{2}:\d{2}(:\d{2})?$/, "Use HH:MM")
  .transform((v) => v.slice(0, 5));

function parseMinutos(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + (m || 0);
}

export const VENTANA_DURACION_MAX_MIN = 18 * 60;
export const AUDIT_PAGE_SIZE_DEFAULT = 40;
export const AUDIT_PAGE_SIZE_MAX = 100;

export const ventanaDiaSchema = z.object({
  weekday: z.number().int().min(1).max(7),
  activa: z.boolean(),
  apertura: horaSchema,
  cierre: horaSchema,
  cruzaMedianoche: z.boolean(),
});

export type VentanaDiaDto = z.infer<typeof ventanaDiaSchema>;

/**
 * Horario de fábrica: **lun–sáb 15:00 → 03:00** del día de calendario siguiente,
 * domingo cerrado.
 *
 * Es el único lugar del repo donde vive ese horario en TypeScript. Lo usan la
 * siembra de `ventana_semanal` (`@misupertostada/db`), el prefill del
 * formulario de `/configuracion` y el borrador vacío de `VentanaCard`.
 *
 * **No es fuente de verdad del calendario.** El motor lee siempre
 * `ventana_semanal`; esto es solo lo que se le propone al admin cuando la
 * tabla todavía no tiene sus 7 filas. El espejo en SQL está en
 * `packages/db/drizzle/0012_ventana_fuente_unica.sql`.
 */
export const APERTURA_DEFAULT = "15:00";
export const CIERRE_DEFAULT = "03:00";

export const HORARIO_SEMANAL_DEFAULT: readonly VentanaDiaDto[] =
  WEEKDAYS_ISO.map((weekday) => ({
    weekday,
    activa: weekday !== 7,
    apertura: APERTURA_DEFAULT,
    cierre: CIERRE_DEFAULT,
    cruzaMedianoche: true,
  }));

function duracionMinutos(dia: VentanaDiaDto): number {
  const a = parseMinutos(dia.apertura);
  const c = parseMinutos(dia.cierre);
  const cruza = dia.cruzaMedianoche || c === 0 || c <= a;
  if (cruza) return 24 * 60 - a + c;
  return c - a;
}

function intervalosSemana(dias: VentanaDiaDto[]): Array<{ start: number; end: number }> {
  const out: Array<{ start: number; end: number }> = [];
  for (const dia of dias) {
    if (!dia.activa) continue;
    const a = parseMinutos(dia.apertura);
    const c = parseMinutos(dia.cierre);
    const origen = (dia.weekday - 1) * 24 * 60;
    const cruza = dia.cruzaMedianoche || c === 0 || c <= a;
    const start = origen + a;
    const end = cruza ? origen + 24 * 60 + c : origen + c;
    out.push({ start, end });
  }
  return out.sort((x, y) => x.start - y.start);
}

export function haySolapeVentanaSemanal(dias: VentanaDiaDto[]): boolean {
  const ivs = intervalosSemana(dias);
  for (let i = 0; i < ivs.length; i++) {
    const a = ivs[i]!;
    const b = ivs[(i + 1) % ivs.length];
    if (!b) continue;
    if (ivs.length === 1) continue;
    const bStart = i + 1 === ivs.length ? b.start + 7 * 24 * 60 : b.start;
    if (a.end > bStart) return true;
  }
  return false;
}

export const ventanaSemanalSchema = z
  .object({
    dias: z.array(ventanaDiaSchema).length(7),
  })
  .superRefine((val, ctx) => {
    const weekdays = val.dias.map((d) => d.weekday).sort((a, b) => a - b);
    if (weekdays.join() !== WEEKDAYS_ISO.join()) {
      ctx.addIssue({
        code: "custom",
        message: "Debe haber un horario por cada día de la semana",
        path: ["dias"],
      });
      return;
    }
    for (const dia of val.dias) {
      if (!dia.activa) continue;
      const dur = duracionMinutos(dia);
      if (dur <= 0 || dur > VENTANA_DURACION_MAX_MIN) {
        ctx.addIssue({
          code: "custom",
          message: "Un día activo dura más de 0 y como máximo 18 horas",
          path: ["dias", dia.weekday],
        });
      }
    }
    if (haySolapeVentanaSemanal(val.dias)) {
      ctx.addIssue({
        code: "custom",
        message: "El cierre de un día no puede solaparse con la apertura del siguiente",
        path: ["dias"],
      });
    }
  });

export type VentanaSemanal = z.infer<typeof ventanaSemanalSchema>;

function opcionalVacio<T extends z.ZodTypeAny>(
  schema: T,
): z.ZodType<z.infer<T> | undefined> {
  return z.preprocess(
    (value) => (value === "" || value === undefined ? undefined : value),
    schema.optional(),
  ) as z.ZodType<z.infer<T> | undefined>;
}

function opcionalEnteroQuery(
  min: number,
  max: number,
): z.ZodType<number | undefined> {
  return z.preprocess((value) => {
    if (value === "" || value === undefined || value === null) return undefined;
    const n = typeof value === "number" ? value : Number(value);
    return Number.isFinite(n) ? n : undefined;
  }, z.number().int().min(min).max(max).optional()) as z.ZodType<
    number | undefined
  >;
}

const fechaCalendarioSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use AAAA-MM-DD");

export const auditQuerySchema = z.object({
  desde: opcionalVacio(fechaCalendarioSchema),
  hasta: opcionalVacio(fechaCalendarioSchema),
  accion: opcionalVacio(z.string().trim().max(80)),
  entidad: opcionalVacio(z.string().trim().max(80)),
  q: opcionalVacio(z.string().trim().max(80)),
  limit: opcionalEnteroQuery(1, AUDIT_PAGE_SIZE_MAX),
  offset: opcionalEnteroQuery(0, 100_000),
});

export type AuditQuery = z.infer<typeof auditQuerySchema>;

export const auditEntrySchema = z.object({
  id: z.string().uuid(),
  createdAt: z.string(),
  actorTipo: z.string(),
  actorId: z.string(),
  actorUsername: z.string().nullable(),
  accion: z.string(),
  entidad: z.string(),
  entidadId: z.string(),
  antes: z.unknown().nullable(),
  despues: z.unknown().nullable(),
  ip: z.string().nullable(),
});

export type AuditEntry = z.infer<typeof auditEntrySchema>;

export const auditListaSchema = z.object({
  items: z.array(auditEntrySchema),
  total: z.number().int().nonnegative(),
  limit: z.number().int(),
  offset: z.number().int(),
});

export type AuditLista = z.infer<typeof auditListaSchema>;

export const GRUPOS_PERMISOS_UI = [
  { grupo: "Pedidos", permisos: ["pedidos.capturar_manual"] },
  { grupo: "Reparto", permisos: ["pedidos.entregar"] },
  { grupo: "Cobranza", permisos: ["cobranza.registrar_pago", "cobranza.capturar_dte", "cobranza.confirmar_transferencia"] },
  { grupo: "Catálogo", permisos: ["catalogo.escribir", "precios.cambiar"] },
  { grupo: "Conversaciones", permisos: ["mensajeria.enviar"] },
  { grupo: "Operación", permisos: ["ventana.cerrar"] },
] as const;
