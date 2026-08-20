Tarjeta contenedora del panel y del portal.

```jsx
<Card title="Pedidos de hoy" subtitle="Ventana abierta hasta 00:00" actions={<Button size="sm" variant="secondary">Ver todos</Button>}>
  …
</Card>
<Card tone="paper" padding="lg">Resumen impreso</Card>
<Card flush padding="none"><ListaPedidos /></Card>
```

- `tone="brand"` solo para bloques de resumen o encabezados destacados, máximo uno por vista.
- `flush` cuando el hijo es una lista o tabla que debe llegar al borde.
