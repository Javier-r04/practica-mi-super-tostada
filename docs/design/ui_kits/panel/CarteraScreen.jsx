const { Card, Button, Badge, Icon, Money, EstadoBadge, Tabs, Input, RadioGroup, Field, Dialog, Toast, ContadorFacturas } = window.MiSPerTostadaDesignSystem_679973;

function CarteraScreen() {
  const D = window.MST_DATA;
  const cliente = window.mstCliente;
  const [tab, setTab] = React.useState('pendientes');
  const [cobrar, setCobrar] = React.useState(null);
  const [metodo, setMetodo] = React.useState('EFECTIVO');
  const [aviso, setAviso] = React.useState(null);

  const filtro = { todas: () => true, pendientes: (f) => f.estado !== 'PAGADO', vencidas: (f) => f.estado === 'VENCIDO' }[tab];
  const lista = D.facturas.filter(filtro);
  const totalPendiente = D.facturas.filter((f) => f.estado !== 'PAGADO').reduce((a, f) => a + (f.montoCentavos - f.pagadoCentavos), 0);

  return (
    <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
      <div style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'stretch' }}>
        <ContadorFacturas pendientes={5} montoCentavos={totalPendiente} etiqueta="Facturas pendientes" size="lg" style={{ flex: 1 }} />
        <Card title="Cobrado hoy" padding="md" style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-3)' }}>
            <Money centavos={214000} size="xl" tone="pagado" />
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>4 pagos · 3 en efectivo</span>
          </div>
        </Card>
        <Card title="Reportado por Tony" subtitle="Cola offline sincronizada 21:02" padding="md" style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <EstadoBadge estado="SIN_SINCRONIZAR" size="sm" />
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>1 cobro esperando señal</span>
          </div>
        </Card>
      </div>

      <Card flush padding="md" title="Cartera" subtitle="El contador cuenta facturas, no pedidos"
        actions={<Button size="sm" variant="secondary"><Icon name="file-down" size={15} />Estado de cuenta PDF</Button>}>
        <div style={{ padding: '0 var(--space-4)' }}>
          <Tabs activeId={tab} onSelect={setTab} size="sm" tabs={[
            { id: 'todas', label: 'Todas', count: D.facturas.length },
            { id: 'pendientes', label: 'Pendientes', count: D.facturas.filter((f) => f.estado !== 'PAGADO').length },
            { id: 'vencidas', label: 'Vencidas', count: D.facturas.filter((f) => f.estado === 'VENCIDO').length },
          ]} />
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-sm)' }}>
          <thead>
            <tr style={{ background: 'var(--ink-50)' }}>
              {['DTE', 'Cliente', 'Pedido', 'Emitida', 'Monto', 'Abonado', 'Saldo', 'Estado', ''].map((h) => (
                <th key={h} style={{ textAlign: h === 'Monto' || h === 'Abonado' || h === 'Saldo' ? 'right' : 'left', padding: 'var(--space-2) var(--space-4)', fontSize: 'var(--text-2xs)', fontWeight: 700, letterSpacing: 'var(--tracking-caps)', textTransform: 'uppercase', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-subtle)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lista.map((f) => (
              <tr key={f.numeroDte} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <td style={{ padding: 'var(--space-3) var(--space-4)', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)' }}>{f.numeroDte}</td>
                <td style={{ padding: 'var(--space-3) var(--space-4)', fontWeight: 600 }}>{cliente(f.clienteId).nombre}</td>
                <td style={{ padding: 'var(--space-3) var(--space-4)', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>#{f.correlativo}</td>
                <td style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--text-muted)' }}>{f.emitida}</td>
                <td style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'right' }}><Money centavos={f.montoCentavos} simbolo={false} /></td>
                <td style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'right' }}><Money centavos={f.pagadoCentavos} simbolo={false} tone="muted" /></td>
                <td style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'right' }}>
                  <Money centavos={f.montoCentavos - f.pagadoCentavos} simbolo={false} tone={f.estado === 'VENCIDO' ? 'vencido' : f.estado === 'PAGADO' ? 'pagado' : 'pendiente'} />
                </td>
                <td style={{ padding: 'var(--space-3) var(--space-4)' }}><EstadoBadge estado={f.estado} size="sm" /></td>
                <td style={{ padding: 'var(--space-2) var(--space-4)', textAlign: 'right' }}>
                  {f.estado !== 'PAGADO' && <Button size="sm" variant="secondary" onClick={() => setCobrar(f)}>Registrar pago</Button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {aviso && <div style={{ position: 'fixed', right: 24, bottom: 24, zIndex: 80 }}><Toast tone="exito" title="Pago registrado" description={aviso} onDismiss={() => setAviso(null)} /></div>}

      <Dialog open={!!cobrar} title="Registrar pago" description={cobrar ? `${cliente(cobrar.clienteId).nombre} · DTE ${cobrar.numeroDte}` : ''}
        onClose={() => setCobrar(null)}
        footer={<><Button variant="secondary" onClick={() => setCobrar(null)}>Cancelar</Button><Button variant="primary" onClick={() => { setAviso(`${cliente(cobrar.clienteId).nombre} · ${metodo.toLowerCase()}`); setCobrar(null); }}>Guardar pago</Button></>}>
        {cobrar && (
          <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: 'var(--space-3)', background: 'var(--ink-50)', borderRadius: 'var(--radius-sm)', fontSize: 'var(--text-sm)' }}>
              <span>Saldo de la factura</span><Money centavos={cobrar.montoCentavos - cobrar.pagadoCentavos} />
            </div>
            <Input label="Monto recibido" prefix="Q" inputMode="decimal" defaultValue={((cobrar.montoCentavos - cobrar.pagadoCentavos) / 100).toFixed(2)} hint="Puede ser un abono parcial." />
            <Field label="Método"><RadioGroup name="metodo" value={metodo} onChange={setMetodo} options={[
              { value: 'EFECTIVO', label: 'Efectivo', icon: <Icon name="banknote" size={18} /> },
              { value: 'TRANSFERENCIA', label: 'Transferencia', icon: <Icon name="arrow-left-right" size={18} /> },
            ]} /></Field>
            <Field label="Comprobante" hint="Foto del depósito o del recibo firmado.">
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', padding: 'var(--space-3)', border: '1px dashed var(--border-default)', borderRadius: 'var(--radius-sm)', color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>
                <Icon name="camera" size={16} />Adjuntar imagen
              </div>
            </Field>
          </div>
        )}
      </Dialog>
    </div>
  );
}

Object.assign(window, { CarteraScreen });
