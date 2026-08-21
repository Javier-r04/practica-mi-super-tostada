# USAGE.md — Cómo usar Mi Súper Tostada

Guía práctica de lo que **ya está implementado** en este repositorio: qué hace cada módulo, la lógica de negocio detrás, y cómo probarlo (manual y automatizado).

| Documento | Para qué sirve |
|---|---|
| **`CONTEXT.md`** | Qué se construye, backlog, glosario, actores |
| **`AGENTS.md`** | Reglas técnicas duras (centavos, calendario, idempotencia, etc.) |
| **`USAGE.md`** (este archivo) | Arranque, pantallas, flujos y pruebas |
| **`README.md`** | Instalación mínima y scripts |

---

## 1. Arranque local

### Requisitos

- [Bun](https://bun.sh) 1.3+
- Postgres nativo en marcha (Homebrew / Postgres.app). El loop diario **no usa Docker**.
- Node.js LTS solo para producción (`node dist/main.js`).

### Primera vez

```bash
cp .env.example .env
bun install
bun run db:setup    # create + migrate + seed
bun test            # suite completa
bun run dev:all     # web :3000 + api :3001 + tests en watch
```

O por separado:

```bash
bun run dev         # solo Next.js → http://localhost:3000
bun run dev:api     # solo NestJS → http://localhost:3001
```

Salud de la API: `GET http://localhost:3001/health` (reporta `db: ok|down`).

---

## 2. Credenciales y datos de prueba

### Usuarios internos (solo desarrollo)

El seed crea cuatro cuentas con la misma contraseña (`SEED_ADMIN_PASSWORD` en `.env`, default **`dev-local-only`**):

| Usuario | Rol | Uso típico |
|---|---|---|
| `cristian` | ADMIN_JEFE | Cierra ventana, reapertura, permisos, tablero completo |
| `alex` | PRODUCCION | Ve hoja de producción (solo lectura operativa) |
| `carla` | TIENDA | Captura DTE, pedidos manuales, cobros |
| `tony` | REPARTO | Ruta, entregas, cobros en calle (offline) |

Login: http://localhost:3000/login → cookie `httpOnly` de sesión.

### Portal del cliente (desarrollo)

Tras `db:seed`, la consola imprime la URL del portal de **Tabasco Casa Vieja**:

```
http://localhost:3000/p/dev-tabasco-casa-vieja-portal-token
```

Ese cliente tiene en seed:

- Alias comerciales (`tortilla grande`, `tortilla mediana`, etc.)
- Precios de **demo** (no reales): Q 12.50 / Q 11.00 / Q 10.00 por libra de tortilla
- Nota de producción **GRUESA** en tortillas
- Nachos blancos con precio de demo

Para otro cliente: panel **Clientes** → detalle → **Rotar token de portal** (solo ADMIN_JEFE). La URL nueva se muestra una sola vez.

### Catálogo seed

12 productos y 13 clientes según `CONTEXT.md` §5 (Tabasco Casa Vieja, Kraken con fajitas, Metroplaza con entrega 09:00, etc.). Los precios reales **no** vienen en seed salvo el demo de Tabasco Casa Vieja; Cristian los carga en **Clientes → productos del cliente**.

### Mega-seed (datos de prueba densos)

Para llenar cartera, ruta, producción, WhatsApp y tablero con ~45 clientes extra y ~45 días hábiles de historial (fechas relativas al momento de correr el script):

```bash
bun run db:seed:mega        # seed base + clear previo + mega datos
bun run db:seed:mega:clear  # solo borra lo marcado [MEGA_SEED]
```

No toca org/usuarios/productos ni los 13 clientes base; sí enriquece esos clientes con pedidos de prueba. Re-ejecutar es seguro (limpia y vuelve a generar).

---

## 3. Mapa de pantallas

### Panel interno (requiere login)

| Ruta | Pantalla | Actor principal |
|---|---|---|
| `/hoy` | Operación del día: ventana, cierre, resumen de ruta | Cristian |
| `/tablero` | Dashboard analítico + PDF quincena | Cristian |
| `/pedidos` | Bandeja, captura manual, detalle, SSE en vivo | Cristian / Carla |
| `/produccion` | Hoja de producción del día | Alex |
| `/reparto` | Ruta de Tony: entregar y cobrar (offline) | Tony |
| `/cartera` | Facturas pendientes, pagos, cuadre | Cristian / Carla |
| `/conversaciones` | Bandeja WhatsApp | Cristian |
| `/catalogo` | Productos (CRUD, familias, fotos) | Cristian |
| `/clientes` | Clientes, alias, precios, import CSV | Cristian |

### Portal público (sin login)

| Ruta | Pantalla |
|---|---|
| `/p/{token}` | Pedido del cliente + estado de cuenta |

---

## 4. Conceptos transversales (léelos antes de probar)

### Fecha de operación vs. reloj del navegador

- Zona fija: **`America/Guatemala`** (UTC−6, sin horario de verano).
- **Ventana de pedido:** 15:00 → 00:00 (configurable por organización).
- Un pedido capturado hoy por la noche pertenece a la **entrega del siguiente día hábil** (`fecha_operacion`), no a `created_at`.
- Toda decisión de calendario pasa por **`BusinessCalendar`** en servidor. El badge de ventana en el panel viene de `GET /calendario/ahora`.

### Dinero

- Siempre **enteros en centavos** (`1250` = Q 12.50).
- El formateo `Q 12.50` solo ocurre en UI.
- Cada línea de pedido guarda **snapshot** de precio, nombre y unidad al momento de capturar.

### Soft delete

- Nada se borra: productos/clientes se **desactivan**; pedidos se **anulan** con motivo.

### Idempotencia

- Mensajes automáticos → tabla `outbox` con constraint única.
- Acciones offline de reparto → `idempotency_key` de cliente; el servidor deduplica entregas.

### UI: nunca "Cancelado" a secas

- Pedido anulado → **"Anulado"**
- Factura saldada → **"Pagado"** (en Guatemala "cancelado" significa pagado; el sistema evita la ambigüedad)

---

## 5. Módulos implementados

Estado según backlog de `CONTEXT.md`. `[x]` = criterios de aceptación cubiertos en código y tests.

---

### E0 — Fundación

#### Infraestructura (F-001)

**Qué hay:** monorepo Bun, `apps/api` (NestJS), `apps/web` (Next.js), `packages/shared`, `packages/db`, `packages/pdf`. Env validado con Zod al boot.

**Cómo probar:**

```bash
bun run typecheck
bun run lint
curl -s http://localhost:3001/health | jq
```

**Pendiente:** CI en GitHub Actions.

#### Esquema y seed (F-002)

**Lógica:** todas las entidades de dominio en Drizzle; migraciones reversibles en `packages/db/drizzle/`.

**Cómo probar:**

```bash
bun run db:setup
bun test packages/db/src/schema.money.test.ts
bun test packages/db/src/audit.append-only.test.ts
```

#### BusinessCalendar (F-003)

**Lógica de negocio:**

| Función | Comportamiento |
|---|---|
| `isVentanaAbierta` | 15:00–00:00 GT |
| `getFechaOperacion` | Siguiente día hábil de entrega |
| `getSiguienteDiaHabil` | Salta domingos y `dia_no_laborable` |
| `isSabado` | Sábado ⇒ toda la carga sale de **PLANTA** |

**Cómo probar:**

```bash
bun test packages/shared/src/calendar.test.ts
```

Manual: abre el panel y observa el badge de ventana; fuera de horario el portal informa cuándo abre de nuevo.

#### Auth y roles (F-004)

**Lógica:** cookie `httpOnly` + argon2id; permisos granulares delegables por ADMIN_JEFE.

| Rol | Acciones destacadas |
|---|---|
| ADMIN_JEFE | Todo, incl. reapertura y delegación |
| ADMIN | Catálogo, pedidos, cobranza, cierre de ventana |
| PRODUCCION | Solo lectura operativa |
| TIENDA | DTE, pagos, pedidos manuales |
| REPARTO | Entregar y registrar pagos |

**Cómo probar:**

```bash
bun test packages/shared/src/permisos.test.ts
bun test apps/api/src/modules/identity/auth.service.test.ts
```

Manual: entra con `tony` → en `/reparto` puedes entregar/cobrar; en `/catalogo` no hay acciones de escritura.

#### Auditoría y outbox (F-005)

**Lógica:** `audit_log` append-only (quién hizo qué); `domain_events` + `outbox` para side effects; worker pg-boss con reintentos.

**Cómo probar:**

```bash
bun test apps/api/src/modules/shared/outbox.writer.test.ts
bun test apps/api/src/modules/shared/outbox.processor.test.ts
bun test apps/api/src/modules/shared/pgboss.smoke.test.ts
```

#### Storage R2 (F-006)

**Lógica:** URLs prefirmadas; el browser sube directo a R2 (o `FakeStorageAdapter` en dev). Tabla `Asset` con sha256.

**Cómo probar:**

```bash
bun test apps/api/src/modules/shared/storage/assets.service.test.ts
```

Manual: adjuntar comprobante de pago en `/cartera` o `/reparto` (sin R2 configurado usa fake y guarda metadata).

---

### E1 — Catálogo y clientes

#### Productos (F-101) — `/catalogo`

**Lógica:** SKU, familia, unidad (`LIBRA`/`BOLSA`/`UNIDAD`), punto de carga (`PLANTA`/`DEMOCRACIA`), orden arrastrable, desactivación sin borrado.

**Cómo probar:**

```bash
bun test apps/api/src/modules/catalog/catalog.e2e.test.ts
bun test packages/shared/src/catalog.test.ts
```

Manual: http://localhost:3000/catalogo → crear producto, reordenar, desactivar.

#### Clientes (F-102) — `/clientes`

**Lógica:** teléfono WA, horario fijo de entrega, notas permanentes, límite de facturas pendientes, token de portal rotable.

**Cómo probar:** mismo e2e de catálogo + manual en `/clientes` y `/clientes/[id]`.

#### Alias y precios (F-103)

**Lógica:** `ClienteProducto` = cómo **ese** cliente llama al producto, su precio, nota de producción (ej. GRUESA), favoritos. El portal **no** auto-crea ligas: solo aparecen productos con precio cargado.

**Manual:** Clientes → Tabasco Casa Vieja → editar alias/precio/favorito → abrir portal y verificar que los favoritos salen arriba con el alias del cliente.

#### Importador CSV (F-104)

**Lógica:** plantilla descargable, preview con errores por fila, importación parcial permitida.

**Manual:** `/clientes` o `/catalogo` → Importar → descargar plantilla → subir CSV con errores y confirmar solo filas válidas.

**API:**

```
GET  /catalogo/import/plantillas/{clientes|productos}
POST /catalogo/import/preview
POST /catalogo/import/confirmar
```

---

### E2 — Portal del cliente

#### Acceso por token (F-201)

**Lógica:** `/p/{token}` sin login; token hasheado en BD; rate limit por token e IP; cada apertura en `audit_log`; token revocado → 404 genérico.

**Cómo probar:**

```bash
bun test apps/api/src/modules/ordering/ordering.e2e.test.ts
bun test apps/api/src/modules/ordering/portal-rate-limit.test.ts
```

**Ver como cliente:**

1. Abre http://localhost:3000/p/dev-tabasco-casa-vieja-portal-token
2. Si la ventana está cerrada, verás cuándo abre de nuevo (validado en servidor)
3. Pestaña **Estado de cuenta** muestra facturas pendientes

#### Captura de pedido (F-202)

**Lógica:** favoritos arriba con alias y precio del cliente; solo cantidades; confirmación con subtotal; mobile-first.

**Manual (ventana abierta, 15:00–00:00 GT):**

1. Portal → elige cantidades en favoritos
2. Revisa resumen con subtotal
3. Confirma → pedido aparece en `/pedidos` del panel (SSE lo refresca)

#### Ventana horaria (F-203)

**Lógica:** fuera de horario el portal no acepta envío; muestra próxima apertura.

**Probar fuera de horario:** los tests e2e usan reloj controlado; manualmente solo fuera de 15:00–00:00 GT.

#### Edición hasta cierre (F-204)

**Lógica:** el cliente puede editar mientras la ventana esté abierta; cada edición queda en `audit_log` con diff; **no** hay versionado del pedido; cancelar desde portal no está permitido (debe llamar).

#### Estado de cuenta (F-205)

**Lógica:** facturas pendientes, montos, antigüedad, límite configurable — mismo enlace del portal.

**API:** `GET /p/{token}/cuenta`

---

### E3 — Panel de pedidos

#### Bandeja (F-301) — `/pedidos`

**Lógica:** filtro por fecha de operación, cliente, estado; varios pedidos del mismo cliente el mismo día; correlativo global simple.

**Cómo probar:**

```bash
bun test apps/api/src/modules/ordering/pedidos.e2e.test.ts
```

Manual: captura desde portal + captura manual → ambos visibles en bandeja.

#### Pedido manual (F-302)

**Lógica:** salta ventana horaria; `origen: MANUAL`; registra quién capturó. Caso típico: Tienda 6 por llamada.

**Manual:** `/pedidos` → Nuevo pedido manual → elegir cliente y líneas.

#### Tiempo real SSE (F-303)

**Lógica:** nuevos pedidos y cambios de estado invalidan TanStack Query vía SSE; reconexión automática.

**Manual:** abre `/pedidos` en dos pestañas; confirma un pedido en el portal → la bandeja se actualiza sola.

#### Notas extraordinarias (F-304)

**Lógica:** campo libre por pedido ("llevar junto con tortillas de la mañana"). Horario, punto de carga y grosor **no** se escriben a mano: salen del catálogo.

---

### E4 — Operación diaria

#### Cierre y consolidación (F-401) — `/hoy`

**Lógica de negocio:**

1. Cristian cierra la ventana cuando termina la noche.
2. **Solo entonces** se materializa la hoja de producción (Alex no ve datos viejos).
3. Se emite evento `VentanaPedidoCerrada` → outbox.

**Manual:**

1. Login como `cristian`
2. `/hoy` → **Cerrar ventana del día**
3. Verifica que `/produccion` ya muestra la hoja

**Cómo probar:**

```bash
bun test apps/api/src/modules/fulfillment/fulfillment.e2e.test.ts
```

#### Hoja de producción (F-402) — `/produccion`

**Lógica:** agrupada por punto de carga; sábado ⇒ todo desde PLANTA; horarios fijos y notas GRUESAS impresos; formato reconocible respecto al WhatsApp actual (ver `CONTEXT.md` §4).

**Manual:** tras cierre, abre `/produccion` y compara estructura con el mensaje consolidado de referencia.

#### Vistas por rol (F-403)

**Lógica:** misma información, distintas acciones. Alex ve producción; Tony reparto; Carla puede DTE.

**Manual:** compara `/produccion` con `alex` vs `/reparto` con `tony`.

#### Exportación (F-404)

**Lógica:** hoja en texto y PDF (`@react-pdf/renderer`, sin Chrome headless) para WhatsApp o impresión de respaldo.

**Manual:** `/produccion` o `/hoy` → exportar texto/PDF.

**API:** `GET /hojas/{fecha}`

#### Reapertura (F-405)

**Lógica:**

1. Solo ADMIN_JEFE, motivo obligatorio
2. No reenvía mensajes ya enviados
3. Al recerrar: hoja **versión 2** con cambios resaltados
4. Todo en `audit_log`

**Manual:** `/hoy` → Reabrir (como `cristian`) → editar pedidos → cerrar de nuevo → ver versión 2.

---

### E5 — Cobranza

#### Entrega (F-501) — `/reparto`

**Lógica:**

- `cantidad_entregada` por línea; default = lo pedido
- La factura se calcula sobre lo **entregado**, no lo pedido
- Requiere `idempotencyKey` (obligatorio desde F-801)

**Manual:**

1. Login `tony` → `/reparto`
2. Selecciona parada → ajusta cantidades si hace falta → **Marcar entregado**
3. El pedido pasa a estado ENTREGADO y se genera factura pendiente

#### Captura DTE (F-502)

**Lógica:** Carla registra el número del sistema externo de facturación; es el puente pedido ↔ cartera.

**Manual:** `/cartera` o detalle de factura → Capturar DTE.

#### Pagos y abonos (F-503) — `/cartera`, `/reparto`

**Lógica:**

- Tabla `Pago` propia: monto, método (`EFECTIVO` | `TRANSFERENCIA`), fecha
- Factura **Pagada** cuando `SUM(pagos) >= factura.monto` (nunca un booleano suelto)
- Abonos parciales soportados

**Cómo probar:**

```bash
bun test packages/shared/src/receivables.test.ts
bun test apps/api/src/modules/receivables/receivables.e2e.test.ts
```

#### Comprobantes (F-504)

**Lógica:** foto de transferencia/recibo subida vía presign R2, ligada al pago.

#### Control de cartera (F-505) — `/cartera`

**Lógica:** contador de facturas pendientes vs. límite por cliente; alerta al superar; filtros; cuadre diario con repartidor; corte quincenal.

**Manual:** `/cartera` → filtrar por cliente → registrar pago → ver contador bajar.

**API:**

```
GET  /cartera
GET  /cartera/resumen
GET  /cobranza/cuadre
POST /pagos
POST /cartera/clientes/:id/recordatorio
```

---

### E6 — Dashboard

#### Tablero (F-601) — `/tablero`

**Lógica:** KPIs de operación del día, cartera (saldo, efectivo vs transferencia, antigüedad), ventas por periodo, volumen por producto, adopción portal vs manual, alertas (cliente que dejó de pedir, sobre límite).

**Cómo probar:**

```bash
bun test packages/shared/src/analytics.test.ts
bun test apps/api/src/modules/analytics/analytics.e2e.test.ts
```

Manual: genera pedidos/entregas/pagos de prueba → `/tablero` con filtros de fecha.

#### PDF quincena (F-602)

**Manual:** `/tablero` → exportar quincena PDF.

**API:** `GET /tablero/quincena.pdf`

---

### E7 — Mensajería

#### WhatsApp (F-701–F-706) — `/conversaciones`

**Lógica clave:**

- Sin credenciales Meta → **`FakeWhatsAppAdapter`** (desarrollo no bloqueado)
- Ventana 24 h: fuera solo plantillas aprobadas
- Composer bloqueado a plantillas cuando ventana cerrada
- Validador: sin saltos de línea, sin >4 espacios, preview obligatorio
- Automatizaciones: invitación 18:00, confirmación de pedido, recordatorio con PDF de estado de cuenta

**Cómo probar:**

```bash
bun test apps/api/src/modules/messaging/messaging.e2e.test.ts
bun test packages/shared/src/messaging.test.ts
```

**Manual (fake):**

1. `/conversaciones` → abrir conversación de un cliente con teléfono WA
2. **Simular mensaje entrante** (abre ventana 24 h)
3. Enviar texto libre o plantilla según estado de ventana
4. Ver preview antes de enviar

**API útil en dev:**

```
POST /conversaciones/:id/simular-inbound
POST /conversaciones/:id/enviar
GET  /mensajeria/plantillas
```

---

### E8 — Offline / PWA

#### Cola local (F-801) — `/reparto`

**Lógica de negocio (Tony en la calle):**

1. Acciones de entrega y cobro se encolan en **IndexedDB** si no hay señal
2. Al recuperar conexión, se sincronizan con `idempotency_key`
3. **UI honesta:** nunca muestra éxito sin confirmación del servidor; banner de pendientes visible
4. ENTREGA debe sincronizarse antes que PAGO del mismo pedido

**Cómo probar automatizado:**

```bash
bun test packages/shared/src/offline.test.ts
bun test apps/web/src/lib/offline-sync.test.ts
```

**Manual:**

1. Login `tony` → `/reparto?sw=1` (activa service worker en dev)
2. DevTools → Network → **Offline**
3. Marca entrega o registra cobro → debe decir "pendiente de sincronizar"
4. Vuelve online → banner "Enviar ahora" o sync automático
5. Solo tras respuesta OK del servidor desaparece de la cola

**Instalar PWA:** chip "Instalar app" en el panel (Chrome/Android; en iOS: Compartir → Añadir a inicio).

**Archivos clave:**

| Archivo | Rol |
|---|---|
| `apps/web/public/sw.js` | Cache de shell; no intercepta API |
| `apps/web/src/hooks/use-cola-offline.tsx` | Estado React de la cola |
| `apps/web/src/lib/offline-sync.ts` | Drenado FIFO hacia API |
| `packages/shared/src/offline.ts` | Reglas puras de cola |

---

## 6. Flujo operativo de punta a punta

Recorrido recomendado para validar que todo encaja (ideal con ventana abierta):

```
1. Cliente pide          →  /p/dev-tabasco-casa-vieja-portal-token
2. Cristian ve pedido    →  /pedidos  (SSE)
3. Cristian cierra noche →  /hoy → Cerrar ventana
4. Alex ve hoja          →  /produccion
5. Tony entrega          →  /reparto → Marcar entregado
6. Carla captura DTE     →  /cartera → DTE
7. Tony cobra            →  /reparto → Registrar pago (o offline)
8. Cristian cuadra       →  /cartera → Cuadre / tablero
9. Recordatorio WA       →  /conversaciones (si aplica)
```

**Regla de sábado:** si `fecha_operacion` cae en sábado, la hoja muestra toda la carga desde PLANTA aunque las tortillas sean de DEMOCRACIA.

---

## 7. Suite de tests

```bash
# Todo
bun test

# Por área
bun test packages/shared/src/calendar.test.ts
bun test packages/shared/src/offline.test.ts
bun test apps/api/src/modules/ordering/ordering.e2e.test.ts
bun test apps/api/src/modules/fulfillment/fulfillment.e2e.test.ts
bun test apps/api/src/modules/receivables/receivables.e2e.test.ts
bun test apps/api/src/modules/messaging/messaging.e2e.test.ts
bun test apps/api/src/modules/analytics/analytics.e2e.test.ts
bun test apps/web/src/lib/offline-sync.test.ts
```

Los e2e de API requieren Postgres accesible en `DATABASE_URL`. Si no hay DB, esos tests se saltan solos.

---

## 8. API de referencia rápida

Base: `http://localhost:3001`

| Área | Endpoints principales |
|---|---|
| Auth | `POST /auth/login`, `GET /auth/me`, `POST /auth/logout` |
| Calendario | `GET /calendario/ahora` |
| Pedidos | `GET/POST /pedidos`, `POST /pedidos/:id/anular` |
| Portal | `GET /p/:token`, `GET /p/:token/cuenta` |
| Operación | `GET /operacion`, `POST /operacion/cerrar`, `POST /operacion/reabrir` |
| Hojas | `GET /hojas/:fecha` |
| Reparto | `GET /reparto`, `POST /entregas` |
| Cartera | `GET /cartera`, `POST /pagos` |
| Tablero | `GET /tablero`, `GET /tablero/quincena.pdf` |
| Catálogo | `GET/POST /productos`, `GET/POST /clientes` |
| Mensajería | `GET /conversaciones`, `POST /conversaciones/:id/enviar` |
| Assets | `POST /assets/presign`, `POST /assets/confirm` |

Todas las respuestas siguen el envelope de `@misupertostada/shared`.

---

## 9. Pendiente (E9 — puesta en marcha)

| ID | Qué falta |
|---|---|
| F-901 | Carga de datos reales (clientes, precios, productos de producción) |
| F-902 | Pruebas en campo con Tony y Carla |
| F-903 | Respaldos `pg_dump` semanal a R2 |
| F-904 | Observabilidad completa (Sentry en prod; `/health` ya existe) |
| F-905 | Manual impreso y capacitación presencial |
| F-001 | CI GitHub Actions |

---

## 10. Issues conocidos (revisión E8)

Hallazgos de la revisión de código sobre offline/PWA. Corregir antes de uso en campo con Tony:

| Severidad | Issue | Impacto |
|---|---|---|
| MEDIUM | `siguienteAccion` trata ENTREGA en estado `error` como bloqueo para PAGO | Cobro puede quedar atascado en cola |
| MEDIUM | `OfflineBanner` usa `cola.length` en vez de solo pendientes reales | Banner engañoso con filas en error |
| LOW | Service Worker filtra API por puerto `3001` | Confuso en mantenimiento; en prod usar pathname `/api/` |
| LOW | `idempotencyKey` nueva en cada tap de entrega | Cubierto por coalesce local; documentar invariante |

---

## 11. Glosario rápido

| Término | En el sistema |
|---|---|
| La Demo | Punto de carga `DEMOCRACIA` (tortillas) |
| La planta | Punto de carga `PLANTA` (resto) |
| Fecha de operación | Día de **entrega**, no de captura |
| Pagado | Factura saldada (no decir "cancelado") |
| Anulado | Pedido anulado desde panel |
| DTE | Número de factura externa capturado por Carla |

Para el glosario completo y casos de negocio, ver `CONTEXT.md` §2.
