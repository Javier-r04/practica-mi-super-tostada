CREATE TABLE "cliente_bono" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organizacion_id" uuid NOT NULL,
	"cliente_id" uuid NOT NULL,
	"producto_id" uuid NOT NULL,
	"descripcion" text NOT NULL,
	"cantidad_otorgada" integer NOT NULL,
	"cantidad_aplicada" integer DEFAULT 0 NOT NULL,
	"otorgado_por" uuid NOT NULL,
	"anulado_at" timestamp with time zone,
	"motivo_anulacion" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cliente_bono_otorgada_check" CHECK ("cantidad_otorgada" >= 1),
	CONSTRAINT "cliente_bono_aplicada_check" CHECK ("cantidad_aplicada" >= 0),
	CONSTRAINT "cliente_bono_saldo_check" CHECK ("cantidad_aplicada" <= "cantidad_otorgada")
);
--> statement-breakpoint
ALTER TABLE "cliente_bono" ADD CONSTRAINT "cliente_bono_organizacion_id_organizacion_id_fk" FOREIGN KEY ("organizacion_id") REFERENCES "public"."organizacion"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "cliente_bono" ADD CONSTRAINT "cliente_bono_cliente_id_cliente_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."cliente"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "cliente_bono" ADD CONSTRAINT "cliente_bono_producto_id_producto_id_fk" FOREIGN KEY ("producto_id") REFERENCES "public"."producto"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "cliente_bono" ADD CONSTRAINT "cliente_bono_otorgado_por_usuario_id_fk" FOREIGN KEY ("otorgado_por") REFERENCES "public"."usuario"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "cliente_bono_cliente_idx" ON "cliente_bono" USING btree ("cliente_id");
--> statement-breakpoint
ALTER TABLE "pedido_item" ADD COLUMN "es_devolucion" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "pedido_item" ADD COLUMN "bono_id" uuid;
--> statement-breakpoint
ALTER TABLE "pedido_item" ADD CONSTRAINT "pedido_item_bono_id_cliente_bono_id_fk" FOREIGN KEY ("bono_id") REFERENCES "public"."cliente_bono"("id") ON DELETE no action ON UPDATE no action;
