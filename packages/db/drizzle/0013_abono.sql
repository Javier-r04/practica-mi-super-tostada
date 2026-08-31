-- Abonos a cuenta corriente + confirmación de transferencias del portal.
-- Backfill: un abono CONFIRMADO por cada pago existente (1:1).

CREATE TYPE "abono_estado" AS ENUM ('PENDIENTE', 'CONFIRMADO', 'RECHAZADO');
--> statement-breakpoint
CREATE TYPE "abono_origen" AS ENUM ('PORTAL', 'REPARTO', 'MANUAL');
--> statement-breakpoint
CREATE TABLE "abono" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cliente_id" uuid NOT NULL,
	"monto_centavos" integer NOT NULL,
	"metodo" "pago_metodo" NOT NULL,
	"estado" "abono_estado" NOT NULL,
	"descripcion" text,
	"comprobante_asset_id" uuid,
	"origen" "abono_origen" NOT NULL,
	"registrado_por" uuid,
	"confirmado_por" uuid,
	"confirmado_at" timestamp with time zone,
	"anulado_at" timestamp with time zone,
	"motivo_rechazo" text,
	"fecha" date NOT NULL,
	"idempotency_key" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "abono" ADD CONSTRAINT "abono_cliente_id_cliente_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."cliente"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "abono" ADD CONSTRAINT "abono_registrado_por_usuario_id_fk" FOREIGN KEY ("registrado_por") REFERENCES "public"."usuario"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "abono" ADD CONSTRAINT "abono_confirmado_por_usuario_id_fk" FOREIGN KEY ("confirmado_por") REFERENCES "public"."usuario"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "abono_idempotency_key_unique" ON "abono" USING btree ("idempotency_key") WHERE "idempotency_key" is not null;
--> statement-breakpoint
ALTER TABLE "pago" ADD COLUMN "abono_id" uuid;
--> statement-breakpoint
INSERT INTO "abono" (
	"id",
	"cliente_id",
	"monto_centavos",
	"metodo",
	"estado",
	"comprobante_asset_id",
	"origen",
	"registrado_por",
	"confirmado_por",
	"confirmado_at",
	"fecha",
	"idempotency_key",
	"created_at",
	"updated_at"
)
SELECT
	p."id",
	ped."cliente_id",
	p."monto_centavos",
	p."metodo",
	'CONFIRMADO',
	p."comprobante_asset_id",
	'MANUAL',
	p."registrado_por",
	p."registrado_por",
	p."created_at",
	p."fecha",
	p."idempotency_key",
	p."created_at",
	p."created_at"
FROM "pago" p
INNER JOIN "factura" f ON f."id" = p."factura_id"
INNER JOIN "pedido" ped ON ped."id" = f."pedido_id";
--> statement-breakpoint
UPDATE "pago" SET "abono_id" = "id";
--> statement-breakpoint
ALTER TABLE "pago" ALTER COLUMN "abono_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "pago" ADD CONSTRAINT "pago_abono_id_abono_id_fk" FOREIGN KEY ("abono_id") REFERENCES "public"."abono"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
INSERT INTO "permiso" ("codigo", "descripcion")
VALUES ('cobranza.confirmar_transferencia', 'Confirmar o rechazar transferencias reportadas por clientes')
ON CONFLICT ("codigo") DO NOTHING;
