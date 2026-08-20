-- Operación diaria: cierre de ventana, hoja de producción versionada.
-- Nada se borra al reabrir: se inserta una versión nueva.

CREATE TYPE "public"."dia_operacion_estado" AS ENUM('ABIERTO', 'CERRADO', 'REABIERTO');

CREATE TABLE "dia_operacion" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organizacion_id" uuid NOT NULL,
	"fecha_operacion" date NOT NULL,
	"estado" "dia_operacion_estado" NOT NULL,
	"motivo_reapertura" text,
	"cerrado_at" timestamp with time zone,
	"cerrado_por" uuid,
	"reabierto_at" timestamp with time zone,
	"reabierto_por" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "dia_operacion_org_fecha_unique" UNIQUE("organizacion_id","fecha_operacion")
);

ALTER TABLE "dia_operacion" ADD CONSTRAINT "dia_operacion_organizacion_id_organizacion_id_fk" FOREIGN KEY ("organizacion_id") REFERENCES "public"."organizacion"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "dia_operacion" ADD CONSTRAINT "dia_operacion_cerrado_por_usuario_id_fk" FOREIGN KEY ("cerrado_por") REFERENCES "public"."usuario"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "dia_operacion" ADD CONSTRAINT "dia_operacion_reabierto_por_usuario_id_fk" FOREIGN KEY ("reabierto_por") REFERENCES "public"."usuario"("id") ON DELETE no action ON UPDATE no action;

CREATE TABLE "hoja_produccion" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organizacion_id" uuid NOT NULL,
	"fecha_operacion" date NOT NULL,
	"version" integer NOT NULL,
	"snapshot" jsonb NOT NULL,
	"texto" text NOT NULL,
	"generado_at" timestamp with time zone DEFAULT now() NOT NULL,
	"generado_por" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hoja_produccion_org_fecha_version_unique" UNIQUE("organizacion_id","fecha_operacion","version")
);

ALTER TABLE "hoja_produccion" ADD CONSTRAINT "hoja_produccion_organizacion_id_organizacion_id_fk" FOREIGN KEY ("organizacion_id") REFERENCES "public"."organizacion"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "hoja_produccion" ADD CONSTRAINT "hoja_produccion_generado_por_usuario_id_fk" FOREIGN KEY ("generado_por") REFERENCES "public"."usuario"("id") ON DELETE no action ON UPDATE no action;

INSERT INTO "permiso" ("codigo", "descripcion")
VALUES ('ventana.cerrar', 'Cerrar la ventana y generar la hoja de producción')
ON CONFLICT ("codigo") DO NOTHING;
