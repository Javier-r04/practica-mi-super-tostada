const { TopBar, BackButton, Button, Card, Icon, Money, EstadoBadge, VentanaBadge, QuantityStepper, Tag, Badge, EmptyState, Toast, PedidoItemRow, ContadorFacturas, MensajePreview } = window.MiSPerTostadaDesignSystem_679973;

const PORTAL_CATALOGO = [
  { sku: 'TOR-16-LB', alias: 'tortilla grande', canonico: 'Tortilla n.º 16', unidad: 'LIBRA', paso: 0.5, precio: 450, favorito: true },
  { sku: 'TOS-DEL-BO', alias: 'tostada fina', canonico: 'Tostada delgada', unidad: 'BOLSA', paso: 1, precio: 1200, favorito: true },
  { sku: 'PAP-NAT-BO', alias: 'papalinas', canonico: 'Papalinas', unidad: 'BOLSA', paso: 1, precio: 1500, favorito: true },
  { sku: 'TOR-14-LB', alias: 'tortilla mediana', canonico: 'Tortilla n.º 14', unidad: 'LIBRA', paso: 0.5, precio: 430, favorito: false },
  { sku: 'CHI-HAR-BO', alias: 'chicharrón', canonico: 'Chicharrón de harina', unidad: 'BOLSA', paso: 1, precio: 1250, favorito: false },
];
const UNIDAD_CORTA = { LIBRA: 'lb', BOLSA: 'bolsas', UNIDAD: 'un' };

function PortalCatalogo({ cantidades, setCantidades, onContinuar, ventanaMs }) {
  const total = PORTAL_CATALOGO.reduce((a, p) => a + Math.round((cantidades[p.sku] || 0) * p.precio), 0);
  const lineas = PORTAL_CATALOGO.filter((p) => cantidades[p.sku] > 0).length;
  const seccion = (titulo, lista) => (
    <div style={{ display: 'grid', gap: 'var(--space-2)' }}>
      <span className="mst-label" style={{ padding: '0 var(--space-4)' }}>{titulo}</span>
      <div style={{ background: 'var(--white)', borderTop: '1px solid var(--border-subtle)', borderBottom: '1px solid var(--border-subtle)' }}>
        {lista.map((p) => (
          <div key={p.sku} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-3) var(--space-4)', borderBottom: '1px solid var(--border-subtle)' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 'var(--text-base)', fontWeight: 700, textTransform: 'capitalize' }}>{p.alias}</span>
                {p.favorito && <Icon name="star" size={13} color="var(--gold-500)" />}
              </div>
              <div style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-muted)' }}>
                {p.canonico} · <Money centavos={p.precio} size="sm" tone="muted" /> / {UNIDAD_CORTA[p.unidad]}
              </div>
            </div>
            <QuantityStepper value={cantidades[p.sku] || 0} step={p.paso} unidad={UNIDAD_CORTA[p.unidad]}
              onChange={(v) => setCantidades({ ...cantidades, [p.sku]: v })} />
          </div>
        ))}
      </div>
    </div>
  );
  return (
    <>
      <div style={{ flex: 1, overflow: 'auto', display: 'grid', gap: 'var(--space-4)', paddingBottom: 'var(--space-6)', background: 'var(--surface-page)' }}>
        <div style={{ padding: 'var(--space-4)', background: 'var(--surface-brand)', color: '#fff' }}>
          <VentanaBadge abierta expiraEn={ventanaMs} />
          <p style={{ marginTop: 'var(--space-2)', fontSize: 'var(--text-sm)', color: 'var(--green-100)', lineHeight: 'var(--leading-relaxed)' }}>
            Su pedido llega el <strong style={{ color: 'var(--yellow-400)' }}>jueves 20 a las 08:30</strong>. Puede cambiarlo hasta la medianoche.
          </p>
        </div>
        {seccion('Lo que pide siempre', PORTAL_CATALOGO.filter((p) => p.favorito))}
        {seccion('Todo el catálogo', PORTAL_CATALOGO.filter((p) => !p.favorito))}
        <div style={{ padding: '0 var(--space-4)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
          Los nombres son los suyos. Internamente los traducimos a la nomenclatura de producción.
        </div>
      </div>
      <div style={{ padding: 'var(--space-3) var(--space-4)', background: 'var(--white)', borderTop: '1px solid var(--border-subtle)', boxShadow: '0 -2px 8px rgba(23,25,15,.06)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 'var(--space-2)' }}>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{lineas} {lineas === 1 ? 'producto' : 'productos'}</span>
          <Money centavos={total} size="lg" />
        </div>
        <Button variant="accent" size="lg" block disabled={lineas === 0} onClick={onContinuar}>Revisar pedido</Button>
      </div>
    </>
  );
}

function PortalResumen({ cantidades, onConfirmar, onVolver }) {
  const items = PORTAL_CATALOGO.filter((p) => cantidades[p.sku] > 0);
  const total = items.reduce((a, p) => a + Math.round(cantidades[p.sku] * p.precio), 0);
  return (
    <>
      <div style={{ flex: 1, overflow: 'auto', padding: 'var(--space-4)', display: 'grid', gap: 'var(--space-4)', alignContent: 'start' }}>
        <Card flush padding="md" title="Su pedido" subtitle="Jueves 20 de agosto · entrega 08:30">
          <div style={{ borderTop: '1px solid var(--border-subtle)' }}>
            {items.map((p) => (
              <PedidoItemRow key={p.sku} nombreMostrado={p.canonico} alias={p.alias} unidadMedida={p.unidad}
                cantidad={cantidades[p.sku]} precioUnitarioCentavos={p.precio} />
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: 'var(--space-3) var(--space-4)', background: 'var(--ink-50)' }}>
              <span className="mst-label">Total</span><Money centavos={total} size="lg" />
            </div>
          </div>
        </Card>
        <Card tone="paper" padding="md" title="Estado de cuenta">
          <ContadorFacturas pendientes={3} limite={4} montoCentavos={186500} etiqueta="Facturas pendientes" style={{ border: 0, padding: 0, background: 'transparent' }} />
          <p style={{ marginTop: 'var(--space-2)', fontSize: 'var(--text-xs)', color: 'var(--ink-700)' }}>Al llegar a 4 facturas pendientes le avisamos antes de despachar.</p>
        </Card>
      </div>
      <div style={{ display: 'flex', gap: 'var(--space-2)', padding: 'var(--space-3) var(--space-4)', background: 'var(--white)', borderTop: '1px solid var(--border-subtle)' }}>
        <Button variant="secondary" size="lg" onClick={onVolver}>Cambiar</Button>
        <Button variant="accent" size="lg" block onClick={onConfirmar}>Confirmar pedido</Button>
      </div>
    </>
  );
}

function PortalConfirmado({ onEditar }) {
  return (
    <div style={{ flex: 1, overflow: 'auto', display: 'grid', gap: 'var(--space-4)', padding: 'var(--space-4)', alignContent: 'start' }}>
      <Card tone="brand" padding="lg">
        <div style={{ display: 'grid', gap: 'var(--space-2)', justifyItems: 'start' }}>
          <Icon name="check-circle" size={30} color="var(--yellow-400)" />
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xl)', color: 'var(--yellow-400)', textTransform: 'uppercase', lineHeight: .95 }}>Pedido<br />confirmado</span>
          <span style={{ fontSize: 'var(--text-sm)', color: 'var(--green-100)' }}>Pedido 1042 · jueves 20 de agosto · entrega 08:30</span>
          <EstadoBadge estado="CONFIRMADO" />
        </div>
      </Card>
      <Card padding="md" title="Le confirmamos por WhatsApp" subtitle="Así llega el mensaje">
        <MensajePreview tipo="plantilla" plantilla="confirmacion_pedido" hora="21:05" estado="entregado"
          cuerpo={'Doña Marta, recibimos su pedido 1042 para el jueves 20 de agosto. Total Q 1,240.50. Entrega a las 08:30.'} />
      </Card>
      <Button variant="secondary" size="lg" block onClick={onEditar}>Editar mi pedido</Button>
      <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', textAlign: 'center' }}>Puede editarlo hasta la medianoche. Después entra a producción.</p>
    </div>
  );
}

Object.assign(window, { PortalCatalogo, PortalResumen, PortalConfirmado, PORTAL_CATALOGO });
