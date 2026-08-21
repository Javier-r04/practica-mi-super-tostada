# CLAUDE.md — Sistema de Pedidos y Cobranza · Mi Súper Tostada

Contexto operativo y reglas de este repositorio. Léelo completo antes de escribir código.
Si algo aquí contradice una suposición tuya, **este archivo gana**.

---

## 1. Qué es esto

Sistema web para una fábrica de tortillas, tostadas y frituras en Guatemala que vende al mayoreo
a restaurantes. Reemplaza dos procesos manuales:

1. **El pedido nocturno.** Hoy el encargado copia y pega el mismo mensaje de WhatsApp a cada
   cliente entre 21:00 y 24:00, traduce a mano los nombres comerciales a nomenclatura de
   producción, consolida todo y reenvía a producción, tienda y reparto.
2. **El cuaderno de cobros.** Hoy el control de quién pagó, cuánto y cómo se lleva en papel,
   transcribiendo lo que el repartidor reporta al final del día.

**El objetivo no es "digitalizar": es que nadie tenga que transcribir nada dos veces.**
Cuando dudes entre dos diseños, elige el que elimina una transcripción.

### Personas reales del sistema

| Nombre | Rol | Contexto que importa |
|---|---|---|
| Cristian | Administrador jefe | Hoy hace todo el trabajo nocturno. Es quien decide. |
| Alex | Producción | Arranca de madrugada. Solo le interesan las tortillas; ignora el resto del mensaje. |
| Carla | Tienda y facturación | Emite el DTE en un sistema externo y prepara los pedidos. |
| Tony | Reparto | En la calle, con celular y señal irregular. Conoce de memoria los horarios de entrega. |
| Restaurantes | Clientes | Piden tarde porque cierran tarde. Nunca van a instalar una app. |

---

## 2. Reglas duras (no negociables)

Estas producen bugs caros si se rompen. No las replantees.

### 2.1 Dinero
- **Siempre enteros en centavos.** `Q 12.50` → `1250`. Columna `integer` o `bigint`.
- **Nunca `float`, `double` ni `number` decimal** para montos, en ningún punto del stack.
- El formateo a `Q 12.50` ocurre **solo en la capa de presentación**, nunca en la base ni en la API.
- Redondeo bancario al calcular totales; documenta el criterio en el módulo de cálculo.

### 2.2 Precios y descripciones
- Cada `PedidoItem` guarda **snapshot** de `precio_unitario_centavos`, `nombre_mostrado` y
  `unidad_medida` en el momento de la captura.
- **Nunca** derives el total histórico de una relación viva al catálogo. Si Cristian sube precios
  en octubre, los cierres de septiembre deben seguir cuadrando al centavo.

### 2.3 Zona horaria
- Zona del negocio: `America/Guatemala` (UTC−6, sin horario de verano).
- Todo se guarda en `timestamptz` en UTC.
- **Toda** la lógica de fechas pasa por el módulo `BusinessCalendar`. Prohibido usar `new Date()`
  o `Date.now()` disperso para decisiones de negocio.
- Concepto formal: **`fecha_operacion`**. Los pedidos capturados dentro de la ventana del día D
  pertenecen a la entrega del siguiente día hábil. No es lo mismo que `created_at`.

### 2.4 Eliminación
- **Nada se borra.** Ni productos, ni clientes, ni pedidos, ni pagos.
- Se usa `activo: boolean` o `anulado_at: timestamptz` con motivo.
- Un `DELETE` en una migración o en un servicio es un error de diseño; busca la razón antes de escribirlo.

### 2.5 Idempotencia de mensajes
- Todo envío automático pasa por la tabla `outbox`, escrita **en la misma transacción** que el
  cambio de estado que lo origina.
- Constraint única sobre `(tipo, destinatario_id, fecha_operacion)`.
- Un reinicio del servidor no puede producir un mensaje duplicado ni uno perdido. Nunca.

### 2.6 Trazabilidad
- Dos tablas distintas, con propósitos distintos. **No las mezcles.**
  - `domain_events` — hechos de negocio. Los consume el sistema (otros módulos, integraciones futuras).
  - `audit_log` — quién hizo qué. Lo consultan las personas.
- `audit_log` es **append-only**. Sin `UPDATE`, sin `DELETE`, sin excepciones.
- Se registra **también el acceso de clientes al portal**, no solo sus pedidos. Sirve para
  responder "el cliente dice que sí pidió" con evidencia.

---

## 3. Stack

| Capa | Elección | Nota |
|---|---|---|
| Gestor de paquetes / tests / scripts | **Bun** | Aquí está el beneficio real |
| Runtime en producción | **Node.js LTS** | Ver §3.1 |
| API | **NestJS** | Monolito modular |
| Frontend | **Next.js (App Router) + React** | |
| Base de datos | **PostgreSQL** | |
| ORM | **Drizzle** | SQL explícito para las agregaciones del dashboard |
| Validación | **Zod** en `packages/shared` | Contrato único API ↔ formularios |
| Colas y cron | **pg-boss** | Sobre Postgres. **Sin Redis.** |
| Tiempo real | **SSE** (`@Sse()` de Nest) | No WebSockets |
| Archivos | **Cloudflare R2** | Subida directa con URLs prefirmadas |
| PDF | **@react-pdf/renderer** | **No Puppeteer.** Ver §3.2 |
| UI | **Tailwind + shadcn/ui** | Mobile-first |
| Estado cliente | **TanStack Query**, invalidado por SSE | |
| Formularios | **react-hook-form + Zod** | |
| Logs | **pino** estructurado | |
| Errores | **Sentry** | |
| Hash de contraseñas | **argon2id** | |

### 3.1 Bun sí, pero no como runtime

Bun + NestJS tiene fricción recurrente: Nest depende de decoradores legacy y
`emitDecoratorMetadata`, que es la superficie de compatibilidad más frágil de Bun. Han aparecido
regresiones que rompen los controladores entre versiones de parche.

Por eso:
- `bun install`, `bun test`, `bun run <script>` → **sí**.
- `bun src/main.ts` en producción → **no**, salvo decisión explícita posterior.
- Si algún día se migra el runtime: fijar versión **exacta** (sin `^`) en `package.json` y
  Dockerfile, y agregar un smoke test en CI que levante la app y consulte `/health`.

### 3.2 Nada de Chrome headless

Puppeteer/Playwright son ~400 MB de imagen y 200–300 MB de RAM en pico. El presupuesto de
infraestructura es de **US$20/mes**; eso obliga a subir de plan solo para generar un PDF.
`@react-pdf/renderer` es JS puro, dibuja SVG para las gráficas del dashboard y corre en proceso.

**No instales Puppeteer, Playwright ni Chromium** sin una discusión explícita.

---

## 4. Estructura del repositorio

```
apps/
  api/                    NestJS
    src/modules/
      identity/           usuarios, roles, permisos, sesiones
      catalog/            productos, clientes, alias, precios
      ordering/           pedidos, ventana, portal público
      fulfillment/        hoja de producción, entregas
      receivables/        facturas, pagos, cartera
      messaging/          WABA, plantillas, conversaciones, webhooks
      analytics/          dashboard, reportes, exportación
      shared/             outbox, event bus, BusinessCalendar, storage, audit
  web/                    Next.js (portal cliente + panel interno)
packages/
  shared/                 esquemas Zod, tipos, constantes de dominio
  db/                     esquema Drizzle y migraciones
```

### Fronteras de módulo

**Los módulos no se importan servicios entre sí.** Se comunican publicando eventos en `outbox`.

```
PedidoConfirmado        → messaging (confirmación al cliente)
VentanaPedidoCerrada    → fulfillment (genera hoja) · messaging (consolidado)
PedidoEntregado         → receivables (crea factura pendiente)
PagoRegistrado          → receivables (recalcula saldo) · analytics
LimiteCreditoExcedido   → messaging (alerta al admin)
```

Esto es lo que permite agregar producción y facturación electrónica después sin tocar lo existente.
Si te encuentras inyectando `OrderingService` dentro de `MessagingModule`, **para y publica un evento**.

---

## 5. Modelo de dominio

### Convención de nombres
**Sustantivos de dominio en español, todo lo técnico en inglés.**

```ts
// Correcto
class PedidoRepository { async findByFechaOperacion() {} }
const puntoCarga = 'PLANTA';

// Incorrecto
class OrderRepository {}        // pierde el vocabulario del negocio
const punto_de_carga_variable;  // mezcla convenciones
```

Razón: el vocabulario es específico y no traduce limpio (*papalinas*, *punto de carga*,
*tortilla número 16*). Traducirlo introduce ambigüedad en cada conversación con el cliente.

### Entidades

```
Organizacion            multi-tenant ligero: FK en tablas core, sin UI de gestión

Usuario                 username, password_hash, rol, activo
Rol                     ADMIN_JEFE | ADMIN | PRODUCCION | TIENDA | REPARTO
Permiso                 granular; ADMIN_JEFE puede delegar (ver §7)

Cliente                 nombre, contacto, telefono_wa, horario_entrega_fijo,
                        notas_permanentes, limite_facturas_pendientes,
                        token_portal_hash, activo

Producto                sku, nombre_canonico, familia, unidad_medida,
                        punto_carga, es_producido, foto_asset_id, orden, activo
                        unidad_medida: LIBRA | BOLSA | UNIDAD
                        punto_carga:   PLANTA | DEMOCRACIA

ClienteProducto         cliente_id, producto_id, alias, precio_centavos,
                        nota_produccion, favorito, orden
                        ↑ el alias es cómo lo llama ESE cliente ("tortilla grande")
                        ↑ nota_produccion: p.ej. "grosor especial" de Tabascos

Pedido                  correlativo (entero simple), fecha_operacion, cliente_id,
                        estado, origen, notas_admin, capturado_por
                        estado: BORRADOR|CONFIRMADO|EN_PRODUCCION|ENTREGADO|ANULADO
                        origen: PORTAL | MANUAL
PedidoItem              producto_id, cantidad_pedida, cantidad_entregada,
                        precio_unitario_centavos, nombre_mostrado, unidad_medida
                        ↑ los últimos tres son SNAPSHOT

Factura                 pedido_id, numero_dte (capturado por Carla), monto_centavos,
                        emitida_at
Pago                    factura_id, monto_centavos, metodo, fecha,
                        comprobante_asset_id, registrado_por
                        metodo: EFECTIVO | TRANSFERENCIA
                        ↑ tabla propia: soporta ABONOS PARCIALES

Conversacion            cliente_id, ventana_expira_at, ultimo_inbound_at, no_leidos
Mensaje                 wa_message_id (UNIQUE), direction, tipo, template_name,
                        params, body_renderizado, status, error_code, enviado_por
PlantillaWA             name, category, language, status, componentes, sincronizado_at

Asset                   key (sha256), bucket, mime, size, owner_type, owner_id,
                        variantes, subido_por
                        owner_type: producto | pago | entrega | cliente | ...

DiaNoLaborable          fecha, motivo, editable
audit_log               actor_tipo, actor_id, accion, entidad, entidad_id,
                        antes, despues, ip, user_agent, created_at
domain_events           tipo, payload, ocurrido_at, procesado_at
outbox                  tipo, destinatario_id, fecha_operacion, payload, estado, intentos
```

### Reglas del modelo

- **Facturas, no pedidos.** El contador de pendientes cuenta **facturas**, porque eso es lo que
  cuentan hoy en el cuaderno. `numero_dte` es el puente con el sistema de facturación externo.
- **Un pedido queda pagado** cuando `SUM(pagos.monto) >= factura.monto`. Nunca un booleano.
- **`cantidad_entregada`** por defecto igual a `cantidad_pedida`; se ajusta al entregar.
  La factura se calcula sobre lo **entregado**.
- **Varios pedidos por cliente por día**: permitido. El correlativo es global y simple; la fecha
  es un campo aparte, no parte del número.

---

## 6. Calendario y ventana de pedido

```ts
BusinessCalendar {
  isVentanaAbierta(now): boolean          // 15:00 – 00:00 America/Guatemala, configurable
  getFechaOperacion(now): Date            // siguiente día hábil
  getSiguienteDiaHabil(from): Date        // salta DiaNoLaborable
  isDiaNoLaborable(fecha): boolean
  isSabado(fecha): boolean                // sábado ⇒ TODO carga en PLANTA
}
```

- Ventana por defecto **15:00 → 00:00**, configurable por organización.
- Se valida **del lado del servidor**, siempre. Nunca confíes en el reloj del navegador.
- **Domingo** marcado como no laborable por defecto; feriados nacionales de Guatemala precargados.
  Editable desde el panel. Si un pedido cae en día no laborable, se programa al siguiente hábil.
- **Regla de sábado**: el sábado la carga completa sale de planta, sin importar el
  `punto_carga` del producto.

### Edición y reapertura

- El cliente **puede editar** su pedido hasta el cierre de la ventana. Cada edición queda en
  `audit_log` con el diff. **No** se versiona el pedido.
- La hoja de producción **no se materializa hasta el cierre**. Eso evita que Alex vea datos viejos.
- **Reapertura de un día cerrado** — flujo exacto:
  1. Solo `ADMIN_JEFE`.
  2. Motivo obligatorio en texto libre.
  3. El día queda marcado como reabierto.
  4. **No se reenvían** los mensajes ya enviados.
  5. Al cerrar de nuevo se genera **hoja versión 2 con los cambios resaltados**, no la hoja completa.
  6. Queda en `audit_log`: quién, cuándo, por qué.

---

## 7. Autenticación y permisos

- **Internos**: cookie de sesión `httpOnly` + argon2id. Cuenta individual por persona, nunca
  compartida por rol — la trazabilidad en cobranza depende de eso.
- **Clientes**: sin login. Token opaco en la URL (`/p/{token}`), guardado **hasheado**,
  rotable desde el panel. Rate limit por token y por IP.
- **`ADMIN_JEFE`** es el único que puede modificar permisos de otros, incluida la facultad de
  cambiar precios. Toda delegación queda en `audit_log`.
- El cambio de precio registra actor, valor anterior y valor nuevo. Siempre.

---

## 8. WhatsApp — restricciones de plataforma

Estas no son decisiones de diseño, son límites de Meta. No intentes rodearlas.

- Fuera de la ventana de 24 h **solo se pueden enviar plantillas aprobadas**. Da igual si el
  envío lo dispara un cron o si un humano da clic. El API responde `131047`.
- Las **variables de plantilla no admiten saltos de línea, tabs ni más de 4 espacios seguidos**.
  Un desglose de ítems **no cabe** en una variable.
- La ventana se abre con cualquier mensaje entrante, **incluido el tap de un botón quick-reply**.

### Patrón obligatorio

```
Ventana CERRADA → composer bloqueado, solo selector de plantillas
                  la IA ELIGE plantilla y RELLENA variables (output estructurado)
Ventana ABIERTA → composer libre, con countdown visible
                  la IA REDACTA prosa con desglose completo
```

- **Validar parámetros antes de enviar**: sin saltos de línea, sin >4 espacios, longitud
  renderizada bajo el límite, ninguna variable vacía. Atrapa el error tú, no Meta.
- **Preview renderizado** siempre, antes de enviar. El usuario ve el mensaje tal como llegará.
- **Estado de cuenta**: PDF adjunto como header de documento en la plantilla. Resuelve 3 o 30
  facturas con una sola plantilla aprobada.
- `wa_message_id` con constraint **UNIQUE** — Meta reintenta webhooks agresivamente.
- `ventana_expira_at` se calcula desde el **timestamp del webhook**, nunca desde el reloj local.
- El registro de plantillas se **sincroniza** desde el Graph API. No hardcodees nombres: Meta
  puede pausar una plantilla por baja calidad.

### Durante el desarrollo

Existe `FakeWhatsAppAdapter` detrás de `WhatsAppPort`. Simula envíos, webhooks entrantes y la
ventana de 24 h. **El desarrollo no se bloquea esperando la verificación de Meta.**

---

## 9. Uso de IA

Acotado por diseño. El costo operativo importa.

| Caso | Herramienta |
|---|---|
| Estado de cuenta, confirmaciones, hoja consolidada | **Plantillas deterministas** (Handlebars). Costo cero, salida consistente |
| Redacción de mensaje libre dentro de la ventana | LLM, con revisión humana obligatoria |
| Selección de plantilla y llenado de variables | LLM con salida estructurada validada |

**No** metas un LLM donde una plantilla produce mejor resultado. El desglose de cobranza es
un caso de plantilla, no de IA.

---

## 10. Offline y PWA

Tony trabaja en la calle con señal irregular. Si marca "cobrado en efectivo" sin cobertura, el
dato **no se puede perder ni parecer guardado sin estarlo**.

- App instalable como PWA.
- Acciones de reparto (entrega, cobro, adjunto de comprobante) se encolan en **IndexedDB** y
  se sincronizan al recuperar señal.
- **UI honesta**: indicador visible de pendiente-de-sincronizar. Nunca muestres éxito sin
  confirmación del servidor.
- Cada acción encolada lleva un `idempotency_key` de cliente; el servidor deduplica.

---

## 11. Convenciones

- **Migraciones**: siempre en `packages/db`, nunca `push` contra producción. Reversibles.
- **Env**: validado con Zod al arrancar. La app no levanta con configuración incompleta.
- **Errores**: excepciones de dominio tipadas, mapeadas a HTTP en un filtro. Nada de `throw new Error('...')` en servicios.
- **Respuestas API**: forma consistente, validada con los esquemas de `packages/shared`.
- **Logs**: `pino` estructurado. Nunca loguees tokens, contraseñas ni el contenido de mensajes de cliente.
- **Tests**: prioriza `BusinessCalendar`, snapshot de precios, idempotencia del outbox, validación
  de ventana, cálculo de saldos y validador de parámetros de plantilla. **No persigas cobertura**;
  cubre lo que produce pérdida de dinero.
- **Commits**: convencionales, en inglés.
- **Comentarios y documentación**: español, igual que el vocabulario de dominio.

---

## 12. Qué NO hacer

- No introducir Redis, Kafka, microservicios ni GraphQL.
- No instalar Puppeteer, Playwright ni Chromium.
- No usar `localStorage` para datos de negocio (solo IndexedDB, para la cola offline).
- No borrar filas.
- No usar floats para dinero.
- No inyectar servicios entre módulos — publica un evento.
- No construir una matriz de variantes de producto. Son ~40 SKUs planos con campo `familia`.
- No implementar portales separados por cliente. Un catálogo, con alias y favoritos por cliente.
- No implementar UI de gestión de organizaciones. El multi-tenant es solo la FK.
- No agregar facturación electrónica, inventario ni módulo de producción. Son fases posteriores.
- No enviar texto libre por WhatsApp sin verificar `ventana_expira_at`.
- **Frontend:** no abrir ni inspeccionar el browser (DevTools, MCP de browser, screenshots,
  snapshots, navegación automatizada). Auditar y diseñar desde código, tokens y componentes.
  Solo si el usuario lo pide explícitamente.

---

## 13. Decisiones pendientes

Cuando toques estas áreas, **pregunta antes de asumir**:

- Confirmación de si trabajan domingos y qué feriados cierran realmente.
- Política de retención de conversaciones de WhatsApp.
- Si el cliente puede ver su historial completo de pedidos en el portal o solo el estado de cuenta.
  **Resuelto (2026-08):** sí ve historial **recortado** (últimos 20 + cargar más) de *sus* pedidos;
  detalle propio; nunca SKU, punto de carga, notas de producción ni `audit_log` interno.
- Comportamiento exacto cuando producción no puede surtir lo pedido (hoy se resuelve
  internamente; si eso cambia, hay que definir notificación al cliente).