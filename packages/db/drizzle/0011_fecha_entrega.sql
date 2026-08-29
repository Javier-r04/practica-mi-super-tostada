ALTER TABLE "pedido" ADD COLUMN "fecha_entrega" date;
--> statement-breakpoint
-- Backfill: siguiente día activo después de la fecha de operación.
-- Usa la ventana semanal de la organización si existe; si no, la regla legacy
-- (domingo inactivo). Salta los feriados de esa misma organización.
UPDATE "pedido" p
SET "fecha_entrega" = COALESCE(
  (
    SELECT g.d::date
    FROM generate_series(
      p."fecha_operacion" + 1,
      p."fecha_operacion" + 14,
      interval '1 day'
    ) AS g(d)
    WHERE (
      CASE
        WHEN EXISTS (
          SELECT 1 FROM "ventana_semanal" v
          WHERE v."organizacion_id" = p."organizacion_id"
        )
        THEN EXISTS (
          SELECT 1 FROM "ventana_semanal" v
          WHERE v."organizacion_id" = p."organizacion_id"
            AND v."weekday" = extract(isodow FROM g.d)::int
            AND v."activa"
        )
        ELSE extract(isodow FROM g.d) <> 7
      END
    )
    AND NOT EXISTS (
      SELECT 1 FROM "dia_no_laborable" f
      WHERE f."organizacion_id" = p."organizacion_id"
        AND f."fecha" = g.d::date
    )
    ORDER BY g.d
    LIMIT 1
  ),
  p."fecha_operacion" + 1
)
WHERE p."fecha_entrega" IS NULL;
--> statement-breakpoint
ALTER TABLE "pedido" ALTER COLUMN "fecha_entrega" SET NOT NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pedido_fecha_entrega_idx" ON "pedido" ("fecha_entrega");
