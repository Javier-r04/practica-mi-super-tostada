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
  COPY_PAGO_COMPLETO,
  ESTADO_PRESENTACION,
  formatearCentavos,
  type EstadoCuentaPdf,
} from "@misupertostada/shared";

const MM = 2.83465;
const MARGEN = 12 * MM;
const MARCA = "#1B4D2A";
const TINTA = "#282A20";
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
  kpi: { marginBottom: 10 },
  kpiValor: { fontSize: 14, fontFamily: "Helvetica-Bold", color: MARCA },
  fila: {
    flexDirection: "row",
    borderBottomWidth: 0.4,
    borderBottomColor: LINEA,
    paddingVertical: 3,
  },
  th: { fontSize: 7, fontFamily: "Helvetica-Bold", color: MUTED },
  pie: { marginTop: 10, fontSize: 7, color: MUTED },
});

function etiquetaEstado(estado: string): string {
  if (estado === "PAGADO") return COPY_PAGO_COMPLETO;
  const known = ESTADO_PRESENTACION[estado as keyof typeof ESTADO_PRESENTACION];
  return known?.label ?? estado;
}

export async function renderEstadoCuentaPdf(
  data: EstadoCuentaPdf,
): Promise<Buffer> {
  const doc = (
    <Document>
      <Page size="LETTER" style={s.page}>
        <View style={s.header}>
          <View>
            <Text style={s.marca}>Mi Súper Tostada</Text>
            <Text style={s.titulo}>Estado de cuenta</Text>
            <Text style={s.meta}>{data.clienteNombre}</Text>
          </View>
          <Text style={s.meta}>{data.generadoAt}</Text>
        </View>
        <View style={s.kpi}>
          <Text style={s.th}>Saldo pendiente</Text>
          <Text style={s.kpiValor}>
            {formatearCentavos(data.saldoCentavos)}
          </Text>
          <Text style={s.meta}>
            {data.facturasPendientes} factura
            {data.facturasPendientes === 1 ? "" : "s"} con saldo
          </Text>
        </View>
        <View style={s.fila}>
          <Text style={[s.th, { width: "22%" }]}>DTE</Text>
          <Text style={[s.th, { width: "22%" }]}>Monto</Text>
          <Text style={[s.th, { width: "22%" }]}>Saldo</Text>
          <Text style={[s.th, { width: "18%" }]}>Estado</Text>
          <Text style={[s.th, { width: "16%" }]}>Días</Text>
        </View>
        {data.facturas.map((f) => (
          <View key={f.numeroDte ?? f.montoCentavos} style={s.fila}>
            <Text style={{ width: "22%" }}>{f.numeroDte ?? "—"}</Text>
            <Text style={{ width: "22%" }}>
              {formatearCentavos(f.montoCentavos)}
            </Text>
            <Text style={{ width: "22%" }}>
              {formatearCentavos(f.saldoCentavos)}
            </Text>
            <Text style={{ width: "18%" }}>{etiquetaEstado(f.estado)}</Text>
            <Text style={{ width: "16%" }}>{f.antiguedadDias}</Text>
          </View>
        ))}
        <Text style={s.pie}>
          {COPY_PAGO_COMPLETO} cuando la suma de abonos cubre el total. Centavos
          enteros en el sistema.
        </Text>
      </Page>
    </Document>
  );
  return renderToBuffer(doc);
}
