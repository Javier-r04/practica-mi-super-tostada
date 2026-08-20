DELETE FROM "usuario_permiso"
WHERE "permiso_id" IN (
  SELECT "id" FROM "permiso"
  WHERE "codigo" IN ('pedidos.entregar', 'cobranza.capturar_dte')
);
DELETE FROM "permiso"
WHERE "codigo" IN ('pedidos.entregar', 'cobranza.capturar_dte');

DROP INDEX IF EXISTS pago_idempotency_key_unique;
DROP INDEX IF EXISTS factura_numero_dte_unique;
ALTER TABLE pago DROP COLUMN IF EXISTS idempotency_key;
