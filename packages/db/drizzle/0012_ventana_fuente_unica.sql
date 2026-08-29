-- `ventana_semanal` pasa a ser la ÚNICA fuente de horario.
--
-- Hasta ahora competían cuatro: la tabla semanal, las columnas
-- `organizacion.ventana_*`, el default del motor y literales en la UI. El seed
-- solo escribía las columnas, así que una instalación nueva cerraba a
-- medianoche y rechazaba los pedidos de 01:00–03:00, que son parte de la misma
-- operación. Aquí se corrige el dato y se quitan las columnas para que no
-- puedan volver a competir.
--
-- El horario de fábrica (lun–sáb 15:00 → 03:00, domingo cerrado) tiene su
-- espejo en TypeScript en `HORARIO_SEMANAL_DEFAULT`
-- (`packages/shared/src/configuracion.ts`).

-- 1. Corrige el cierre heredado del backfill de 0009, que copió el default de
--    columna 00:00 sin que nadie lo hubiera elegido. Las filas que el admin ya
--    editó (cualquier hora distinta del par exacto 15:00/00:00) quedan intactas.
UPDATE "ventana_semanal"
SET "cierre" = '03:00'
WHERE "apertura" = '15:00' AND "cierre" = '00:00';
--> statement-breakpoint

-- 2. Red de seguridad: organizaciones creadas DESPUÉS de 0009 (el seed, por
--    ejemplo) nunca recibieron filas. Sin ellas el calendario las trata como
--    semana apagada.
INSERT INTO "ventana_semanal" ("organizacion_id", "weekday", "activa", "apertura", "cierre", "cruza_medianoche")
SELECT o."id", d."weekday",
  CASE WHEN d."weekday" = 7 THEN false ELSE true END,
  '15:00'::time,
  '03:00'::time,
  true
FROM "organizacion" o
CROSS JOIN (VALUES (1),(2),(3),(4),(5),(6),(7)) AS d("weekday")
ON CONFLICT ("organizacion_id", "weekday") DO NOTHING;
--> statement-breakpoint

ALTER TABLE "ventana_semanal" ALTER COLUMN "cierre" SET DEFAULT '03:00';
--> statement-breakpoint

-- 3. Fuera las columnas que competían. A partir de aquí no hay fallback: sin
--    filas no hay ventana, y `/configuracion` lo dice en pantalla.
ALTER TABLE "organizacion" DROP COLUMN IF EXISTS "ventana_apertura";
--> statement-breakpoint
ALTER TABLE "organizacion" DROP COLUMN IF EXISTS "ventana_cierre";
