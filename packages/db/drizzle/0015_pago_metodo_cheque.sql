-- Cheque como método de cobro (antes solo vivía en notas_permanentes).
-- ADD VALUE no usa el valor nuevo en esta migración: el backfill solo copia assets.
ALTER TYPE "pago_metodo" ADD VALUE 'CHEQUE';
--> statement-breakpoint
-- Tras confirmar un abono, el comprobante debe quedar también en cada pago
-- (cuadre, pedido, historial). Backfill de lo ya confirmado.
UPDATE "pago" p
SET "comprobante_asset_id" = a."comprobante_asset_id"
FROM "abono" a
WHERE p."abono_id" = a."id"
  AND p."comprobante_asset_id" IS NULL
  AND a."comprobante_asset_id" IS NOT NULL;
