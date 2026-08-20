import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";
import {
  formatearCentavos,
  type Tablero,
} from "@misupertostada/shared";

const MM = 2.83465;
const MARGEN = 12 * MM;
const MARCA = "#1B4D2A";
const TINTA = "#282A20";
const DEMO = "#154A63";
const MUTED = "#767A69";
const LINEA = "#DEDFD6";

const s = StyleSheet.create({
  page: {
    padding: MARGEN,
    fontSize: 9,
    fontFamily: "Helvetica",
    color: TINTA,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: MARCA,
    paddingBottom: 8,
  },
  marca: { fontSize: 9, color: MARCA },
  titulo: { fontSize: 16, fontFamily: "Helvetica-Bold" },
  meta: { fontSize: 8, color: MUTED, marginTop: 2 },
  kpis: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 10 },
  kpi: {
    width: "31%",
    borderWidth: 0.5,
    borderColor: LINEA,
    padding: 6,
  },
  kpiLabel: {
    fontSize: 7,
    color: MUTED,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  kpiValor: { fontSize: 12, fontFamily: "Helvetica-Bold", marginTop: 3, color: MARCA },
  kpiHint: { fontSize: 7, color: MUTED, marginTop: 2 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chart: { width: "48%", marginBottom: 8 },
  chartTitulo: { fontSize: 9, fontFamily: "Helvetica-Bold", marginBottom: 4 },
  barRow: { flexDirection: "row", alignItems: "center", marginBottom: 3 },
  barLabel: { width: 72, fontSize: 7 },
  barTrack: { flex: 1, height: 8, backgroundColor: "#EDEEE8" },
  barFill: { height: 8 },
  barVal: { width: 48, fontSize: 7, textAlign: "right" },
  tabla: { marginTop: 8 },
  fila: {
    flexDirection: "row",
    borderBottomWidth: 0.4,
    borderBottomColor: LINEA,
    paddingVertical: 3,
  },
  th: { fontSize: 7, fontFamily: "Helvetica-Bold", color: MUTED },
  pie: { marginTop: 10, fontSize: 7, color: MUTED },
});

function BarraH({
  label,
  ratio,
  valor,
  color,
}: {
  label: string;
  ratio: number;
  valor: string;
  color: string;
}) {
  const pct = Math.max(0, Math.min(100, Math.round(ratio * 100)));
  return (
    <View style={s.barRow}>
      <Text style={s.barLabel}>{label}</Text>
      <View style={s.barTrack}>
        <View style={[s.barFill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
      <Text style={s.barVal}>{valor}</Text>
    </View>
  );
}

export async function renderQuincenaPdf(data: Tablero): Promise<Buffer> {
  const { filtrosAplicados: f, kpis, ventas, productos, cartera, adopcion } =
    data;
  const recortes = [
    f.clienteId ? "cliente" : null,
    f.familia ? `familia ${f.familia}` : null,
    f.puntoCarga ? f.puntoCarga : null,
    f.origen ? f.origen : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const maxVenta = Math.max(1, ...ventas.porDia.map((d) => d.montoCentavos));
  const maxProd = Math.max(1, ...productos.map((p) => p.cantidad));
  const maxTramo = Math.max(1, ...cartera.tramos.map((t) => t.saldoCentavos));
  const topClientes = ventas.porCliente.slice(0, 8);
  const maxCli = Math.max(1, ...topClientes.map((c) => c.montoCentavos));

  const doc = (
    <Document
      title={`Cierre de quincena ${f.desde} – ${f.hasta}`}
      author="Mi Super Tostada"
      subject={recortes ? `Filtros: ${recortes}` : f.etiqueta}
    >
      <Page size="LETTER" style={s.page}>
        <View style={s.header}>
          <View>
            <Text style={s.marca}>Mi Súper Tostada</Text>
            <Text style={s.titulo}>Cierre de quincena</Text>
            <Text style={s.meta}>
              {f.desde} – {f.hasta} · {f.etiqueta}
            </Text>
            {recortes ? <Text style={s.meta}>Filtros: {recortes}</Text> : null}
          </View>
          <Text style={s.meta}>America/Guatemala</Text>
        </View>

        <View style={s.kpis}>
          <View style={s.kpi}>
            <Text style={s.kpiLabel}>Ventas</Text>
            <Text style={s.kpiValor}>{formatearCentavos(kpis.ventasCentavos)}</Text>
            <Text style={s.kpiHint}>
              vs anterior {formatearCentavos(kpis.ventasDeltaCentavos)}
            </Text>
          </View>
          <View style={s.kpi}>
            <Text style={s.kpiLabel}>Pedidos</Text>
            <Text style={s.kpiValor}>{String(kpis.pedidos)}</Text>
            <Text style={s.kpiHint}>
              {kpis.portal} portal · {kpis.manual} manual
            </Text>
          </View>
          <View style={s.kpi}>
            <Text style={s.kpiLabel}>Por cobrar</Text>
            <Text style={s.kpiValor}>
              {f.carteraAplica
                ? formatearCentavos(kpis.porCobrarCentavos)
                : "N/A"}
            </Text>
            <Text style={s.kpiHint}>
              {f.carteraAplica
                ? "Saldo de facturas"
                : "Cartera no se recorta por producto"}
            </Text>
          </View>
          <View style={s.kpi}>
            <Text style={s.kpiLabel}>Cobrado</Text>
            <Text style={s.kpiValor}>{formatearCentavos(kpis.cobradoCentavos)}</Text>
            <Text style={s.kpiHint}>
              Efectivo {formatearCentavos(kpis.cobradoEfectivoCentavos)} ·
              Transferencia {formatearCentavos(kpis.cobradoTransferenciaCentavos)}
            </Text>
          </View>
          <View style={s.kpi}>
            <Text style={s.kpiLabel}>
              {kpis.clientesAlertaTipo === "SIN_PEDIDO"
                ? "Aún no piden"
                : "Dejaron de pedir"}
            </Text>
            <Text style={s.kpiValor}>{String(kpis.clientesAlertaCount)}</Text>
          </View>
          <View style={s.kpi}>
            <Text style={s.kpiLabel}>Adopción portal</Text>
            <Text style={s.kpiValor}>
              {String(Math.floor(kpis.adopcionPuntosBase / 100))}%
            </Text>
            <Text style={s.kpiHint}>
              {adopcion.portal} portal · {adopcion.manual} manual
            </Text>
          </View>
        </View>

        <View style={s.grid}>
          <View style={s.chart}>
            <Text style={s.chartTitulo}>Ventas por día</Text>
            {ventas.porDia.map((d) => (
              <BarraH
                key={d.fecha}
                label={d.fecha.slice(8)}
                ratio={d.montoCentavos / maxVenta}
                valor={formatearCentavos(d.montoCentavos, { simbolo: false })}
                color={MARCA}
              />
            ))}
          </View>
          <View style={s.chart}>
            <Text style={s.chartTitulo}>Participación por cliente</Text>
            {topClientes.map((c) => (
              <BarraH
                key={c.clienteId}
                label={c.nombre.slice(0, 14)}
                ratio={c.montoCentavos / maxCli}
                valor={formatearCentavos(c.montoCentavos, { simbolo: false })}
                color={MARCA}
              />
            ))}
          </View>
          <View style={s.chart}>
            <Text style={s.chartTitulo}>Volumen por producto</Text>
            {productos.slice(0, 10).map((p) => (
              <BarraH
                key={`${p.nombreMostrado}-${p.puntoCarga}`}
                label={p.nombreMostrado.slice(0, 14)}
                ratio={p.cantidad / maxProd}
                valor={`${p.cantidad} ${p.unidadMedida}`}
                color={p.puntoCarga === "PLANTA" ? MARCA : DEMO}
              />
            ))}
          </View>
          <View style={s.chart}>
            <Text style={s.chartTitulo}>Antigüedad de cartera</Text>
            {cartera.tramos.map((t) => (
              <BarraH
                key={t.clave}
                label={t.clave}
                ratio={t.saldoCentavos / maxTramo}
                valor={formatearCentavos(t.saldoCentavos, { simbolo: false })}
                color={t.clave === "0-7" || t.clave === "8-14" ? MARCA : "#B3231C"}
              />
            ))}
          </View>
        </View>

        <View style={s.tabla}>
          <Text style={s.chartTitulo}>Clientes</Text>
          <View style={s.fila}>
            <Text style={[s.th, { width: "40%" }]}>Nombre</Text>
            <Text style={[s.th, { width: "15%" }]}>Pedidos</Text>
            <Text style={[s.th, { width: "25%" }]}>Ticket</Text>
            <Text style={[s.th, { width: "20%" }]}>Días pago</Text>
          </View>
          {data.clientes.slice(0, 20).map((c) => (
            <View key={c.clienteId} style={s.fila}>
              <Text style={{ width: "40%", fontSize: 8 }}>{c.nombre}</Text>
              <Text style={{ width: "15%", fontSize: 8 }}>{c.pedidos}</Text>
              <Text style={{ width: "25%", fontSize: 8 }}>
                {formatearCentavos(c.ticketPromedioCentavos)}
              </Text>
              <Text style={{ width: "20%", fontSize: 8 }}>
                {c.diasPagoMediana}
              </Text>
            </View>
          ))}
        </View>
        <Text style={s.pie}>
          Montos en quetzales. Centavos enteros en el sistema. Pagado cuando la
          suma de abonos cubre la factura. Anulado, nunca cancelado.
        </Text>
      </Page>
    </Document>
  );

  const buf = await renderToBuffer(doc);
  return Buffer.isBuffer(buf) ? buf : Buffer.from(buf);
}
