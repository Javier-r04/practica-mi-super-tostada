Franja de estado de conexión y de la cola offline. Va pegada bajo la barra superior en la app de reparto.

```jsx
<OfflineBanner online={false} pendientes={2} />
<OfflineBanner online pendientes={2} onReintentar={sincronizar} />
<OfflineBanner online pendientes={2} sincronizando />
```

Devuelve `null` cuando hay señal y la cola está vacía: sin ruido cuando todo está bien.
