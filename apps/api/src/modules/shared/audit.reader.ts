import { Inject, Injectable } from "@nestjs/common";
import { and, desc, eq, gte, ilike, lte, or, sql, type SQL } from "drizzle-orm";
import { auditLog, usuario } from "@misupertostada/db";
import {
  AUDIT_PAGE_SIZE_DEFAULT,
  auditListaSchema,
  auditQuerySchema,
  desplazarFecha,
  instanteDeFecha,
} from "@misupertostada/shared";
import { DRIZZLE } from "./tokens";
import type { AppDatabase } from "./database.module";
import { parseBody } from "./zod-body";

const CLAVES_SENSIBLES =
  /hash|token|password|secret|body|params|cifrado|cookie/i;

export function redactarAuditJson(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactarAuditJson);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = CLAVES_SENSIBLES.test(k) ? "[redactado]" : redactarAuditJson(v);
    }
    return out;
  }
  return value;
}

/**
 * `actor_id` es texto libre (hay actores que no son usuarios), así que el cruce
 * con `usuario` exige castear el uuid y ningún índice sirve. Unirlas de frente
 * obligaba a ordenar las dos tablas enteras en cada listado.
 *
 * En vez de eso: el nombre se resuelve por subconsulta, solo en las filas de la
 * página; y el filtro por nombre es un EXISTS, que Postgres resuelve contra los
 * pocos usuarios que casan con el texto buscado.
 */
const actorUsername = sql<string | null>`(
  select u."username" from ${usuario} u
  where ${auditLog.actorTipo} = 'usuario' and u."id"::text = ${auditLog.actorId}
)`;

function actorUsernameComo(needle: string): SQL {
  return sql`exists (
    select 1 from ${usuario} u
    where ${auditLog.actorTipo} = 'usuario'
      and u."id"::text = ${auditLog.actorId}
      and u."username" ilike ${needle}
  )`;
}

@Injectable()
export class AuditReader {
  constructor(@Inject(DRIZZLE) private readonly db: AppDatabase) {}

  async listar(query: unknown) {
    const q = parseBody(auditQuerySchema, query ?? {});
    const limit = q.limit ?? AUDIT_PAGE_SIZE_DEFAULT;
    const offset = q.offset ?? 0;
    const filtros: SQL[] = [];

    if (q.desde) {
      filtros.push(gte(auditLog.createdAt, instanteDeFecha(q.desde)));
    }
    if (q.hasta) {
      filtros.push(
        lte(auditLog.createdAt, instanteDeFecha(desplazarFecha(q.hasta, 1))),
      );
    }
    if (q.accion) {
      filtros.push(ilike(auditLog.accion, `%${q.accion}%`));
    }
    if (q.entidad) {
      filtros.push(eq(auditLog.entidad, q.entidad));
    }
    if (q.q) {
      const needle = `%${q.q}%`;
      filtros.push(
        or(
          ilike(auditLog.accion, needle),
          ilike(auditLog.entidad, needle),
          ilike(auditLog.entidadId, needle),
          actorUsernameComo(needle),
        )!,
      );
    }

    const where = filtros.length ? and(...filtros) : undefined;

    const [countRow] = await this.db
      .select({ n: sql<number>`count(*)::int` })
      .from(auditLog)
      .where(where);

    const rows = await this.db
      .select({
        id: auditLog.id,
        createdAt: auditLog.createdAt,
        actorTipo: auditLog.actorTipo,
        actorId: auditLog.actorId,
        actorUsername,
        accion: auditLog.accion,
        entidad: auditLog.entidad,
        entidadId: auditLog.entidadId,
        antes: auditLog.antes,
        despues: auditLog.despues,
        ip: auditLog.ip,
      })
      .from(auditLog)
      .where(where)
      .orderBy(desc(auditLog.createdAt))
      .limit(limit)
      .offset(offset);

    return auditListaSchema.parse({
      total: countRow?.n ?? 0,
      limit,
      offset,
      items: rows.map((r) => ({
        id: r.id,
        createdAt: r.createdAt.toISOString(),
        actorTipo: r.actorTipo,
        actorId: r.actorId,
        actorUsername: r.actorUsername ?? null,
        accion: r.accion,
        entidad: r.entidad,
        entidadId: r.entidadId,
        antes: r.antes == null ? null : redactarAuditJson(r.antes),
        despues: r.despues == null ? null : redactarAuditJson(r.despues),
        ip: r.ip,
      })),
    });
  }
}
