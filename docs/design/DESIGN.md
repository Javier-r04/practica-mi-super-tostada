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
3. **Sin gradientes decorativos, sin `backdrop-filter`, sin emoji.** Sobre foto va degradado de protección (`--scrim-*`), no cápsula translúcida. En gráficas del Tablero: ejes ≥12 px, leyenda con palabras junto a cada color, sin donut para 2–3 partes.
4. **Nada rebota.** 130 ms controles, 200 ms superficies, 320 ms máximo, `--ease-out`. Press = `scale(.985)`.
5. **Hover cambia color, no opacidad.** Opacidad solo indica deshabilitado (`.45`).
6. **Foco siempre visible** (`--shadow-focus`). Se trabaja con teclado a las 23:00.
7. **Cifras tabulares** en toda columna de números (`font-variant-numeric: tabular-nums`).
8. **13 px es el mínimo en texto interactivo.** 14 px de cuerpo. Rótulos 12 px solo en versalitas. Ejes de gráfica en pantalla: mínimo 12 px.

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
| **Hoy** | Tarjeta `brand` con el **monto de la noche** en display amarillo (`text-acento`) y hint de snapshot. Debajo, 4 KPI blancos: pedidos capturados, libras de tortilla, por cobrar, mensajes en outbox. Chips de ruta con `EstadoBadge` + conteo. Lista de pedidos de la noche (recorte 8, meta "8 de N"): filas `min-h-fila` con `ClienteAvatar` (join a `/clientes`), `#correlativo` mono, `EstadoBadge`, `Money`, deep link `?pedidoId=`. "Aún no piden" y "Clientes al límite" enlazan a `/clientes/{id}` (ficha, no bandeja). Tarjeta `accent` de cierre con la única acción amarilla: "Cerrar ventana y generar hoja" → `Dialog`. Error de red con toast + reintento; refetch con `aria-busy` sin atenuar el CTA |
| **Tablero** | Recorte de cierre (Hoy / Semana / Quincena vía `SegmentedControl`; fechas y droplists detrás de **Filtros** como Cartera). Un solo amarillo: "Descargar cierre de quincena". Hasta 5 KPIs con anclas únicas; una métrica `brand` (ventas, o por cobrar si el recorte es un día) en display amarillo. Gráficas SVG/HTML propias (sin librería): ejes ≥12 px, fecha corta GT (`21 ago`), leyenda con palabras, tooltip HTML en la línea de ventas; cobrado en barras apiladas con leyenda Efectivo/Transferencia; participación top 5 + Otros con `ClienteAvatar` y link a ficha; productos agrupados por familia con `EstadoBadge` de carga y cantidad en display; antigüedad en cuatro losetas (15+ / 31+ con rótulo de peligro); ruta = chips de conteo, adopción = medidor apilado con % escrito (**no** donut de 2–3 partes). Salud de clientes y "Aún no piden" como filas táctiles con avatar. Sin `backdrop-filter` |
| **Pedidos** | Master-detail 340 px + resto (como Conversaciones). Chrome compacto: **Capturar pedido** (único amarillo) + `SearchField` (cliente, correlativo, alias) + `SegmentedControl` Todos/Vivos/Anulados + `DateField` de `fecha_operacion`. Filas `min-h-fila` con `ClienteAvatar` (join), correlativo mono, `EstadoBadge`, `focus-visible:shadow-foco`, `aria-current`. Deep link `?pedidoId=` (Hoy y ficha de cliente). Detalle: avatar + link a `/clientes/{id}`, teléfono accionable, notas permanentes; ítems con `ProductoThumb` (join) y `QuantityStepper` en `CONFIRMADO` con permiso; **una barra sucia** "Guardar cambios" (ítems + notas) que no se pisa si SSE llega con el mismo id y hay dirty; toast al 2xx; historial como "Quién hizo qué" (no filtrar `audit_log` al usuario). Captura MANUAL: reset al cerrar/cambiar cliente; favoritos ("Lo que pide siempre") arriba; aviso de límite con `ContadorFacturas`; thumb + alias principal. Anular → `Dialog` `danger` con motivo; footer "Cancelar" / "Anular pedido" |
| **Producción** | Hoja agrupada por punto de carga, con encabezado de grupo. Filas nuevas de la v2 con fondo `--yellow-100` y badge "nuevo en v2". Cantidades en tipografía display. Aviso de reapertura con motivo. Consolidado que recibe Alex como `MensajePreview`. Recordatorio de las reglas: sábado todo sale de planta; la hoja no se materializa hasta el cierre |
| **Cartera** | Tres métricas (facturas pendientes con límite, cobrado hoy, reportado por reparto). Tabs Todas / Pendientes / Vencidas. Tabla: DTE monoespaciado, cliente, pedido, emitida, monto, abonado, **saldo** coloreado por estado, estado, acción. Registrar pago → `Dialog` con saldo, monto (abono parcial permitido), método y comprobante |
| **Conversaciones** | Lista con no leídos y `VentanaBadge` de 24 h por conversación. Hilo sobre `--cream-100`: salientes como `MensajePreview`, entrantes en burbuja verde alineada a la derecha. **Ventana abierta →** redactor libre + "Redactar con IA". **Ventana cerrada →** redactor bloqueado, `Toast` explicando el 131047, selector de plantillas aprobadas y preview renderizado |
| **Catálogo** | Tabla plana de ~40 SKU: SKU, nombre canónico, familia, unidad, punto de carga, alias frecuente, precio base, acceso a precios por cliente. Sin matriz de variantes |

### 6.2 Portal del cliente (`/p/{token}`, `ui_kits/portal/`)

Casa del restaurante: **Inicio · Pedir · Pedidos · Cuenta**. Sin login; token opaco en la URL. Chrome propio (header verde a sangre), no sidebar del panel. Responsive móvil y escritorio.

**Rutas**

| Ruta | Pantalla |
|---|---|
| `/p/{token}` | Inicio: saludo (tardes/noches desde el servidor), ventana, entrega, losetas (pedido de esta noche, cuenta, último pedido), CTA |
| `/p/{token}/pedir` | Catálogo → resumen → confirmado (pasos locales). Fotos vía `GET /p/{token}/assets/:id` |
| `/p/{token}/pedidos` | Historial (últimos 20 + cargar más). Incluye MANUAL y ANULADO |
| `/p/{token}/pedidos/[id]` | Detalle propio; 404 genérico si no es suyo |
| `/p/{token}/cuenta` | Facturas pendientes (informativo; el portal no cobra) |

**Móvil (< lg)**

- Header 56 px verde: Wordmark compact onBrand + nombre del cliente.
- Bottom nav 64 px: Inicio · Pedir · Pedidos · Cuenta (`aria-current`). Pedir puede badge con nº de líneas.
- En catálogo: footer sticky encima de la bottom nav con total + CTA amarilla “Revisar pedido”.
- Toasts anclados sobre la barra.

**Escritorio (lg+)**

- Mismo header a ancho completo; nav **horizontal** bajo el header.
- Contenido `max-w-[var(--page-max)]` centrado, canal 24 px.
- `/pedir`: grid de productos + columna sticky (~320 px) con resumen vivo y CTA.

**Reglas de contenido**

- Bloque verde de contexto: `VentanaBadge` + countdown + copy de entrega.
- **“Lo que pide siempre”** (favoritos) antes del resto agrupado por familia; búsqueda por alias/canónico.
- Alias = nombre principal; canónico en 12 px. Nunca SKU ni punto de carga.
- Cantidades enteras; stepper `lg` en móvil.
- Límite de crédito: **avisar, no bloquear**.
- Confirmación: tarjeta `brand` + texto WhatsApp; “Editar mi pedido” mientras la ventana esté abierta.
- Un solo amarillo por pantalla. Copy en usted. Sin emoji. Sin PWA del cliente (`manifest: null`).

### 6.3 App de reparto (PWA móvil, `ui_kits/reparto/`)

- El chrome del panel es claro (decisión 2026-08); el filo de 4 px en cada parada es el acento de ruta (amarillo pendiente / verde entregado), no el header.
- `OfflineBanner` inmediatamente bajo el topbar (devuelve `null` cuando hay señal y la cola está vacía). Es el único autorizado a decir "guardado" con dato en el teléfono; la lista de cola al pie solo muestra reintentos con error.
- **Ruta:** tarjetas al estilo `ClienteMiniCard` (avatar/iniciales, nombre `text-pretty`, hora display tabular, `#correlativo` mono, métricas con radio concéntrico), ordenadas por horario fijo, badge `SIN_SINCRONIZAR` por parada. KPI "Cobrado hoy" (no duplicar la fecha del chrome). Filtro compacto pendientes/entregados si hay muchas paradas.
- **Entrega:** cabecera con avatar, notas permanentes si existen, llamar a 52 px; ajuste de `cantidad_entregada` con steppers de 52 px + thumb de producto; contador de ajustes y total al pie; tarjeta `accent` de saldo anterior con acceso al cobro (`secondary`/`primary`, nunca segundo amarillo). CTA fija "Marcar como entregado" / "Guardar en este teléfono" sobre la bottom nav. Saldo 0 tras entregar → vuelve a ruta.
- **Cobro:** monto prellenado con el saldo (abono parcial permitido), método en `SegmentedControl`, zona de foto de comprobante, aviso si no hay señal. Tras éxito vuelve a la ruta con badge de cola. El diálogo usa `accent` como Cartera (otra superficie).
- **Cierre del día:** fuera de alcance de esta pantalla (cuadre).
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
