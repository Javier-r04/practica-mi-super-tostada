DELETE FROM "usuario_permiso"
WHERE "permiso_id" IN (
  SELECT "id" FROM "permiso" WHERE "codigo" = 'cobranza.confirmar_transferencia'
);
--> statement-breakpoint
DELETE FROM "permiso" WHERE "codigo" = 'cobranza.confirmar_transferencia';
--> statement-breakpoint
ALTER TABLE "pago" DROP CONSTRAINT IF EXISTS "pago_abono_id_abono_id_fk";
--> statement-breakpoint
ALTER TABLE "pago" DROP COLUMN IF EXISTS "abono_id";
--> statement-breakpoint
DROP TABLE IF EXISTS "abono";
--> statement-breakpoint
DROP TYPE IF EXISTS "abono_origen";
--> statement-breakpoint
DROP TYPE IF EXISTS "abono_estado";
