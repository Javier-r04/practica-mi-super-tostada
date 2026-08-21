# UI kit · Portal del cliente

Vista pública en `/p/{token}`: sin login, sin app que instalar, pensada para un teléfono a las 22:00 con el restaurante cerrando. También usable en escritorio (nav horizontal + grid).

## Pantallas (producto)

| Ruta | Pantalla |
|---|---|
| `/p/{token}` | **Inicio** — saludo, ventana, entrega, losetas (pedido de esta noche / cuenta / último pedido), CTA |
| `/p/{token}/pedir` | **Pedir** — catálogo → resumen → confirmado (pasos locales) |
| `/p/{token}/pedidos` | **Historial** — últimos 20 + cargar más |
| `/p/{token}/pedidos/[id]` | **Detalle** de un pedido propio |
| `/p/{token}/cuenta` | **Cuenta** — facturas pendientes (no cobra) |

## Kit estático (referencia visual)

| Archivo | Pantalla | Qué demuestra |
|---|---|---|
| `PortalScreens.jsx` → `PortalCatalogo` | Catálogo | "Lo que pide siempre" (favoritos) arriba, alias del cliente como nombre principal, nombre canónico como apoyo, stepper táctil, total flotante |
| `PortalScreens.jsx` → `PortalResumen` | Revisar pedido | Ítems con precio snapshot, estado de cuenta y límite de facturas pendientes |
| `PortalScreens.jsx` → `PortalConfirmado` | Confirmación | Confirmación en verde marca y el mensaje de WhatsApp tal como llegará |

## Cómo correrlo
Abre `index.html` (390 px, marco de teléfono simple). El flujo del kit es catálogo → resumen → confirmado. La app real añade Inicio, historial, cuenta y nav.

## Notas de diseño
- El cliente ve **sus** nombres. La traducción a nomenclatura de producción es interna y no se muestra.
- La ventana con cuenta atrás define si puede pedir o no.
- Un solo catálogo con alias y favoritos por cliente; no hay portales distintos por cliente.
- Header verde a sangre; bottom nav móvil / nav horizontal desktop.
- Fotos de producto vía endpoint del portal (no cookie de staff).
