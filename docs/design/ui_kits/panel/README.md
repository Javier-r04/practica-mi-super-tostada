# UI kit · Panel interno

Panel de escritorio para Cristian (ADMIN_JEFE), Carla (tienda) y Alex (producción). Cubre el trabajo nocturno completo: capturar, cerrar la ventana, generar hoja, cobrar y hablar con el cliente.

## Pantallas
| Archivo | Pantalla | Qué demuestra |
|---|---|---|
| `HoyScreen.jsx` | Hoy | Métricas de la noche, pedidos entrantes, cierre de ventana con confirmación y clientes al límite de crédito |
| `PedidosScreen.jsx` | Pedidos | Lista + detalle, edición de ítems dentro de la ventana, anulación con motivo, historial de `audit_log` |
| `ProduccionScreen.jsx` | Producción | Hoja consolidada agrupada por punto de carga, versión 2 con cambios resaltados, consolidado que recibe Alex |
| `ProduccionScreen.jsx` | Conversaciones | Ventana de 24 h: composer libre cuando está abierta, selector de plantillas cuando está cerrada, preview renderizado |
| `CarteraScreen.jsx` | Cartera | Tabla de facturas con saldo, abonos parciales, registro de pago con método y comprobante |
| `index.html` | Catálogo | ~40 SKU planos con familia, alias por cliente y precio base |

## Cómo correrlo
Abre `index.html`. Requiere `_ds_bundle.js` compilado en la raíz del proyecto (lo genera el compilador del sistema de diseño).

Datos de demostración en `data.js`. Nada llama a un servidor: es una recreación visual, no código de producción.

## Notas de diseño
- Barra lateral verde profundo, ítem activo con filo amarillo; el resto de la interfaz es blanca sobre `--surface-page`.
- La única acción amarilla por pantalla es la que cierra la noche.
- Todo monto viene en centavos y pasa por `Money`.
