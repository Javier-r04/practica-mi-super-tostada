const { Card, Button, Badge, Icon, Money, EstadoBadge, VentanaBadge, PedidoItemRow, SearchField, Tag, Tabs, Select, Textarea, Dialog, EmptyState } = window.MiSPerTostadaDesignSystem_679973;

function PedidosScreen() {
  const D = window.MST_DATA;
  const cliente = window.mstCliente;
  const [sel, setSel] = React.useState(D.pedidos[0].correlativo);
  const [q, setQ] = React.useState('');
  const [items, setItems] = React.useState(() => D.pedidos[0].items.map((i) => ({ ...i })));
  const [anular, setAnular] = React.useState(false);
  const pedido = D.pedidos.find((p) => p.correlativo === sel);
  const c = cliente(pedido.clienteId);
  React.useEffect(() => { setItems(pedido.items.map((i) => ({ ...i }))); }, [sel]);
  const total = items.reduce((a, i) => a + Math.round(i.cantidad * i.precioUnitarioCentavos), 0);
  const lista = D.pedidos.filter((p) => !q || cliente(p.clienteId).nombre.toLowerCase().includes(q.toLowerCase()) || String(p.correlativo).includes(q));

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 'var(--space-4)', alignItems: 'start' }}>
      <Card flush padding="md" title="Pedidos" subtitle={D.fechaOperacion}>
        <div style={{ padding: '0 var(--space-4) var(--space-3)' }}>
          <SearchField value={q} onChange={setQ} placeholder="Cliente o correlativo" />
        </div>
        <div style={{ borderTop: '1px solid var(--border-subtle)' }}>
          {lista.length === 0 && <EmptyState size="sm" icon="search-x" title="Sin resultados" description="Prueba con el alias del cliente." />}
          {lista.map((p) => {
            const activo = p.correlativo === sel;
            return (
              <button key={p.correlativo} onClick={() => setSel(p.correlativo)} style={{ display: 'grid', gap: 2, width: '100%', padding: 'var(--space-3) var(--space-4)', border: 0, borderLeft: `3px solid ${activo ? 'var(--green-800)' : 'transparent'}`, borderBottom: '1px solid var(--border-subtle)', background: activo ? 'var(--green-50)' : 'transparent', cursor: 'pointer', textAlign: 'left' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-2xs)', color: 'var(--text-muted)' }}>#{p.correlativo}</span>
                  <span style={{ flex: 1, fontSize: 'var(--text-sm)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cliente(p.clienteId).nombre}</span>
                  <EstadoBadge estado={p.estado} size="sm" />
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-2)', fontSize: 'var(--text-2xs)', color: 'var(--text-muted)' }}>
                  <span>{p.origen === 'PORTAL' ? 'Portal' : 'Manual'} · {p.hora}</span>
                  <span style={{ marginLeft: 'auto' }}><Money centavos={p.totalCentavos} size="sm" tone="muted" /></span>
                </div>
              </button>
            );
          })}
        </div>
      </Card>

      <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
        <Card padding="md">
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-4)' }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <h2 style={{ fontSize: 'var(--text-xl)' }}>{c.nombre}</h2>
                <EstadoBadge estado={pedido.estado} />
                <Badge tone={pedido.origen === 'PORTAL' ? 'green' : 'neutral'} size="sm">{pedido.origen}</Badge>
              </div>
              <div style={{ marginTop: 4, display: 'flex', gap: 'var(--space-3)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                <span>Pedido #{pedido.correlativo} · capturado {pedido.hora}</span>
                <span>Entrega fija {c.entrega}</span>
                <span>{c.contacto} · {c.tel}</span>
              </div>
              {c.nota && <div style={{ marginTop: 8 }}><Tag tone="accent" icon={<Icon name="pin" size={13} />}>{c.nota}</Tag></div>}
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <VentanaBadge abierta expiraEn={D.ventanaRestanteMs} size="sm" />
              <Button size="sm" variant="secondary" onClick={() => setAnular(true)}>Anular</Button>
              <Button size="sm" variant="primary">Confirmar pedido</Button>
            </div>
          </div>
        </Card>

        <Card flush padding="md" title="Ítems" subtitle="Precio y nombre quedan en snapshot al confirmar"
          actions={<Select size="sm" options={[{ value: 'PLANTA', label: 'Carga: Planta' }, { value: 'DEMOCRACIA', label: 'Carga: Democracia' }]} />}>
          <div style={{ borderTop: '1px solid var(--border-subtle)' }}>
            {items.map((it, idx) => (
              <PedidoItemRow key={idx} {...it} editable
                onChangeCantidad={(v) => setItems((prev) => prev.map((x, i) => (i === idx ? { ...x, cantidad: v } : x)))} />
            ))}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--space-3) var(--space-4)', background: 'var(--ink-50)' }}>
              <span style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
                <Button size="sm" variant="ghost"><Icon name="plus" size={16} />Agregar producto</Button>
              </span>
              <span style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-3)' }}>
                <span className="mst-label">Total del pedido</span>
                <Money centavos={total} size="lg" />
              </span>
            </div>
          </div>
        </Card>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
          <Card title="Notas del administrador" padding="md">
            <Textarea rows={2} defaultValue="Confirmó por WhatsApp a las 21:02: “mañana igual que ayer”." />
          </Card>
          <Card title="Historial" subtitle="audit_log · quién hizo qué" padding="md">
            <div style={{ display: 'grid', gap: 8, fontSize: 'var(--text-xs)', color: 'var(--ink-700)' }}>
              {[['21:04', 'Cliente capturó el pedido desde el portal'], ['21:09', 'Cristian ajustó Papalinas 8 → 6 bolsas'], ['21:10', 'Cristian agregó nota del administrador']].map(([h, t]) => (
                <div key={h} style={{ display: 'flex', gap: 'var(--space-3)' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>{h}</span><span>{t}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <Dialog open={anular} tone="danger" title={`Anular el pedido #${pedido.correlativo}`}
        description="El pedido no se borra: queda anulado con motivo y sigue visible en el historial del cliente."
        onClose={() => setAnular(false)}
        footer={<><Button variant="secondary" onClick={() => setAnular(false)}>Cancelar</Button><Button variant="danger" onClick={() => setAnular(false)}>Anular pedido</Button></>}>
        <Textarea label="Motivo" required rows={2} hint="Obligatorio. Queda en audit_log con tu usuario." />
      </Dialog>
    </div>
  );
}

Object.assign(window, { PedidosScreen });
