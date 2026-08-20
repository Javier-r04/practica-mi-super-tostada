Indicador de ventana abierta/cerrada con cuenta atrás, para la ventana de pedido y la de 24 h de WhatsApp.

```jsx
<VentanaBadge abierta expiraEn={2*3600e3 + 14*60e3} />         {/* Ventana abierta · 2:14 */}
<VentanaBadge abierta={false} tipo="whatsapp" />                {/* Ventana WA cerrada */}
```

Con `abierta={false}` y `tipo="whatsapp"`, el redactor libre debe estar bloqueado en la misma pantalla: solo plantillas aprobadas.
