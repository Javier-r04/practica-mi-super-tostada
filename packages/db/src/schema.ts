/**
 * Esquema Drizzle. Las tablas de dominio (pedido, factura, outbox, …)
 * se agregan en el siguiente hito.
 *
 * Nada se borra: usar `activo` o `anulado_at`. Un DELETE de filas de
 * negocio es un error de diseño.
 */

export {};
