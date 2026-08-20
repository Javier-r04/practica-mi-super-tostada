Interruptor de ajuste con efecto inmediato; el rótulo va a la izquierda y el control a la derecha.

```jsx
<Switch label="Cliente activo" description="Desactivar no borra su historial" checked={activo} onChange={setActivo} />
```

Nunca lo uses para confirmar una acción destructiva: eso es `Dialog` con motivo obligatorio.
