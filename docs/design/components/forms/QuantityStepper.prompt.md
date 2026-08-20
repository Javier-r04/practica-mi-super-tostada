Contador de cantidad con botones táctiles. Es el control central de la captura de pedidos, en el portal y en el panel.

```jsx
<QuantityStepper value={cantidad} onChange={setCantidad} step={0.5} unidad="lb" size="lg" />
```

Usa `step={0.5}` para `unidad_medida: LIBRA`, `step={1}` para `BOLSA` y `UNIDAD`.
