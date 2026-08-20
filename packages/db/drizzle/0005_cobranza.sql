-- Cobranza: idempotencia de pago y DTE único.
-- Nada se borra. Índices parciales para nulos.

ALTER TABLE pago ADD COLUMN idempotency_key text;

CREATE UNIQUE INDEX pago_idempotency_key_unique
  ON pago (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE UNIQUE INDEX factura_numero_dte_unique
  ON factura (numero_dte)
  WHERE numero_dte IS NOT NULL;

INSERT INTO "permiso" ("codigo", "descripcion")
VALUES
  ('pedidos.entregar', 'Marcar un pedido como entregado y ajustar cantidades'),
  ('cobranza.capturar_dte', 'Registrar el número de DTE del sistema externo')
ON CONFLICT ("codigo") DO NOTHING;
