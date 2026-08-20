Chip para alias de cliente, favoritos y filtros activos.

```jsx
<Tag tone="brand" onRemove={quitarFiltro}>tortilla grande</Tag>
<Tag tone="accent" icon={<Icon name="star" size={14} />}>Favorito</Tag>
```

Se distingue de `Badge`: `Tag` es un dato que el usuario puede quitar, `Badge` es un estado que el sistema calcula.
