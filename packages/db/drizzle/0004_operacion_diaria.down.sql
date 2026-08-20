DELETE FROM "usuario_permiso"
WHERE "permiso_id" IN (SELECT "id" FROM "permiso" WHERE "codigo" = 'ventana.cerrar');
DELETE FROM "permiso" WHERE "codigo" = 'ventana.cerrar';

ALTER TABLE "hoja_produccion" DROP CONSTRAINT IF EXISTS "hoja_produccion_generado_por_usuario_id_fk";
ALTER TABLE "hoja_produccion" DROP CONSTRAINT IF EXISTS "hoja_produccion_organizacion_id_organizacion_id_fk";
DROP TABLE IF EXISTS "hoja_produccion";

ALTER TABLE "dia_operacion" DROP CONSTRAINT IF EXISTS "dia_operacion_reabierto_por_usuario_id_fk";
ALTER TABLE "dia_operacion" DROP CONSTRAINT IF EXISTS "dia_operacion_cerrado_por_usuario_id_fk";
ALTER TABLE "dia_operacion" DROP CONSTRAINT IF EXISTS "dia_operacion_organizacion_id_organizacion_id_fk";
DROP TABLE IF EXISTS "dia_operacion";

DROP TYPE IF EXISTS "public"."dia_operacion_estado";
