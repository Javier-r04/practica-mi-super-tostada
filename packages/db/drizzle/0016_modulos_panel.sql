-- Visibilidad del panel por módulos (panel.*).
-- El acceso deja de venir del preset del rol: se materializa en usuario_permiso.

INSERT INTO "permiso" ("codigo", "descripcion") VALUES
  ('panel.hoy', 'Ver el módulo Hoy'),
  ('panel.tablero', 'Ver el módulo Tablero'),
  ('panel.pedidos', 'Ver el módulo Pedidos'),
  ('panel.produccion', 'Ver el módulo Producción'),
  ('panel.reparto', 'Ver el módulo Reparto'),
  ('panel.cartera', 'Ver el módulo Cartera'),
  ('panel.conversaciones', 'Ver el módulo Conversaciones'),
  ('panel.catalogo', 'Ver Catálogo y clientes')
ON CONFLICT ("codigo") DO NOTHING;
--> statement-breakpoint

-- Núcleo operativo: antes lo veía cualquiera autenticado.
INSERT INTO "usuario_permiso" ("usuario_id", "permiso_id", "granted_by")
SELECT u."id", p."id", NULL
FROM "usuario" u
CROSS JOIN "permiso" p
WHERE u."rol" <> 'ADMIN_JEFE'
  AND p."codigo" IN (
    'panel.hoy',
    'panel.tablero',
    'panel.pedidos',
    'panel.produccion',
    'panel.reparto',
    'panel.cartera'
  )
ON CONFLICT DO NOTHING;
--> statement-breakpoint

-- Materializar el preset del rol (acciones) para que quitar un módulo sí quite acceso.
INSERT INTO "usuario_permiso" ("usuario_id", "permiso_id", "granted_by")
SELECT u."id", p."id", NULL
FROM "usuario" u
JOIN "permiso" p ON p."codigo" = ANY (
  CASE u."rol"
    WHEN 'ADMIN' THEN ARRAY[
      'catalogo.escribir',
      'pedidos.capturar_manual',
      'pedidos.entregar',
      'cobranza.registrar_pago',
      'cobranza.capturar_dte',
      'cobranza.confirmar_transferencia',
      'ventana.cerrar',
      'mensajeria.enviar',
      'panel.conversaciones',
      'panel.catalogo'
    ]::text[]
    WHEN 'TIENDA' THEN ARRAY[
      'pedidos.capturar_manual',
      'pedidos.entregar',
      'cobranza.capturar_dte',
      'cobranza.registrar_pago'
    ]::text[]
    WHEN 'REPARTO' THEN ARRAY[
      'pedidos.entregar',
      'cobranza.registrar_pago'
    ]::text[]
    ELSE ARRAY[]::text[]
  END
)
WHERE u."rol" <> 'ADMIN_JEFE'
ON CONFLICT DO NOTHING;
