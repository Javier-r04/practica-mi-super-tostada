DROP INDEX IF EXISTS "pedido_fecha_entrega_idx";
--> statement-breakpoint
ALTER TABLE "pedido" DROP COLUMN IF EXISTS "fecha_entrega";
