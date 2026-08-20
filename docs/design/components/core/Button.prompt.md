Botón de acción del sistema; `accent` amarillo para la acción principal de la pantalla, `primary` verde para todo lo demás.

```jsx
<Button variant="accent" size="lg" block onClick={cerrarVentana}>Cerrar ventana y generar hoja</Button>
<Button variant="secondary">Cancelar</Button>
<Button variant="danger" size="sm">Anular pedido</Button>
```

- `variant`: `primary` (verde marca), `accent` (amarillo rótulo, una sola por pantalla), `secondary` (contorno), `ghost`, `danger`.
- `size`: `sm` 36px · `md` 44px (mínimo táctil) · `lg` 52px para acciones en la calle.
- `loading` rotula "Guardando…"; no cambies el rótulo a éxito hasta que el servidor confirme.
