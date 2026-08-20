Contador de facturas pendientes contra el límite del cliente, con el saldo debajo.

```jsx
<ContadorFacturas pendientes={3} limite={4} montoCentavos={186500} />
<ContadorFacturas pendientes={5} limite={4} montoCentavos={412000} />   {/* rojo + aviso */}
```

Cuenta facturas, nunca pedidos. Un pedido está pagado cuando la suma de sus pagos alcanza el monto de la factura, así que el estado nunca es un booleano.
