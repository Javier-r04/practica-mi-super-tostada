const { Card, Button, Badge, Icon, Money, EstadoBadge, VentanaBadge, ContadorFacturas, PedidoItemRow, Dialog, Textarea } = window.MiSPerTostadaDesignSystem_679973;
const D = window.MST_DATA;
const cliente = (id) => D.clientes.find((c) => c.id === id) || {};

function Metric({ label, children, hint, tone = 'default' }) {
  const brand = tone === 'brand';
  return (
    <div style={{ flex: 1, padding: 'var(--space-4)', background: brand ? 'var(--surface-brand)' : 'var(--surface-card)', border: `1px solid ${brand ? 'var(--green-900)' : 'var(--border-subtle)'}`, borderRadius: 'var(--radius-card)', boxShadow: 'var(--shadow-sm)' }}>
      <div style={{ fontSize: 'var(--text-2xs)', fontWeight: 700, letterSpacing: 'var(--tracking-caps)', textTransform: 'uppercase', color: brand ? 'var(--green-200)' : 'var(--text-muted)' }}>{label}</div>
      <div style={{ marginTop: 6, fontFamily: 'var(--font-display)', fontSize: 'var(--text-3xl)', lineHeight: 1, color: brand ? 'var(--yellow-400)' : 'var(--green-800)' }}>{children}</div>
      {hint && <div style={{ marginTop: 4, fontSize: 'var(--text-xs)', color: brand ? 'var(--green-200)' : 'var(--text-muted)' }}>{hint}</div>}
    </div>
  );
}

function HoyScreen({ onIr }) {
  const [cerrando, setCerrando] = React.useState(false);
  const [cerrada, setCerrada] = React.useState(false);
  return (
    <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
      <div style={{ display: 'flex', gap: 'var(--space-4)' }}>
        <Metric label="Pedidos capturados" hint="12 del portal · 6 manuales">18</Metric>
        <Metric label="Libras de tortilla" hint="Planta: todo · sábado">126</Metric>
        <Metric label="Por cobrar hoy" tone="brand" hint="7 facturas en 4 clientes"><Money centavos={482050} size="xl" tone="accent" /></Metric>
        <Metric label="Mensajes en outbox" hint="0 fallidos · 0 duplicados">3</Metric>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 'var(--space-4)', alignItems: 'start' }}>
        <Card title="Pedidos de la noche" subtitle={`Fecha de operación: ${D.fechaOperacion}`} flush padding="md"
          actions={<Button size="sm" variant="secondary" onClick={() => onIr('pedidos')}>Ver todos</Button>}>
          <div style={{ borderTop: '1px solid var(--border-subtle)' }}>
            {D.pedidos.map((p) => (
              <button key={p.correlativo} onClick={() => onIr('pedidos')} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', width: '100%', minHeight: 'var(--row-height)', padding: 'var(--space-3) var(--space-4)', border: 0, borderBottom: '1px solid var(--border-subtle)', background: 'transparent', cursor: 'pointer', textAlign: 'left' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>#{p.correlativo}</span>
                <span style={{ flex: 1, fontSize: 'var(--text-sm)', fontWeight: 600 }}>{cliente(p.clienteId).nombre}</span>
                <Badge tone={p.origen === 'PORTAL' ? 'green' : 'neutral'} size="sm">{p.origen}</Badge>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>{p.hora}</span>
                <EstadoBadge estado={p.estado} size="sm" />
                <Money centavos={p.totalCentavos} />
              </button>
            ))}
          </div>
        </Card>

        <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
          <Card title="Cierre de la ventana" subtitle="15:00 → 00:00 · America/Guatemala" tone="accent">
            <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
              <VentanaBadge abierta={!cerrada} expiraEn={D.ventanaRestanteMs} />
              <p style={{ fontSize: 'var(--text-sm)', lineHeight: 'var(--leading-relaxed)', color: 'var(--ink-700)' }}>
                Al cerrar se materializa la hoja de producción, se envía el consolidado a producción, tienda y reparto, y se confirma a cada cliente. Un solo paso.
              </p>
              <Button variant="accent" size="lg" block disabled={cerrada} onClick={() => setCerrando(true)}>
                {cerrada ? 'Día cerrado · hoja generada' : 'Cerrar ventana y generar hoja'}
              </Button>
            </div>
          </Card>
          <Card title="Clientes al límite" flush padding="md">
            <div style={{ display: 'grid', gap: 'var(--space-2)', padding: '0 var(--space-4) var(--space-4)' }}>
              {D.clientes.filter((c) => c.pendientes >= c.limite - 1).map((c) => (
                <ContadorFacturas key={c.id} pendientes={c.pendientes} limite={c.limite} montoCentavos={c.saldoCentavos} etiqueta={c.nombre} />
              ))}
            </div>
          </Card>
        </div>
      </div>

      <Dialog open={cerrando} tone="warning" title="Cerrar la ventana del jueves 20"
        description="Se generan la hoja de producción y el consolidado, y salen las confirmaciones por WhatsApp. Después de esto, reabrir el día requiere motivo."
        onClose={() => setCerrando(false)}
        footer={<><Button variant="secondary" onClick={() => setCerrando(false)}>Cancelar</Button><Button variant="primary" onClick={() => { setCerrada(true); setCerrando(false); }}>Cerrar y enviar</Button></>}>
        <div style={{ display: 'grid', gap: 6, fontSize: 'var(--text-sm)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Pedidos confirmados</span><strong>17</strong></div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Borradores que quedan fuera</span><strong>1</strong></div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Mensajes a enviar</span><strong>19</strong></div>
        </div>
      </Dialog>
    </div>
  );
}

Object.assign(window, { HoyScreen, Metric, mstCliente: cliente });
