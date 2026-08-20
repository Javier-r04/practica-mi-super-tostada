# DESIGN.md · Sistema de Pedidos y Cobranza · Mi Súper Tostada

Guía de implementación visual. `readme.md` explica **qué es** la marca; este archivo dice **cómo se construye cada pantalla**. Si algo aquí contradice una suposición, este archivo gana; si contradice `CLAUDE.md` (dominio), gana `CLAUDE.md`.

---

## 1. Cómo se consume el sistema

En producción (Next.js 16 + Tailwind v4), la vía correcta es:

1. Importar `apps/web/src/styles/styles.css` una vez desde el layout raíz (`globals.css`) — trae los tokens como custom properties.
2. Cargar **IBM Plex Sans** y **IBM Plex Mono** self-hosted (`@fontsource` en el layout raíz). No hay `@import` de Google Fonts ni `next/font/google` (el build no depende de fonts.gstatic.com).
3. Mapear los tokens en `tailwind.config.ts` **y** en `@theme inline` de `globals.css` (Tailwind v4 no lee solo el config clásico):

```js
theme: { extend: {
  colors: {
    marca:   { DEFAULT: 'var(--green-800)', hover: 'var(--green-700)', prof: 'var(--green-900)' },
    acento:  { DEFAULT: 'var(--yellow-400)', fuerte: 'var(--yellow-500)' },
    tinta:   { 900:'var(--ink-900)', 800:'var(--ink-800)', 500:'var(--ink-500)', 200:'var(--ink-200)', 50:'var(--ink-50)' },
  },
  borderRadius: { campo:'var(--radius-sm)', tarjeta:'var(--radius-lg)' },
  boxShadow:    { tarjeta:'var(--shadow-sm)', modal:'var(--shadow-lg)' },
  fontFamily:   { display:['var(--font-core)'], core:['var(--font-core)'], mono:['var(--font-mono)'] },
}}
```

4. Los componentes de `docs/design/components/` son **referencia de apariencia**, no librería de producción: se reimplementan como componentes shadcn/ui con estos valores exactos. Copia los números, no los redondees. Iconos: `lucide-react`, no el CDN.

**Chrome del panel (2026-08):** la barra lateral es **clara** (`--surface-nav`), no verde a sangre. El verde profundo queda para el sello MST, las tarjetas `brand` de resumen, el portal del cliente y el encabezado de reparto. El ítem activo lleva filo `--nav-rail` (amarillo) sobre `--surface-nav-active`.

**Regla de oro:** ningún color, radio, sombra ni tamaño de fuente literal en el código de pantalla. Si necesitas un valor que no existe como token, falta un token.

---

## 2. Tokens que importan de verdad

| Necesidad | Token | Valor |
|---|---|---|
| Verde de marca (interfaz) | `--green-800` | `#0E4E15` |
| Verde hover | `--green-700` | `#136220` |
| Verde profundo (barras, velo) | `--green-900` | `#062E0A` |
| Acento / acción principal | `--yellow-400` | `#FFE100` |
| Texto | `--ink-800` | `#282A20` |
| Texto apagado | `--ink-500` | `#767A69` |
| Borde de tarjeta | `--ink-200` | `#DEDFD6` |
| Fondo de página | `--ink-50` | `#F7F7F4` |
| Barra lateral (panel) | `--surface-nav` | blanco |
| Ítem de nav activo | `--surface-nav-active` | `--green-50` |
| Filo de nav activo | `--nav-rail` | `--yellow-400` |
| Papel (lectura/impresión) | `--cream-300` | `#F6F1E4` |
| Vencido / anulado | `--red-600` | `#B3231C` |
| Pendiente / cola offline | `--amber-600` | `#C77A02` |
| Informativo | `--blue-600` | `#1D6A8C` |

Estados de dominio: **nunca** los pintes a mano, usa `--estado-*` y `--carga-*` (o el componente `EstadoBadge`).

```
BORRADOR → gris   CONFIRMADO → azul   EN_PRODUCCION → oro
ENTREGADO/PAGADO → verde   PENDIENTE/ABONO_PARCIAL/SIN_SINCRONIZAR → ámbar
VENCIDO → rojo    ANULADO → gris apagado
PLANTA → verde    DEMOCRACIA → azul
```

Medidas fijas: barra superior 56 px · barra inferior 64 px · lateral 248 px · fila 52 px · campo 44 px · **mínimo táctil 44 px, 52 px en reparto** · canal 16 px móvil / 24 px escritorio.

---

## 3. Reglas visuales no negociables

1. **Un solo amarillo por pantalla.** Es la acción que cierra la noche, cobra, confirma o entra al panel. Todo lo demás es verde, contorno o fantasma.
2. **El verde profundo no es el chrome del panel.** Va a sangre en portal, reparto y tarjetas `brand` de resumen. Nunca como fondo de un formulario.
3. **Sin gradientes decorativos, sin `backdrop-filter`, sin emoji.** Sobre foto va degradado de protección (`--scrim-*`), no cápsula translúcida.
4. **Nada rebota.** 130 ms controles, 200 ms superficies, 320 ms máximo, `--ease-out`. Press = `scale(.985)`.
5. **Hover cambia color, no opacidad.** Opacidad solo indica deshabilitado (`.45`).
6. **Foco siempre visible** (`--shadow-focus`). Se trabaja con teclado a las 23:00.
7. **Cifras tabulares** en toda columna de números (`font-variant-numeric: tabular-nums`).
8. **13 px es el mínimo en texto interactivo.** 14 px de cuerpo. Rótulos 12 px solo en versalitas.

---

## 4. Copy

- Cliente: **usted**. Personal interno: imperativo ("Cerrar ventana y generar hoja").
- Botones = verbo + objeto. Nunca "Aceptar", "OK", "Enviar" a secas.
- Rótulos en versalitas, sustantivo sin artículo: `FECHA DE OPERACIÓN`.
- Dinero: `Q 1,240.50` siempre con dos decimales. Cantidades: `40 lb`, `12 bolsas`. Correlativos: `#1042` en monoespaciado. Horas 24 h.
- Vocabulario intacto: *papalinas*, *tortilla n.º 16*, *punto de carga*, *hoja de producción*, *fecha de operación*, *ventana*.
- **Honestidad de estado:** nada dice "listo/enviado/cobrado" antes de la confirmación del servidor. Si el dato está en el teléfono, el texto lo dice: *"Guardado en este teléfono. Se enviará al recuperar señal."*
- Errores: qué pasó y qué hacer. *"Meta rechazó el envío. Código 131047: fuera de la ventana de 24 h."*

---

## 5. Mapa de componentes → dominio

| Necesidad de dominio | Componente | Nota de uso |
|---|---|---|
| Mostrar un monto | `Money` | Recibe **centavos enteros**. Si tienes un decimal, el error está más arriba |
| Estado de pedido/factura/cola | `EstadoBadge` | Color fijado por enum |
| Ventana de pedido o de 24 h de Meta | `VentanaBadge` | La verdad la calcula el servidor |
| Ítem de pedido | `PedidoItemRow` | Nombre y precio **snapshot** + alias del cliente; `editable` dentro de la ventana |
| Contador de cobranza | `ContadorFacturas` | Cuenta **facturas** contra el límite del cliente |
| Vista previa de WhatsApp | `MensajePreview` | Obligatoria antes de enviar, con variables ya renderizadas |
| Capturar cantidad | `QuantityStepper` | `step=0.5` en LIBRA, `1` en BOLSA/UNIDAD |
| Método de pago | `RadioGroup` | 2 segmentos táctiles con icono |
| Estado de conexión | `OfflineBanner` | Único elemento autorizado a decir "guardado" con el dato en el teléfono |
| Confirmar algo irreversible | `Dialog` + `Textarea` | Motivo obligatorio → `audit_log` |
| Resultado de una acción | `Toast` | `exito` solo con confirmación del servidor |

Primitivas: `Button`, `Icon`, `Card`, `Badge`, `Tag`, `Tabs`, `Input`/`Field`, `Textarea`, `Select`, `Checkbox`, `Switch`, `SearchField`, `EmptyState`, `TopBar`/`BackButton`, `SidebarNav`, `BottomNav`.

---

## 6. Especificación por superficie

### 6.1 Panel interno (escritorio, `ui_kits/panel/`)

Estructura: `SidebarNav` clara (248 px, `--surface-nav`) + barra superior blanca de 56 px con **título · fecha de operación · `VentanaBadge`** + `main` con canal de 16 px móvil / 24 px escritorio sobre `--ink-50`, ancho máximo `--page-max`. En `< lg` la lateral se convierte en cajón; abajo, `BottomNav` de 64 px con las vistas vivas.

La navegación lista **todas** las vistas del sistema. Las que aún no existen se muestran deshabilitadas con el rótulo `Pronto` (no se esconden: el producto no debe parecer un CRUD de dos páginas).

`GET /calendario/ahora` alimenta la fecha de operación y el `VentanaBadge` del chrome. La verdad la calcula `BusinessCalendar` en el servidor; el navegador no usa `new Date()` para esto.

| Vista | Contenido obligatorio |
|---|---|
| **Hoy** | 4 métricas (pedidos capturados, libras de tortilla, por cobrar, outbox). Una tarjeta `brand` con el monto en display amarillo. Lista de pedidos de la noche. Tarjeta `accent` de cierre con la única acción amarilla: "Cerrar ventana y generar hoja" → `Dialog` con conteo de confirmados, borradores que quedan fuera y mensajes a enviar. Clientes al límite de crédito |
| **Pedidos** | Lista maestra (buscador por cliente, alias o correlativo) + detalle: cabecera con cliente, estado, origen PORTAL/MANUAL, entrega fija, contacto y nota permanente; ítems con `QuantityStepper` mientras la ventana esté abierta; total al pie; notas del administrador; historial de `audit_log` con hora y actor. Anular → `Dialog` `danger` con motivo |
| **Producción** | Hoja agrupada por punto de carga, con encabezado de grupo. Filas nuevas de la v2 con fondo `--yellow-100` y badge "nuevo en v2". Cantidades en tipografía display. Aviso de reapertura con motivo. Consolidado que recibe Alex como `MensajePreview`. Recordatorio de las reglas: sábado todo sale de planta; la hoja no se materializa hasta el cierre |
| **Cartera** | Tres métricas (facturas pendientes con límite, cobrado hoy, reportado por reparto). Tabs Todas / Pendientes / Vencidas. Tabla: DTE monoespaciado, cliente, pedido, emitida, monto, abonado, **saldo** coloreado por estado, estado, acción. Registrar pago → `Dialog` con saldo, monto (abono parcial permitido), método y comprobante |
| **Conversaciones** | Lista con no leídos y `VentanaBadge` de 24 h por conversación. Hilo sobre `--cream-100`: salientes como `MensajePreview`, entrantes en burbuja verde alineada a la derecha. **Ventana abierta →** redactor libre + "Redactar con IA". **Ventana cerrada →** redactor bloqueado, `Toast` explicando el 131047, selector de plantillas aprobadas y preview renderizado |
| **Catálogo** | Tabla plana de ~40 SKU: SKU, nombre canónico, familia, unidad, punto de carga, alias frecuente, precio base, acceso a precios por cliente. Sin matriz de variantes |

### 6.2 Portal del cliente (móvil 390 px, `ui_kits/portal/`)

- URL `/p/{token}`, sin login. Barra superior verde con el logotipo y el nombre del cliente.
- Bloque verde de contexto: `VentanaBadge` con cuenta atrás + "Su pedido llega el jueves 20 a las 08:30".
- **Sección "Lo que pide siempre"** (favoritos) antes del catálogo completo.
- El **alias del cliente es el nombre principal**; el nombre canónico va como apoyo en 12 px. La traducción a nomenclatura de producción no se muestra nunca.
- Pie fijo con número de productos, total y acción amarilla "Revisar pedido".
- Resumen: ítems con precio snapshot + tarjeta `paper` de estado de cuenta con el límite de facturas.
- Confirmación: tarjeta `brand` con título display amarillo, correlativo, `EstadoBadge` y el mensaje de WhatsApp tal como llegará. "Editar mi pedido" disponible hasta la medianoche.

### 6.3 App de reparto (PWA móvil, `ui_kits/reparto/`)

- Barra superior verde + `OfflineBanner` inmediatamente debajo (devuelve `null` cuando hay señal y la cola está vacía).
- **Ruta:** tarjetas ordenadas por horario fijo, filo izquierdo de 4 px (amarillo pendiente / verde entregado), hora en display, zona con `map-pin`, saldo anterior en ámbar, marca `SIN_SINCRONIZAR` si hay algo en cola.
- **Entrega:** ajuste de `cantidad_entregada` con steppers de 52 px; contador de ajustes y total al pie; tarjeta `accent` de saldo anterior con acceso al cobro. La factura se calcula sobre lo entregado.
- **Cobro:** monto prellenado con el saldo (abono parcial permitido), método en `RadioGroup`, zona de foto de comprobante, aviso si no hay señal. El botón cambia de rótulo: "Guardar cobro" / "Guardar en este teléfono".
- **Cierre del día:** totales del turno y cola local con `idempotency_key` por acción.
- Toasts anclados sobre la barra inferior, no en la esquina.

---

## 7. Estados que hay que diseñar siempre

Para cada pantalla, cuatro estados. Ninguno se improvisa en producción:

1. **Vacío** — `EmptyState` con título de lo que pasa y descripción de lo que sigue ("La ventana abre a las 15:00").
2. **Cargando** — esqueleto gris `--ink-100` con las mismas alturas de fila; nunca un spinner centrado en toda la pantalla.
3. **Error** — `Toast` `error` con causa y acción de recuperación.
4. **Sin permiso** — el control se muestra deshabilitado con `hint` explicando quién puede ("Solo ADMIN_JEFE puede cambiar precios"), no se esconde.

Estados extra propios de este sistema: **ventana cerrada** (captura bloqueada, mensaje explícito), **día reabierto** (badge ámbar en la hoja), **cliente sobre el límite** (contador rojo y aviso antes de despachar), **cola offline pendiente** (banner + badge por fila).

---

## 8. Accesibilidad y condiciones reales de uso

- Contraste mínimo AA: texto sobre `--green-800` en blanco; amarillo **solo** con texto `--green-900` encima, nunca blanco.
- Nada depende solo del color: cada estado lleva rótulo de texto.
- Área táctil 44 px mínimo; 52 px cuando la mano lleva guante.
- Se usa de noche en escritorio y a contraluz en la calle: por eso cifras en display y fondos claros, no tema oscuro.
- `prefers-reduced-motion` reduce todas las duraciones a 0.
- Todo el foco visible; el orden de tabulación sigue el orden de captura del pedido.

---

## 9. Impresión (hoja de producción)

Único artefacto impreso del sistema. Alex la lee de madrugada, de pie:

- Papel carta, vertical, márgenes de 12 mm. Fondo blanco, tinta negra + verde para encabezados de grupo.
- Encabezado: logotipo pequeño, `fecha_operacion` en display, versión de la hoja y hora de generación.
- Agrupado por **punto de carga**; dentro, por familia. Producto a 14 pt, cantidad a 24 pt en display, unidad a 10 pt.
- Cambios de la v2 con fondo gris y marca `NUEVO`, no con color que se pierda en fotocopia.
- Sin tablas con líneas verticales; separadores horizontales de 0.5 pt.

---

## 10. Checklist antes de dar por terminada una pantalla

- [ ] Ningún hex, radio o sombra literal: todo por token.
- [ ] Una sola acción amarilla.
- [ ] Todo monto pasa por `Money` y viene en centavos.
- [ ] Todo estado usa `EstadoBadge` o los tokens `--estado-*`.
- [ ] Nada dice "listo" sin confirmación del servidor.
- [ ] Áreas táctiles ≥ 44 px (≥ 52 px en reparto).
- [ ] Vacío, cargando, error y sin permiso resueltos.
- [ ] Copy en usted para cliente, imperativo para interno, sin emoji.
- [ ] Foco visible y navegable con teclado.
- [ ] Toda acción irreversible pide motivo y queda en `audit_log`.

---

## 11. Pendientes de marca (bloquean producción)

1. **Logotipo vectorial** (SVG/AI/EPS), versión sobre fondo claro y monocromática. Lo que hay es un recorte de 180×172 px con fondo verde incrustado.
2. **Archivos de fuente originales.** En producto: IBM Plex Sans + IBM Plex Mono vía `@fontsource`. Anton y Kaushan Script quedan para material promocional y **no se cargan** en la app.
3. **Set de iconos propio**, si existe. Hoy: `lucide-react`, trazo 2 px, accedido solo por el componente `Icon`.
4. **Fotografía en alta resolución** de planta, producto y equipo. Los recortes de `apps/web/public/brand/` son referencia de tono.
5. **Favicon, ícono de PWA y pantalla de arranque** — dependen del punto 1.
