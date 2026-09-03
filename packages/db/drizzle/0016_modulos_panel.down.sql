-- Revierte grants de panel.* y el backfill del preset; no borra grants
-- otorgados a mano después (misma fila). Solo quita el catálogo panel.*.
DELETE FROM "usuario_permiso" up
USING "permiso" p
WHERE up."permiso_id" = p."id"
  AND p."codigo" LIKE 'panel.%';
--> statement-breakpoint
DELETE FROM "permiso" WHERE "codigo" LIKE 'panel.%';
