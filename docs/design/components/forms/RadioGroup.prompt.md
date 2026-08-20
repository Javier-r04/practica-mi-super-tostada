Opciones excluyentes como segmentos táctiles. Es el control del método de pago en reparto.

```jsx
<RadioGroup name="metodo" value={metodo} onChange={setMetodo} options={[
  { value: 'EFECTIVO', label: 'Efectivo', icon: <Icon name="banknote" size={18} /> },
  { value: 'TRANSFERENCIA', label: 'Transferencia', icon: <Icon name="arrow-left-right" size={18} /> },
]} />
```
