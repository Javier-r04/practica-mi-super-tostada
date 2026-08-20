Aviso de resultado con borde de acento a la izquierda.

```jsx
<Toast tone="exito" title="Cobro registrado" description="Q 1,240.00 en efectivo · pedido 1042" onDismiss={cerrar} />
<Toast tone="aviso" title="Guardado en este teléfono" description="Se enviará al recuperar señal" />
<Toast tone="error" title="Meta rechazó el envío" description="Código 131047: fuera de la ventana de 24 h" action={<Button size="sm" variant="secondary">Usar plantilla</Button>} />
```

Regla: nunca `exito` sin confirmación del servidor.
