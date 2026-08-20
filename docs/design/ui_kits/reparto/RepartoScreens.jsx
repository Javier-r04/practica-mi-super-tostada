const { Card, Button, Icon, Money, EstadoBadge, Badge, QuantityStepper, RadioGroup, Field, Input, Toast, EmptyState, PedidoItemRow, Tag } = window.MiSPerTostadaDesignSystem_679973;

const REPARTO_RUTA = [
  { correlativo: 1042, cliente: 'Restaurante Doña Marta', zona: 'Zona 1 · 4a calle', hora: '08:30', estado: 'EN_PRODUCCION', totalCentavos: 124050, pendientesCentavos: 186500, items: [
    { nombreMostrado: 'Tortilla n.º 16', alias: 'tortilla grande', unidadMedida: 'LIBRA', cantidad: 40, precioUnitarioCentavos: 450 },
    { nombreMostrado: 'Tostada delgada', alias: 'tostada fina', unidadMedida: 'BOLSA', cantidad: 12, precioUnitarioCentavos: 1200 },
    { nombreMostrado: 'Papalinas', unidadMedida: 'BOLSA', cantidad: 6, precioUnitarioCentavos: 1500 },
  ] },
  { correlativo: 1043, cliente: 'Comedor Los Tabascos', zona: 'Zona 3 · calzada', hora: '07:00', estado: 'ENTREGADO', totalCentavos: 268000, pendientesCentavos: 412000, items: [
    { nombreMostrado: 'Tortilla n.º 14', alias: 'tortilla mediana', unidadMedida: 'LIBRA', cantidad: 60, precioUnitarioCentavos: 430, notaProduccion: 'grosor especial' },
  ] },
  { correlativo: 1044, cliente: 'Cafetería El Portal', zona: 'Zona 1 · pasaje', hora: '09:15', estado: 'EN_PRODUCCION', totalCentavos: 63000, pendientesCentavos: 52000, items: [
    { nombreMostrado: 'Tortilla n.º 16', alias: 'tortilla grande', unidadMedida: 'LIBRA', cantidad: 14, precioUnitarioCentavos: 450 },
  ] },
];

function RutaScreen({ onAbrir, entregados, cobrosPendientes }) {
  return (
    <div style={{ flex: 1, overflow: 'auto', display: 'grid', gap: 'var(--space-3)', padding: 'var(--space-4)', alignContent: 'start' }}>
      <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
        <Card padding="md" style={{ flex: 1 }}>
          <span className="mst-label">Entregas</span>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xl)', color: 'var(--green-800)' }}>{entregados.length}/{REPARTO_RUTA.length}</div>
        </Card>
        <Card padding="md" style={{ flex: 1 }}>
          <span className="mst-label">Cobrado hoy</span>
          <div style={{ marginTop: 2 }}><Money centavos={214000} size="lg" tone="pagado" /></div>
        </Card>
      </div>
      {REPARTO_RUTA.map((e) => {
        const hecho = entregados.includes(e.correlativo);
        return (
          <button key={e.correlativo} onClick={() => onAbrir(e.correlativo)} style={{ display: 'grid', gap: 6, padding: 'var(--space-4)', background: 'var(--white)', border: '1px solid var(--border-subtle)', borderLeft: `4px solid ${hecho ? 'var(--green-600)' : 'var(--yellow-400)'}`, borderRadius: 'var(--radius-card)', boxShadow: 'var(--shadow-sm)', textAlign: 'left', cursor: 'pointer' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-lg)', color: 'var(--green-800)', fontVariantNumeric: 'tabular-nums' }}>{e.hora}</span>
              <span style={{ flex: 1, fontSize: 'var(--text-base)', fontWeight: 700 }}>{e.cliente}</span>
              <EstadoBadge estado={hecho ? 'ENTREGADO' : e.estado} size="sm" />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
              <Icon name="map-pin" size={14} />{e.zona}
              <span style={{ marginLeft: 'auto' }}><Money centavos={e.totalCentavos} /></span>
            </div>
            {e.pendientesCentavos > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Badge tone="amber" size="sm">Cobrar</Badge>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--amber-700)', fontWeight: 600 }}>Saldo anterior <Money centavos={e.pendientesCentavos} size="sm" tone="pendiente" /></span>
                {cobrosPendientes.includes(e.correlativo) && <EstadoBadge estado="SIN_SINCRONIZAR" size="sm" />}
              </div>
            )}
          </button>
        );
      })}
      <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', textAlign: 'center' }}>Ruta del jueves 20 de agosto · orden por horario fijo de cada cliente</p>
    </div>
  );
}

function EntregaScreen({ correlativo, online, onEntregar, onCobrar, entregado }) {
  const e = REPARTO_RUTA.find((x) => x.correlativo === correlativo);
  const [cant, setCant] = React.useState(() => e.items.map((i) => i.cantidad));
  const total = e.items.reduce((a, i, idx) => a + Math.round(cant[idx] * i.precioUnitarioCentavos), 0);
  const ajustes = cant.filter((c, i) => c !== e.items[i].cantidad).length;
  return (
    <>
      <div style={{ flex: 1, overflow: 'auto', display: 'grid', gap: 'var(--space-3)', padding: 'var(--space-4)', alignContent: 'start' }}>
        <Card padding="md">
          <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 'var(--text-md)', fontWeight: 700 }}>{e.cliente}</div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{e.zona} · entrega {e.hora}</div>
            </div>
            <Button size="sm" variant="secondary"><Icon name="phone" size={15} />Llamar</Button>
          </div>
        </Card>
        <Card flush padding="md" title="Lo entregado" subtitle="La factura se calcula sobre esto, no sobre lo pedido">
          <div style={{ borderTop: '1px solid var(--border-subtle)' }}>
            {e.items.map((it, idx) => (
              <div key={idx} style={{ display: 'grid', gap: 8, padding: 'var(--space-3) var(--space-4)', borderBottom: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ flex: 1, fontSize: 'var(--text-sm)', fontWeight: 600 }}>{it.nombreMostrado}</span>
                  <span style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-muted)' }}>pedido {it.cantidad}</span>
                </div>
                {it.notaProduccion && <Tag tone="accent">{it.notaProduccion}</Tag>}
                <QuantityStepper size="lg" value={cant[idx]} step={it.unidadMedida === 'LIBRA' ? 0.5 : 1}
                  unidad={it.unidadMedida === 'LIBRA' ? 'lb' : 'bolsas'}
                  onChange={(v) => setCant((prev) => prev.map((x, i) => (i === idx ? v : x)))} />
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: 'var(--space-3) var(--space-4)', background: 'var(--ink-50)' }}>
              <span className="mst-label">{ajustes > 0 ? `${ajustes} ajuste${ajustes > 1 ? 's' : ''}` : 'Sin ajustes'}</span>
              <Money centavos={total} size="lg" />
            </div>
          </div>
        </Card>
        {e.pendientesCentavos > 0 && (
          <Card tone="accent" padding="md" title="Saldo anterior" subtitle="3 facturas pendientes">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Money centavos={e.pendientesCentavos} size="lg" tone="pendiente" />
              <Button size="sm" variant="primary" onClick={onCobrar}>Registrar cobro</Button>
            </div>
          </Card>
        )}
      </div>
      <div style={{ padding: 'var(--space-3) var(--space-4)', background: 'var(--white)', borderTop: '1px solid var(--border-subtle)' }}>
        <Button variant="accent" size="lg" block disabled={entregado} onClick={onEntregar}>
          {entregado ? (online ? 'Entrega registrada' : 'Guardado en este teléfono') : 'Marcar como entregado'}
        </Button>
      </div>
    </>
  );
}

function CobroScreen({ correlativo, online, onGuardar, onCancelar }) {
  const e = REPARTO_RUTA.find((x) => x.correlativo === correlativo);
  const [metodo, setMetodo] = React.useState('EFECTIVO');
  return (
    <>
      <div style={{ flex: 1, overflow: 'auto', display: 'grid', gap: 'var(--space-4)', padding: 'var(--space-4)', alignContent: 'start' }}>
        <Card padding="md" title={e.cliente} subtitle="Saldo de 3 facturas pendientes">
          <Money centavos={e.pendientesCentavos} size="xl" tone="pendiente" />
        </Card>
        <Input label="Monto recibido" prefix="Q" inputMode="decimal" defaultValue={(e.pendientesCentavos / 100).toFixed(2)} hint="Puede ser un abono parcial: se aplica a la factura más antigua." />
        <Field label="Método de pago">
          <RadioGroup name="metodo" value={metodo} onChange={setMetodo} options={[
            { value: 'EFECTIVO', label: 'Efectivo', icon: <Icon name="banknote" size={18} /> },
            { value: 'TRANSFERENCIA', label: 'Transferencia', icon: <Icon name="arrow-left-right" size={18} /> },
          ]} />
        </Field>
        <Field label="Comprobante" hint="Obligatorio en transferencia.">
          <div style={{ display: 'grid', placeItems: 'center', gap: 6, padding: 'var(--space-6)', border: '1px dashed var(--border-default)', borderRadius: 'var(--radius-md)', color: 'var(--text-muted)' }}>
            <Icon name="camera" size={22} />
            <span style={{ fontSize: 'var(--text-xs)' }}>Tomar foto del recibo</span>
          </div>
        </Field>
        {!online && <Toast tone="aviso" title="Sin señal" description="El cobro se guarda en este teléfono y se envía solo cuando vuelva la señal." style={{ maxWidth: '100%' }} />}
      </div>
      <div style={{ display: 'flex', gap: 'var(--space-2)', padding: 'var(--space-3) var(--space-4)', background: 'var(--white)', borderTop: '1px solid var(--border-subtle)' }}>
        <Button variant="secondary" size="lg" onClick={onCancelar}>Cancelar</Button>
        <Button variant="accent" size="lg" block onClick={onGuardar}>{online ? 'Guardar cobro' : 'Guardar en este teléfono'}</Button>
      </div>
    </>
  );
}

Object.assign(window, { RutaScreen, EntregaScreen, CobroScreen, REPARTO_RUTA });
