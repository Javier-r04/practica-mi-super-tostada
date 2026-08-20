# UI kit · App de reparto (PWA)

Tony, en la calle, con guantes y señal irregular. Todo aquí gira alrededor de una regla: nunca mostrar éxito sin confirmación del servidor.

## Pantallas
| Archivo | Pantalla | Qué demuestra |
|---|---|---|
| `RepartoScreens.jsx` → `RutaScreen` | Ruta de hoy | Entregas ordenadas por horario fijo, saldo anterior por cobrar, marca de cola pendiente |
| `RepartoScreens.jsx` → `EntregaScreen` | Entrega | Ajuste de `cantidad_entregada` con steppers de 52 px; la factura se calcula sobre lo entregado |
| `RepartoScreens.jsx` → `CobroScreen` | Cobro | Monto (abono parcial permitido), método, foto de comprobante y aviso honesto si no hay señal |
| `index.html` → `HistorialScreen` | Cierre del día | Totales del turno y la cola local con su estado de sincronización |

## Cómo correrlo
Abre `index.html` y usa el interruptor **con señal / sin señal** de la barra superior para ver las dos versiones de cada confirmación.

## Notas de diseño
- `OfflineBanner` es el único elemento autorizado a decir "guardado" cuando el dato aún está en el teléfono.
- Áreas táctiles de 52 px en las acciones de la calle.
- Las cifras usan tipografía display para leerse de un vistazo, de pie y a contraluz.
