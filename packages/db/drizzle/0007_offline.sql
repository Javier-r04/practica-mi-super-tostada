-- E8: idempotencia de entrega con key de cliente (cola offline).
-- Nada se borra. Índice parcial para nulos.

ALTER TABLE pedido ADD COLUMN entrega_idempotency_key text;

CREATE UNIQUE INDEX pedido_entrega_idempotency_key_unique
  ON pedido (entrega_idempotency_key)
  WHERE entrega_idempotency_key IS NOT NULL;
