Navegación lateral del panel interno (solo escritorio; en móvil se usa `BottomNav`).

Fondo `--surface-nav` (blanco). Ítem activo: `--surface-nav-active` + filo `--nav-rail`. Las vistas futuras usan `soon: true` y el rótulo "Pronto"; no las ocultes.

```jsx
<SidebarNav activeId={vista} onSelect={setVista}
  header={<Marca />} footer={<Usuario nombre="Cristian" rol="ADMIN_JEFE" />}
  items={[
    { id: 'hoy', label: 'Hoy', icon: 'sun', soon: true },
    { id: 'pedidos', label: 'Pedidos', icon: 'clipboard-list', badge: 18 },
    { id: 'catalogo', label: 'Catálogo', icon: 'package' },
    { id: 'cartera', label: 'Cartera', icon: 'banknote', badge: 7 },
  ]} />
```

Los ítems siguen los módulos del sistema; no agrupes en submenús: son pocos y se usan de madrugada.
