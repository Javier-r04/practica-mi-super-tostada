-- Horario semanal del portal (7 weekdays). No se dropean ventana_* de organizacion.
-- Domingo inactivo de fábrica. audit_log se consulta por created_at.

CREATE TABLE "ventana_semanal" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organizacion_id" uuid NOT NULL,
	"weekday" integer NOT NULL,
	"activa" boolean DEFAULT true NOT NULL,
	"apertura" time DEFAULT '15:00' NOT NULL,
	"cierre" time DEFAULT '00:00' NOT NULL,
	"cruza_medianoche" boolean DEFAULT true NOT NULL,
	CONSTRAINT "ventana_semanal_org_weekday_unique" UNIQUE("organizacion_id","weekday")
);
--> statement-breakpoint
ALTER TABLE "ventana_semanal" ADD CONSTRAINT "ventana_semanal_organizacion_id_organizacion_id_fk" FOREIGN KEY ("organizacion_id") REFERENCES "public"."organizacion"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
INSERT INTO ventana_semanal (organizacion_id, weekday, activa, apertura, cierre, cruza_medianoche)
SELECT o.id, d.weekday,
  CASE WHEN d.weekday = 7 THEN false ELSE true END,
  o.ventana_apertura,
  o.ventana_cierre,
  true
FROM organizacion o
CROSS JOIN (VALUES (1),(2),(3),(4),(5),(6),(7)) AS d(weekday);
--> statement-breakpoint
CREATE INDEX "audit_log_created_at_idx" ON "audit_log" USING btree ("created_at");
--> statement-breakpoint
INSERT INTO permiso (codigo, descripcion)
VALUES
  ('audit.leer', 'Consultar el historial de acciones'),
  ('ventana.configurar', 'Editar el horario semanal del portal')
ON CONFLICT (codigo) DO NOTHING;
