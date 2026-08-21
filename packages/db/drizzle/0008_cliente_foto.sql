-- Foto de ficha del cliente (restaurante). Misma idea que producto.foto_asset_id.
-- Nada se borra: solo se añade columna nullable.

ALTER TABLE cliente ADD COLUMN foto_asset_id uuid;
