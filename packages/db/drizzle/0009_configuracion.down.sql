DELETE FROM permiso WHERE codigo IN ('audit.leer', 'ventana.configurar');
DROP INDEX IF EXISTS audit_log_created_at_idx;
DROP TABLE IF EXISTS ventana_semanal;
