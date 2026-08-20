Barra superior con título y subtítulo. Verde marca por defecto; `tone="light"` dentro del panel de escritorio.

```jsx
<TopBar title="Pedido 1042" subtitle="Restaurante Doña Marta · entrega 08:30"
  left={<BackButton onClick={volver} />} right={<VentanaBadge abierta expiraEn={ms} size="sm" />} />
```

El subtítulo casi siempre lleva la `fecha_operacion` o el horario de entrega: es el dato que la gente busca primero.
