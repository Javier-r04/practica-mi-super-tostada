Pestañas para cambiar de vista dentro de una pantalla (cartera: todas / pendientes / vencidas).

```jsx
<Tabs activeId={tab} onSelect={setTab} tabs={[
  { id: 'todas', label: 'Todas', count: 42 },
  { id: 'pendientes', label: 'Pendientes', count: 7 },
]} />
```

Máximo 5 pestañas; si necesitas más, es un filtro, no una pestaña.
