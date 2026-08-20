# Mi Súper Tostada · Sistema de diseño

Fábrica de tortillas, tostadas y frituras en Quetzaltenango, Guatemala (est. 2000). Vende al mayoreo a restaurantes, comedores y tiendas. Lema de marca: *"Un concepto diferente de comer maíz"*. Promesa repetida en todo su material: **higiene, calidad y servicio**.

Este sistema de diseño cubre dos territorios que comparten paleta pero no tono:

1. **Material de marca** — piezas promocionales para redes y punto de venta: verde a sangre, titulares enormes en amarillo, fotografía de planta y de producto, corte de papel crema.
2. **Sistema de pedidos y cobranza** — la aplicación interna descrita en el `CLAUDE.md` del proyecto: portal del cliente sin login, panel interno nocturno y PWA de reparto. Es una herramienta operativa que se usa de madrugada y en la calle, así que hereda los colores de la marca pero baja el volumen.

## Fuentes recibidas

| Fuente | Qué aportó |
|---|---|
| `uploads/Screenshot 2026-08-19 at 9.29.28 PM.png` | Dos piezas promocionales (26.º aniversario y Día Nacional del Maíz). Única fuente visual de la marca: logotipo, paleta, tipografía de titulares, fotografía y contactos (77617902 / WhatsApp 30597359) |
| `CLAUDE.md` pegado en el brief | Dominio completo del sistema de pedidos y cobranza: personas (Cristian, Alex, Carla, Tony), reglas duras (dinero en centavos, nada se borra, zona horaria, idempotencia), modelo de entidades, ventana de pedido, restricciones de WhatsApp, offline |

**No se recibió** repositorio de código, archivo de Figma, guía de marca, ni archivos de fuente. Las decisiones visuales de este sistema se derivan de esas dos fuentes; donde hubo que elegir, se documenta abajo.

## Personas del producto

| Nombre | Rol | Consecuencia de diseño |
|---|---|---|
| Cristian | Administrador jefe | Trabaja de 21:00 a 24:00. Densidad alta, teclado antes que ratón, un solo botón para cerrar la noche |
| Alex | Producción | Arranca de madrugada; solo le importan las tortillas. Hoja impresa, cifras grandes, agrupada por punto de carga |
| Carla | Tienda y facturación | Captura el número de DTE de un sistema externo. Campos monoespaciados y validación inmediata |
| Tony | Reparto | Calle, guantes, señal irregular. 52 px de área táctil y estados de sincronización honestos |
| Restaurantes | Clientes | Piden tarde desde el teléfono. Sin login, sus propios nombres de producto, cuenta atrás visible |

---

## CONTENT FUNDAMENTALS

**Idioma: español de Guatemala.** Sustantivos de dominio en español incluso en código (`Pedido`, `punto_carga`, `fecha_operacion`); todo lo técnico en inglés. En interfaz nunca se traduce el vocabulario del negocio: *papalinas*, *tortilla n.º 16*, *punto de carga*, *hoja de producción*, *fecha de operación*.

**Tratamiento.** Al cliente, **usted** ("Su pedido llega el jueves 20 a las 08:30"). Al personal interno, imperativo directo sin sujeto ("Cerrar ventana y generar hoja", "Registrar cobro"). Nunca "nosotros" corporativo salvo cuando el sistema explica una acción propia: "Le confirmamos por WhatsApp".

**Registro.** Matter-of-fact, corto, sin adornos. La interfaz dice qué pasó y qué sigue:
- ✅ "Guardado en este teléfono. Se enviará al recuperar señal."
- ✅ "Meta rechazó el envío. Código 131047: fuera de la ventana de 24 h."
- ✅ "El pedido no se borra: queda anulado con motivo y sigue visible en el historial."
- ❌ "¡Ups! Algo salió mal 😅"
- ❌ "Estamos procesando su solicitud, por favor espere…"

**Honestidad de estado** es la regla de copy más importante. Nada dice "listo", "enviado" ni "cobrado" antes de que el servidor confirme. Si el dato está en la cola local, el texto lo dice con esas palabras: *en este teléfono*.

**Rótulos.** Sustantivo, sin artículo, en versalitas: `FECHA DE OPERACIÓN`, `PUNTO DE CARGA`, `FACTURAS PENDIENTES`, `MÉTODO DE PAGO`. Los botones son verbo + objeto: "Confirmar pedido", "Registrar pago", "Reabrir día". Nunca "Aceptar" / "OK" a secas.

**Números y dinero.** Siempre `Q 1,240.50` — símbolo, espacio fino, coma de miles, dos decimales, aun cuando sean `.00`. Cantidades con su unidad pegada al número: `40 lb`, `12 bolsas`. Correlativos con almohadilla y monoespaciado: `#1042`. Fechas largas en interfaz ("jueves 20 de agosto"), cortas en tablas ("18 ago"). Horas en 24 h: `21:04`.

**Material promocional** cambia de registro: exclamaciones, mayúsculas, cifras redondas y agradecimiento a la ciudad. "¡GRACIAS QUETZALTENANGO!", "CUMPLIMOS 26 AÑOS DE HIGIENE, CALIDAD Y SERVICIO", "¡UN CONCEPTO DIFERENTE DE COMER MAÍZ!", "VENDE NUESTROS PRODUCTOS EN TU TIENDA O COMERCIO". Ahí sí se tutea ("tu tienda") y se grita. Ese tono **no entra** en la aplicación.

**Emoji: no.** Ni en la interfaz ni en las plantillas de WhatsApp. El material promocional no usa ninguno; el sistema tampoco.

---

## VISUAL FOUNDATIONS

### Color
Verde profundo de maíz y amarillo rótulo, muestreados del material entregado (`#002e03` → `#005002` de fondo, `#fcfa0a` de titular, `#e9d145` del relieve dorado). El sistema los normaliza en escalas: `--green-800 #0E4E15` es el verde de marca en interfaz, `--yellow-400 #FFE100` el acento, `--gold-500 #D8B437` el oro del relieve promocional.

Reglas de uso:
- **Un solo amarillo por pantalla.** El amarillo es la acción que cierra la noche, la que cobra, la que confirma. Si hay dos, ninguna destaca.
- El verde profundo se usa a sangre (barra lateral, encabezado móvil, tarjeta de resumen), **nunca** como fondo de un formulario.
- Neutros cálidos tintados hacia el papel (`--ink-*`, base `#17190F`). Nada de gris azulado.
- Crema `#F6F1E4` es "papel": recrea el corte de ola del material impreso y viste las tarjetas de contenido para leer/imprimir.
- Semánticos: rojo `#B3231C` mora y anulación, ámbar `#C77A02` pendiente y cola offline, azul `#1D6A8C` informativo. El verde ya significa "pagado / entregado", así que no se usa para "activo" genérico.
- Los estados de dominio tienen color fijado por enum (`--estado-*`): el mismo estado se ve idéntico en panel, portal y reparto.

### Tipografía
El producto usa **una sola grotesca y un mono**. El material promocional puede gritar; la app no.

| Rol | Familia | Uso |
|---|---|---|
| Interfaz y cifras de tablero | **IBM Plex Sans** | Todo el producto: 400 / 500 / 600. Cuerpo 14 px, H1 24 px. Nunca peso 700. |
| Datos | **IBM Plex Mono** | Correlativos, SKU, DTE, `wa_message_id` |
| Promo (fuera de la app) | **Anton** / **Kaushan Script** | Solo piezas de marca. No se cargan en Next.js. |

Los montos usan Plex Sans con `font-variant-numeric: tabular-nums`. Rótulos: 12 px, 600, `letter-spacing: .08em`, mayúsculas. `Money` `xl` es el mismo corte a 24 px, no una familia display.

### Espaciado y layout
Escala de 4 px; 8/12/16 hacen el 80% del trabajo. Canal de 16 px en móvil, 24 px en escritorio. Ancho máximo de contenido 1240 px; barra lateral fija de 248 px; barra superior de 56 px; barra inferior móvil de 64 px. Fila de tabla o lista: 52 px. **Mínimo táctil 44 px**, 52 px en acciones de reparto. Nada fijo salvo las barras y el pie de acción del móvil (el total del pedido siempre visible sobre el catálogo).

### Fondos, imagen y textura
La aplicación es plana: `--surface-page #F7F7F4` y tarjetas blancas. Sin gradientes decorativos, sin ruido, sin patrones.

El material promocional sí tiene textura: verde a sangre con un rayado vertical sutilísimo, fotografía de planta y de mazorcas a sangre en la mitad del lienzo, y el corte de papel crema irregular separando foto de titular. La fotografía disponible es cálida y saturada: verde institucional, amarillo de maíz, blanco de uniforme e higiene. Producto en primer plano, personas de la planta en uniforme, maquinaria limpia. Nada en blanco y negro, nada con grano.

Sobre foto siempre va un degradado de protección (`--scrim-bottom`, `--scrim-top`), nunca una cápsula translúcida: el material de marca resuelve la legibilidad con bloques sólidos de amarillo o verde, y el sistema mantiene ese criterio.

### Bordes, radios y sombras
Campos y botones 6 px; tarjetas 14 px; cápsulas 999 px. Esquinas rectas solo en tablas y encabezados a sangre. Borde de 1 px `--ink-200` en tarjetas, 2 px en controles seleccionables (radio, casilla), 3 px de filo de acento en el ítem de navegación activo y arriba del modal.

Sombras cálidas y bajas, tintadas con el negro del sistema (`rgba(23,25,15,…)`): `--shadow-sm` en tarjetas, `--shadow-md` en tarjeta de marca y avisos, `--shadow-lg` solo en modal. Los campos llevan sombra interior de 1 px para leerse como huecos. Nada brilla ni tiene halo de color.

### Transparencia y desenfoque
Casi nunca. El velo del modal es `rgba(3,28,6,.55)` — verde muy oscuro, no negro neutro. **Sin `backdrop-filter`**: la app corre en teléfonos modestos y la nitidez importa más que el efecto.

### Movimiento
Corto y funcional: 130 ms en controles, 200 ms en cambios de superficie, 320 ms como máximo. `cubic-bezier(.2,.8,.3,1)` de salida. Nada rebota, nada escala al entrar, nada se desliza más de 8 px. Se respeta `prefers-reduced-motion` reduciendo todo a 0 ms.

### Estados de interacción
- **Hover:** el sólido aclara un paso (verde 800 → 700); el contorno tiñe el fondo (`--ink-50`); el fantasma tiñe verde claro (`--green-50`). Nunca opacidad como hover.
- **Press:** `scale(.985)`, sin cambio de color adicional. En sólidos oscuros se percibe como una compresión.
- **Foco:** anillo de 3 px `rgba(43,154,61,.32)` más borde verde; en error, anillo rojo. Visible siempre — se navega con teclado a las 23:00.
- **Deshabilitado:** opacidad .45 y cursor de bloqueo, sin cambiar el color base, para que se lea qué acción era.
- **Seleccionado:** fondo `--green-50` + borde de 2 px verde + peso 600. En navegación, filo amarillo de 3 px.

### Tarjetas
Blanco, radio 14 px, borde de 1 px, `--shadow-sm`, encabezado con título de 18 px y subtítulo de 13 px apagado. Variantes: `paper` (crema, contenido de lectura o impresión), `brand` (verde profundo, un bloque de resumen por vista), `accent` (amarillo claro, avisos que requieren decisión). Cuando el hijo es una tabla o lista, el cuerpo va a sangre (`flush`).

---

## ICONOGRAPHY

**No se recibió ningún set de iconos**: la única pieza gráfica del material entregado es el logotipo (mazorcas dentro de un óvalo dorado) y la fotografía. No hay fuente de iconos, ni sprite, ni SVG sueltos.

**Sustitución declarada:** **Lucide** vía `lucide-react` (no CDN), trazo de 2 px, sin relleno, esquinas redondeadas — la familia más cercana al trazo limpio y funcional que pide una herramienta operativa. Se accede siempre por el componente `Icon`, nunca con SVG a mano.

Tamaños: 16 px en filas densas, 20 px por defecto, 22 px en barra inferior, 14 px dentro de cápsulas. Color heredado (`currentColor`); en verde de marca o ámbar solo cuando el icono es el único portador del estado.

Vocabulario en uso: `clipboard-list` pedidos · `factory` producción · `store` tienda · `truck` / `route` reparto · `banknote` efectivo · `arrow-left-right` transferencia · `receipt-text` factura/DTE · `message-circle` WhatsApp · `clock` ventana abierta · `lock` ventana cerrada · `cloud-off` sin señal · `refresh-cw` sincronizando · `camera` comprobante · `printer` hoja de producción · `map-pin` zona de entrega.

**Emoji y unicode como icono: no.** La única excepción son los signos `−` / `+` del contador de cantidad y `×` del chip, que son tipografía, no iconografía.

**Logotipo.** `apps/web/public/brand/logo-badge.png` es un recorte del material promocional entregado: 222×195 px, con fondo verde incrustado. Sirve para maquetas a tamaño pequeño (34–40 px en barras). **No hay original vectorial ni versión sin fondo.** No se ha redibujado ni reconstruido el logotipo. Ver *Pendientes*.

---

## Sustituciones y decisiones a confirmar

1. **Fuentes.** No se recibieron archivos de agencia. En producto se usa **IBM Plex Sans + IBM Plex Mono** (`@fontsource`, pesos 400–600, escala más chica) porque Anton/Barlow resultaban grandes y poco monótonos para una herramienta nocturna. Anton y Kaushan Script quedan documentados para promo y no se cargan. Si llegan las fuentes originales, se reemplazan aquí.
2. **Iconos.** `lucide-react`, como se explica arriba.
3. **Logotipo.** Solo existe el recorte de baja resolución. Falta el archivo vectorial (SVG/AI/EPS), la versión sobre fondo claro y la versión monocromática.
4. **Fotografía.** Los tres recortes de `apps/web/public/brand/` vienen del mismo screenshot y son de baja resolución. Sirven de referencia de tono, no para producción.
5. **UI kits.** No había interfaz previa ni repositorio: las pantallas se derivan del `CLAUDE.md` (dominio y reglas), no de un producto existente.

## Adiciones intencionales

El brief no traía inventario de componentes, así que se autoría un conjunto estándar (botón, campos, tarjeta, cápsulas, pestañas, modal, aviso, navegación). Además, seis componentes de dominio existen porque las reglas duras del sistema los exigen y evitan que cada pantalla reinvente la regla:

| Componente | Razón |
|---|---|
| `Money` | El dinero vive en centavos enteros; este es el único lugar donde se vuelve texto |
| `EstadoBadge` | Fija el color de cada enum de estado, compartido por las tres superficies |
| `VentanaBadge` | La ventana de pedido y la de 24 h de Meta se muestran igual en todas partes |
| `PedidoItemRow` | Nombre y precio snapshot, alias del cliente y ajuste de lo entregado en una sola fila |
| `ContadorFacturas` | El contador cuenta facturas contra el límite del cliente, no pedidos |
| `MensajePreview` | El preview renderizado antes de enviar es obligatorio por las restricciones de Meta |
| `Icon` | Envoltorio del set sustituto (Lucide) para no dispersar SVG por el proyecto |

---

## Índice del proyecto

| Ruta | Qué es |
|---|---|
| `DESIGN.md` | Guía de implementación: tokens en uso, reglas visuales, copy, especificación por pantalla, estados obligatorios, impresión y checklist |
| `apps/web/src/styles/styles.css` | Punto de entrada de CSS de producción (solo `@import` de tokens) |
| `apps/web/src/styles/tokens/` | Colores, tipografía Plex, espaciado, forma, movimiento, base |
| `apps/web/public/brand/` | `logo-badge.png` y tres recortes fotográficos |
| `components/core/` | `Button`, `Icon`, `Card`, `Badge`, `Tag`, `Tabs` |
| `components/forms/` | `Input` + `Field`, `Textarea`, `Select`, `Checkbox`, `RadioGroup`, `Switch`, `QuantityStepper`, `SearchField` |
| `components/feedback/` | `Dialog`, `Toast`, `EmptyState`, `OfflineBanner` |
| `components/navigation/` | `TopBar` + `BackButton`, `SidebarNav`, `BottomNav` |
| `components/domain/` | `Money` + `formatearCentavos`, `EstadoBadge`, `VentanaBadge`, `PedidoItemRow`, `ContadorFacturas`, `MensajePreview` |
| `ui_kits/panel/` | Panel interno de escritorio (6 vistas) |
| `ui_kits/portal/` | Portal del cliente en `/p/{token}`, móvil (3 pasos) |
| `ui_kits/reparto/` | PWA de reparto con cola offline (4 vistas) |
| `SKILL.md` | Descriptor para usar este sistema como skill de agente |

Cada directorio de componentes trae su ficha `*.card.html`, y cada componente su `.d.ts` (contrato de props) y su `.prompt.md` (qué es, cuándo usarlo, ejemplo).
