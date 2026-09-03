-- Postgres no permite quitar un valor de enum de forma segura con filas
-- existentes. El down deja CHEQUE en el tipo; el código deja de usarlo.
UPDATE "pago" p
SET "comprobante_asset_id" = NULL
FROM "abono" a
WHERE p."abono_id" = a."id"
  AND p."comprobante_asset_id" IS NOT DISTINCT FROM a."comprobante_asset_id"
  AND a."comprobante_asset_id" IS NOT NULL;
