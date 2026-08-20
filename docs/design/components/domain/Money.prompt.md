Monto en quetzales a partir de **centavos enteros**. Toda cifra de dinero en la interfaz pasa por aquí.

```jsx
<Money centavos={124050} />                     {/* Q 1,240.50 */}
<Money centavos={482050} size="xl" tone="accent" />
<Money centavos={saldo} tone={saldo > 0 ? 'pendiente' : 'pagado'} />
```

Nunca le pases `12.5`. Si tienes un decimal en la mano, el error está más arriba en el stack.
