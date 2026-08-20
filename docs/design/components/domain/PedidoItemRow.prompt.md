Fila de ítem de pedido: nombre snapshot, alias del cliente, cantidad, punto de carga y total.

```jsx
<PedidoItemRow nombreMostrado="Tortilla n.º 16" alias="tortilla grande" unidadMedida="LIBRA"
  cantidad={40} precioUnitarioCentavos={450} puntoCarga="PLANTA" />
<PedidoItemRow nombreMostrado="Papalinas" cantidad={12} cantidadEntregada={10}
  unidadMedida="BOLSA" precioUnitarioCentavos={1500} />
<PedidoItemRow editable cantidad={cant} onChangeCantidad={setCant} … />
```

Con `editable` aparece el stepper y desaparece el total: es la captura, no el cierre.
