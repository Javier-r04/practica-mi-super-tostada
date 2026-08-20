Campo de texto con rótulo, ayuda y error. Exporta también `Field` para envolver controles propios.

```jsx
<Input label="Monto cobrado" prefix="Q" inputMode="decimal" placeholder="0.00" />
<Input label="Número de DTE" error="Ese DTE ya está registrado" defaultValue="A-00918273" />
<Field label="Método de pago"><RadioGroup … /></Field>
```

Recuerda: el dinero se guarda en centavos enteros. El campo captura texto, el submit convierte.
