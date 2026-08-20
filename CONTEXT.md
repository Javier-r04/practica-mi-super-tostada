# CONTEXT.md — Sistema de Pedidos y Cobranza · Mi Súper Tostada

Contexto de producto y backlog de desarrollo.

- **`CLAUDE.md`** = cómo se construye (reglas técnicas, convenciones, prohibiciones).
- **`CONTEXT.md`** (este archivo) = qué se construye y por qué.

Al abrir una feature, lee la sección de la épica correspondiente y el glosario. No infieras
reglas de negocio que no estén escritas aquí: pregunta.

---

## 1. El negocio

Mi Súper Tostada fabrica tortillas, tostadas y frituras en Guatemala. Vende al detalle en tienda
y **al mayoreo a restaurantes**, que es la operación que cubre este sistema.

### Cómo funciona hoy (el proceso que se reemplaza)

1. **21:00–00:00.** Cristian abre la app de notas, copia un mensaje ("buenas noches, solo para
   preguntarle si necesita pedido para mañana") y lo pega en el chat de WhatsApp de cada cliente,
   uno por uno.
2. Los clientes responden a lo largo de la noche. Algunos de inmediato, otros dicen "déjeme
   preguntar a cocina" y contestan dos horas después. Los restaurantes cierran tarde (21:00–22:00)
   y hasta entonces saben qué necesitan.
3. **Cristian traduce a mano.** El cliente escribe "50 libras de tortilla grande, 50 medianas,
   20 pequeñas". Producción necesita "50 de la No. 16, 50 de la No. 14, 20 de la No. 12".
4. **Consolida todo** en un solo mensaje, agrega notas de horario y de punto de carga
   ("cargar en planta", "estas salen de la Demo"), y lo reenvía a tres personas.
5. **Al día siguiente**, Tony reparte y cobra. Al final del día le entrega el dinero a Cristian y
   le reporta quién pagó, quién quedó pendiente y quién va a transferir.
6. **Cristian transcribe todo al cuaderno**, marca con asterisco los pendientes, y cuenta a mano
   cuántas facturas lleva acumuladas cada cliente. Cierra cuentas quincenalmente con su papá.

### Dónde duele

| Síntoma | Costo real |
|---|---|
| El horario nocturno está secuestrado todos los días | ~3 h diarias de una persona |
| La traducción de nomenclatura depende de una sola cabeza | Error silencioso en producción |
| Especificaciones especiales se recuerdan de memoria | Ej. grosor de tortilla de los Tabascos |
| El cuaderno no se filtra, no se respalda, no se audita | Cliente detectado con **7 facturas** acumuladas; otro con **15 días** |
| Doble digitación teléfono → cuaderno | Pérdida de dinero, citado textual: "aunque sea muy ordenado siempre se pierde dinero" |

### El principio que guía las decisiones

**Nadie debe transcribir nada dos veces.** Ante dos diseños posibles, gana el que elimina una
transcripción. Ante la duda de si una función vale la pena, pregunta si quita trabajo manual a
Cristian, Alex, Carla o Tony.

---

## 2. Glosario

Vocabulario real del negocio. Úsalo en código, UI y conversación.

| Término | Significado |
|---|---|
| **La Demo / La Democracia** | Tienda de donde salen **las tortillas** |
| **La planta / la fábrica** | Donde se produce y se carga **todo lo demás** |
| **Punto de carga** | Dónde recoge el repartidor cada producto: `PLANTA` o `DEMOCRACIA` |
| **No. 16 / 14 / 12** | Tamaños de tortilla. Comercialmente: grande / mediana / pequeña |
| **Papalinas** | Frituras de papa. Presentaciones: saladas y barbacoa |
| **Nachos / palitos** | Presentaciones blancas y amarillas |
| **Fajitas** | Producto exclusivo de un solo cliente (Kraken) |
| **DTE** | Documento Tributario Electrónico (factura). Se emite en un sistema **externo** |
| **Cancelado** | En Guatemala significa **pagado**, no anulado. Cuidado con esta palabra en la UI |
| **Pedido consolidado** | El mensaje único con todos los pedidos del día siguiente |
| **Ventana de pedido** | Franja en que el cliente puede pedir: 15:00–00:00 |
| **Fecha de operación** | Día de entrega al que pertenece un pedido (≠ fecha de captura) |
| **Grosor especial** | Algunos clientes piden la tortilla más gruesa. Es fijo por cliente |

> **Nota crítica de UI:** en el sistema, "cancelado" para un pedido significa **anulado**, pero
> para un pago significa **pagado**. Para evitar el choque, en la interfaz usa **"Pagado"** y
> **"Anulado"**, nunca "cancelado" a secas.

---

## 3. Actores

| Actor | Qué necesita | Contexto que cambia el diseño |
|---|---|---|
| **Cristian** — Administrador jefe | Ver todo, ajustar todo, cobrar, cerrar quincena | Es quien decide. Hoy hace el trabajo nocturno completo |
| **Alex** — Producción | Cuántas libras de cada tamaño, por cliente | Arranca de madrugada. Solo saca tortillas; ignora el resto del mensaje |
| **Carla** — Tienda y facturación | El pedido completo, para emitir el DTE y alistar | Emite la factura en un sistema externo y captura el número |
| **Tony** — Reparto | A quién le lleva qué, y registrar cobro | En la calle, celular, **señal irregular**. Sabe los horarios de memoria |
| **Restaurantes** — Clientes | Pedir rápido, ver su saldo | Nunca van a instalar una app. Piden desde el celular, tarde |

**Los tres internos ven la misma información.** Se decidió explícitamente en la reunión: es más
simple y Alex ya sabe filtrar mentalmente lo que le toca. Lo que cambia por rol son las
**acciones disponibles**, no los datos.

---

## 4. Formato del mensaje consolidado actual

Referencia de lo que se está reemplazando. La hoja de producción debe ser reconocible respecto
a esto, o el equipo la va a rechazar.

```
PEDIDO PARA SÁBADO

TABASCO CASA VIEJA
150 lb tortilla No. 16  (GRUESAS)
 50 lb tortilla No. 14
 20 lb tortilla No. 12
  8 bolsas nachos blancos      ← cargar en planta
  6 bolsas palitos amarillos   ← cargar en planta
  4 bolsas papalinas barbacoa  ← cargar en planta

14 AVENIDA
 40 lb tortilla No. 16
  ...

ESCUELITA LA CIÉNAGA — ENTREGAR 9:00 AM

TIENDA 6 — llevar junto con las tortillas de la mañana
```

Observaciones que el sistema automatiza:
- `cargar en planta` / salida de La Demo → deriva de `producto.punto_carga`
- `GRUESAS` → deriva de `ClienteProducto.nota_produccion`
- `ENTREGAR 9:00 AM` → deriva de `Cliente.horario_entrega_fijo`
- `llevar junto con las tortillas de la mañana` → nota extraordinaria, la escribe Cristian

---

## 5. Datos de referencia para semillas

Extraídos de la reunión. Úsalos como seed de desarrollo — no son la carga real, pero son
representativos.

**Productos**
```
Tortilla No. 16 (grande)     LIBRA   DEMOCRACIA   producido
Tortilla No. 14 (mediana)    LIBRA   DEMOCRACIA   producido
Tortilla No. 12 (pequeña)    LIBRA   DEMOCRACIA   producido
Tostada grande               LIBRA   PLANTA       producido
Tostada pequeña              LIBRA   PLANTA       producido
Nachos blancos               BOLSA   PLANTA       producido
Nachos amarillos             BOLSA   PLANTA       producido
Palitos blancos              BOLSA   PLANTA       producido
Palitos amarillos            BOLSA   PLANTA       producido
Papalinas saladas            BOLSA   PLANTA       producido
Papalinas barbacoa           BOLSA   PLANTA       producido
Fajitas                      BOLSA   PLANTA       producido   ← solo Kraken
```

**Clientes** (con sus particularidades reales)
```
Tabasco Casa Vieja       ~10 presentaciones · tortilla GRUESA · efectivo
Tabasco Interplaza       pago semanal → limite_facturas: 5
Tabasco de la Esperanza  
Casa Vieja del estadio   paga diario → limite_facturas: 3
Don Napo                 pide ~1 vez/semana → limite_facturas: 2
Kraken                   único con fajitas
14 Avenida               
Victorias                pago semanal · caso real de 15 días de atraso
Buen Camarón             paga con TRANSFERENCIA
Pura Frescura            caso real de 2 pedidos acumulados
Metroplaza               horario_entrega_fijo: 09:00 (centro comercial abre a esa hora)
Escuelita La Ciénaga     horario_entrega_fijo: 09:00 · paga con cheque
Tienda 6                 pedidos extraordinarios por llamada
```

---

## 6. Backlog

Formato: `ID · Título` con criterios de aceptación verificables. Una feature está lista cuando
todos sus criterios pasan y cumple la Definición de Terminado (§8).

`[x]` = hecho · `[ ]` = pendiente.

### E0 — Fundación *(semanas 1–2)*

**F-001 · Infraestructura y repositorio**
- [x] Monorepo con `apps/api`, `apps/web`, `packages/shared`, `packages/db`
- [x] Bun como gestor; Node como runtime de la API
- [x] Docker Compose con Postgres 18 (empaquetado; el loop local usa instancia nativa)
- [x] Env validado con Zod al arrancar; la app no levanta con config incompleta
- [ ] CI en GitHub Actions: lint, typecheck, tests

**F-002 · Esquema de base de datos**
- [x] Todas las entidades de `CLAUDE.md` §5 modeladas en Drizzle
- [x] Migraciones reversibles en `packages/db`
- [x] Montos en `integer` de centavos, verificado por test
- [x] Seed con los datos de §5 de este documento

**F-003 · `BusinessCalendar`** ⚠️ *construir primero, todo depende de esto*
- [x] `isVentanaAbierta`, `getFechaOperacion`, `getSiguienteDiaHabil`, `isDiaNoLaborable`, `isSabado`
- [x] Tests: cambio de día a medianoche, sábado, domingo, feriado, pedido a las 23:59, a las 14:59
- [x] Zona `America/Guatemala` fija; ningún `new Date()` fuera del módulo

**F-004 · Autenticación y roles**
- [x] Login con cookie httpOnly + argon2id
- [x] Roles `ADMIN_JEFE | ADMIN | PRODUCCION | TIENDA | REPARTO`
- [x] `ADMIN_JEFE` puede delegar permisos granulares
- [x] Cuenta individual por persona; sin cuentas compartidas

**F-005 · Auditoría y eventos**
- [x] `audit_log` append-only con actor, acción, entidad, antes/después, IP, user-agent
- [x] `domain_events` + `outbox` con constraint única de idempotencia
- [x] Worker que drena el outbox con reintentos vía pg-boss
- [x] Test: reinicio a mitad de proceso no duplica ni pierde mensajes

**F-006 · Almacenamiento de archivos**
- [x] URLs prefirmadas contra R2; el browser sube directo, los bytes no pasan por la API
- [x] Tabla `Asset` polimórfica con claves content-addressed (sha256)
- [x] Variantes de imagen generadas al subir

### E1 — Catálogo y clientes *(semana 2)*

**F-101 · CRUD de productos**
- [x] Campos de `AGENTS.md` §5; foto opcional; orden arrastrable
- [x] Desactivación en lugar de borrado
- [x] Agrupación visual por `familia`

**F-102 · CRUD de clientes**
- [x] Datos, teléfono WA, `horario_entrega_fijo`, `notas_permanentes`, `limite_facturas_pendientes`
- [x] Generación y rotación del token de portal

**F-103 · Alias y precios por cliente**
- [x] `ClienteProducto` con alias, precio, `nota_produccion`, favorito y orden
- [x] El portal no auto-crea ligas: solo se pide un producto con precio cargado (D3)
- [x] Vista de gestión rápida: un cliente, todos sus productos, edición en línea

**F-104 · Importador CSV**
- [x] Plantilla descargable para clientes y para productos
- [x] Validación por fila con vista previa y reporte de errores antes de confirmar
- [x] Importación parcial permitida (para que carguen por partes)

### E2 — Portal del cliente *(semanas 3–4)*

**F-201 · Acceso por token**
- [x] `/p/{token}`, sin login; token hasheado en BD; rate limit por token e IP
- [x] Cada apertura registrada en `audit_log`
- [x] Token revocado ⇒ 404 genérico, sin filtrar información

**F-202 · Captura de pedido**
- [x] Favoritos del cliente arriba con **su** alias y **su** precio; catálogo completo debajo
- [x] Solo se captura cantidad
- [x] Confirmación con subtotal antes de enviar
- [x] Mobile-first, usable en menos de un minuto

**F-203 · Ventana horaria**
- [x] Validada en servidor; fuera de horario informa la próxima ventana disponible
- [x] Nunca confiar en el reloj del navegador

**F-204 · Edición hasta el cierre**
- [x] El cliente puede editar su pedido mientras la ventana esté abierta
- [x] Cada edición al `audit_log` con diff; el pedido **no** se versiona
- [x] Cancelar no está permitido desde el portal (debe llamar)

**F-205 · Estado de cuenta del cliente**
- [x] Facturas pendientes, montos, antigüedad, desde el mismo enlace

### E3 — Panel de pedidos *(semana 4)*

**F-301 · Bandeja de pedidos**
- [x] Filtro por fecha de operación, cliente y estado
- [x] Se permiten varios pedidos del mismo cliente el mismo día
- [x] Correlativo simple; la fecha es campo aparte

**F-302 · Pedido manual**
- [x] Captura desde el panel para pedidos recibidos por llamada
- [x] Salta la ventana horaria, con `origen: MANUAL` y registro de quién lo capturó
- [x] UI cuidada: es un flujo frecuente (caso "tienda 6")

**F-303 · Tiempo real por SSE**
- [x] Nuevo pedido y cambio de estado se propagan a las pantallas abiertas
- [x] Reconexión automática; invalidación de TanStack Query

**F-304 · Notas extraordinarias**
- [x] Campo libre por pedido, para casos puntuales
- [x] Las notas fijas (horario, punto de carga, grosor) **no** se escriben a mano: derivan del catálogo

### E4 — Operación diaria *(semana 5)*

**F-401 · Cierre y consolidación**
- [ ] Al cerrar la ventana se materializa la hoja del día (no antes)
- [ ] Emite `VentanaPedidoCerrada`

**F-402 · Hoja de producción**
- [ ] Agrupada por punto de carga; regla de sábado aplicada (todo desde planta)
- [ ] Horarios fijos y notas de producción impresos automáticamente
- [ ] Formato reconocible respecto al mensaje actual (§4)

**F-403 · Vistas por rol**
- [ ] Misma información, distintas acciones: producción, tienda, reparto

**F-404 · Exportación de respaldo**
- [ ] Hoja del día en texto y PDF, enviable por WhatsApp
- [ ] Plan B si falla la conexión en planta de madrugada

**F-405 · Reapertura de día cerrado**
- [ ] Solo `ADMIN_JEFE`, con motivo obligatorio
- [ ] No se reenvían mensajes ya enviados
- [ ] Al recerrar: hoja **versión 2 con cambios resaltados**
- [ ] Todo en `audit_log`

### E5 — Cobranza *(semana 6)*

**F-501 · Entrega y cantidades reales**
- [ ] `cantidad_entregada` por línea, por defecto igual a lo pedido
- [ ] La factura se calcula sobre lo **entregado**

**F-502 · Captura del número de DTE**
- [ ] Carla registra el número de factura del sistema externo
- [ ] Es la llave que conecta pedido entregado ↔ cuenta por cobrar

**F-503 · Pagos y abonos**
- [ ] `Pago` como tabla propia: monto, método, fecha, comprobante
- [ ] Factura pagada cuando la suma de pagos cubre el total
- [ ] Soporta abonos parciales

**F-504 · Comprobantes adjuntos**
- [ ] Foto de transferencia o recibo desde el celular, asociada al pago

**F-505 · Control de cartera**
- [ ] Contador de facturas pendientes por cliente con límite configurable
- [ ] Alerta al superar el límite, con acción de recordatorio
- [ ] Filtros por cliente, rango de fechas y método de pago
- [ ] Cuadre diario con repartidor y corte quincenal

### E6 — Dashboard *(semana 6)*

**F-601 · Tablero del administrador**
- [ ] Operación del día: pedidos recibidos, monto, **clientes que aún no piden**, estado de ruta
- [ ] Cartera: saldo total, efectivo vs transferencia, sobre límite, antigüedad por tramos
- [ ] Ventas: por día/semana/quincena, comparativo, participación por cliente
- [ ] Productos: volumen por presentación y punto de carga
- [ ] Cliente: frecuencia, ticket promedio, tiempo de pago, **alerta de cliente que dejó de pedir**
- [ ] Adopción: portal vs manual

**F-602 · Exportación a PDF**
- [ ] Con `@react-pdf/renderer`, sin Chrome headless
- [ ] Cierre de quincena listo para imprimir

### E7 — Mensajería *(semana 7)*

**F-701 · Alta con Embedded Signup**
- [ ] Registro asistido bajo la app de Tech Provider
- [ ] Tokens cifrados en reposo; suscripción de webhooks por WABA

**F-702 · Webhooks**
- [ ] Dedupe por `wa_message_id` UNIQUE
- [ ] `ventana_expira_at` desde el timestamp del webhook
- [ ] Callbacks de estado: sent / delivered / read / failed

**F-703 · Registro de plantillas**
- [ ] Sincronizado desde Graph API + webhook de cambio de estado
- [ ] Nombres nunca hardcodeados

**F-704 · Bandeja de conversaciones**
- [ ] Vista general y conversación por cliente
- [ ] Estado de ventana visible con countdown
- [ ] Composer bloqueado a plantillas cuando la ventana está cerrada

**F-705 · Automatizaciones**
- [ ] Invitación diaria programada (18:00) con botón URL y token
- [ ] Confirmación de pedido recibido
- [ ] Recordatorio de cobro con estado de cuenta en PDF adjunto

**F-706 · Validador y preview**
- [ ] Sin saltos de línea, sin >4 espacios, longitud bajo el límite, sin variables vacías
- [ ] Preview renderizado obligatorio antes de enviar

### E8 — Offline *(semana 7)*

**F-801 · PWA con cola local**
- [ ] Instalable; acciones de reparto encoladas en IndexedDB
- [ ] Sincronización al recuperar señal, con `idempotency_key` de cliente
- [ ] **UI honesta**: indicador de pendiente-de-sincronizar; nunca mostrar éxito sin confirmación

### E9 — Puesta en marcha *(semana 8)*

- [ ] **F-901 · Carga de datos reales**
- [ ] **F-902 · Pruebas con el equipo** — Tony y Carla usándolo de verdad, no una demo
- [ ] **F-903 · Respaldos** — `pg_dump` semanal a R2, además de los del proveedor
- [ ] **F-904 · Observabilidad** — pino, Sentry, `/health`
- [ ] **F-905 · Manual y capacitación**

---

## 7. Orden recomendado

```
F-003  BusinessCalendar          ← primero, todo depende de esto
F-002  Esquema + seed
F-001  Infra y CI
F-005  Auditoría y outbox        ← antes de cualquier feature que escriba datos
F-004  Auth y roles
F-006  Storage
E1 → E2 → E3 → E4 → E5 → E6 → E7 → E8 → E9
```

Dos dependencias que no se pueden invertir:

- **`BusinessCalendar` antes que cualquier cosa con fechas.** Si se construye después, la lógica
  de zona horaria queda dispersa y es un infierno recogerla.
- **`audit_log` y `outbox` antes que las features de escritura.** Agregarlos después obliga a
  volver a tocar cada servicio.

---

## 8. Definición de terminado

Una feature está lista cuando:

- [ ] Cumple todos sus criterios de aceptación
- [ ] Respeta las reglas duras de `CLAUDE.md` §2 (centavos, snapshot, zona horaria, sin borrado, idempotencia, auditoría)
- [ ] Tiene tests donde hay riesgo de pérdida de dinero o de datos
- [ ] Funciona en pantalla de celular (375 px) si algún actor la usa desde ahí
- [ ] Los errores muestran un mensaje entendible, no un stack trace
- [ ] No introduce dependencias prohibidas (`CLAUDE.md` §12)
- [ ] Los textos de UI usan el vocabulario del glosario (§2), incluido **"Pagado"** y no "Cancelado"

---

## 9. Restricciones del proyecto

| | |
|---|---|
| **Plazo** | 8 semanas desde la aprobación |
| **Costo de desarrollo** | Sin costo. Alcance cerrado por escrito |
| **Presupuesto operativo** | US$ 38–53/mes, del cliente. **Condiciona decisiones técnicas** (ver `CLAUDE.md` §3.2) |
| **Bloqueador externo** | Verificación de negocio ante Meta: 1–3 semanas, fuera de control. Por eso existe `FakeWhatsAppAdapter` |
| **Riesgo real de calendario** | Que el listado de clientes, productos y precios llegue tarde. El importador (F-104) existe para mitigarlo |

### Fuera de alcance (fases posteriores)

Facturación electrónica embebida · módulo de producción · inventario e insumos · apps nativas ·
pagos en línea · optimización de rutas · migración de histórico previo.

**No los construyas.** La arquitectura está preparada para recibirlos: módulos con fronteras por
eventos, clasificación de producto por unidad y tipo de fabricación, y almacenamiento de archivos
genérico. Eso es todo lo que corresponde hacer ahora.