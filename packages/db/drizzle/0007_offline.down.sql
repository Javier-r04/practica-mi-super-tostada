DROP INDEX IF EXISTS pedido_entrega_idempotency_key_unique;
ALTER TABLE pedido DROP COLUMN IF EXISTS entrega_idempotency_key;
