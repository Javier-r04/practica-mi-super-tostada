Modal de confirmación con línea de acento arriba y pie de acciones.

```jsx
<Dialog open={abierto} tone="warning" title="Reabrir el día 19 de agosto"
  description="No se reenvían los mensajes ya enviados. Al cerrar de nuevo se genera hoja versión 2 con los cambios resaltados."
  onClose={cerrar}
  footer={<><Button variant="secondary" onClick={cerrar}>Cancelar</Button><Button variant="danger">Reabrir día</Button></>}>
  <Textarea label="Motivo" required rows={3} />
</Dialog>
```

Si la acción es irreversible, el motivo es obligatorio y queda en `audit_log`.
