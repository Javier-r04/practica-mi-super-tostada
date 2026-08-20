# UI kit · Portal del cliente

Vista pública en `/p/{token}`: sin login, sin app que instalar, pensada para un teléfono a las 22:00 con el restaurante cerrando.

## Pantallas
| Archivo | Pantalla | Qué demuestra |
|---|---|---|
| `PortalScreens.jsx` → `PortalCatalogo` | Catálogo | "Lo que pide siempre" (favoritos) arriba, alias del cliente como nombre principal, nombre canónico como apoyo, stepper táctil, total flotante |
| `PortalScreens.jsx` → `PortalResumen` | Revisar pedido | Ítems con precio snapshot, estado de cuenta y límite de facturas pendientes |
| `PortalScreens.jsx` → `PortalConfirmado` | Confirmación | Confirmación en verde marca y el mensaje de WhatsApp tal como llegará |

## Cómo correrlo
Abre `index.html` (390 px, marco de teléfono simple). El flujo es catálogo → resumen → confirmado, con "Editar mi pedido" de vuelta.

## Notas de diseño
- El cliente ve **sus** nombres. La traducción a nomenclatura de producción es interna y no se muestra.
- La ventana con cuenta atrás es lo primero de la pantalla: define si puede pedir o no.
- Un solo catálogo con alias y favoritos por cliente; no hay portales distintos por cliente.
