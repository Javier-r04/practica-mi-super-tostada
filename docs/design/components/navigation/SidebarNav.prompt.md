Navegación lateral del panel interno (solo escritorio; en móvil se usa `BottomNav`).

```jsx
<SidebarNav activeId={vista} onSelect={setVista}
  header={<Marca />} footer={<Usuario nombre="Cristian" rol="ADMIN_JEFE" />}
  items={[
    { id: 'hoy', label: 'Hoy', icon: 'sun' },
    { id: 'pedidos', label: 'Pedidos', icon: 'clipboard-list', badge: 18 },
    { id: 'cartera', label: 'Cartera', icon: 'banknote', badge: 7 },
  ]} />
```

Los ítems siguen los módulos del sistema; no agrupes en submenús: son pocos y se usan de madrugada.
