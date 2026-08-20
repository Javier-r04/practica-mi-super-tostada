DELETE FROM "usuario_permiso"
WHERE "permiso_id" IN (
  SELECT "id" FROM "permiso"
  WHERE "codigo" IN ('mensajeria.enviar', 'mensajeria.conectar')
);
DELETE FROM "permiso"
WHERE "codigo" IN ('mensajeria.enviar', 'mensajeria.conectar');

DROP TABLE IF EXISTS "plantilla_proposito";
DROP TABLE IF EXISTS "conexion_waba";
DROP INDEX IF EXISTS conversacion_cliente_id_unique;
ALTER TABLE cliente DROP COLUMN IF EXISTS token_portal_cifrado;
