ALTER TABLE "pedido_item" DROP CONSTRAINT IF EXISTS "pedido_item_bono_id_cliente_bono_id_fk";
ALTER TABLE "pedido_item" DROP COLUMN IF EXISTS "bono_id";
ALTER TABLE "pedido_item" DROP COLUMN IF EXISTS "es_devolucion";
DROP TABLE IF EXISTS "cliente_bono";
