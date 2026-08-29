ALTER TABLE "organizacion" ADD COLUMN IF NOT EXISTS "ventana_apertura" time DEFAULT '15:00' NOT NULL;
--> statement-breakpoint
ALTER TABLE "organizacion" ADD COLUMN IF NOT EXISTS "ventana_cierre" time DEFAULT '00:00' NOT NULL;
--> statement-breakpoint

-- Repuebla desde el lunes de cada organización, que es el día representativo
-- del horario semanal.
UPDATE "organizacion" o
SET "ventana_apertura" = v."apertura",
    "ventana_cierre" = v."cierre"
FROM "ventana_semanal" v
WHERE v."organizacion_id" = o."id" AND v."weekday" = 1;
--> statement-breakpoint

ALTER TABLE "ventana_semanal" ALTER COLUMN "cierre" SET DEFAULT '00:00';
