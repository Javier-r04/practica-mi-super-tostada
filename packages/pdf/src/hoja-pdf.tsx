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
  gruposNotaProduccion,
  gruposPorPuntoCarga,
  nombreDiaOperacion,
  textoClienteNota,
  type BloqueCliente,
  type HojaSnapshot,
  type LineaProducto,
} from "@misupertostada/shared";

const MM = 2.83465;
const MARGEN = 12 * MM;

const s = StyleSheet.create({
  page: {
    padding: MARGEN,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#111",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: "#333",
    paddingBottom: 8,
  },
  marca: { fontSize: 9, color: "#1B4D2A" },
  titulo: { fontSize: 18, fontFamily: "Helvetica-Bold" },
  meta: { fontSize: 9, color: "#444" },
  grupo: {
    marginTop: 10,
    backgroundColor: "#1B4D2A",
    color: "#fff",
    paddingVertical: 4,
    paddingHorizontal: 8,
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
  },
  fila: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderBottomWidth: 0.5,
    borderBottomColor: "#ccc",
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  filaCambio: { backgroundColor: "#FDF0D6" },
  colProducto: { flexGrow: 1, flexShrink: 1, flexBasis: 0, paddingRight: 8 },
  producto: { fontSize: 14, fontFamily: "Helvetica-Bold" },
  notaCaja: {
    marginTop: 4,
    backgroundColor: "#FFF9D6",
    borderLeftWidth: 3,
    borderLeftColor: "#FFE100",
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  notaTitulo: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: "#8A5502",
  },
  notaCuerpo: {
    fontSize: 9,
    color: "#8A5502",
    marginTop: 2,
    lineHeight: 1.35,
  },
  cantidad: {
    fontSize: 24,
    fontFamily: "Helvetica-Bold",
    width: 72,
    textAlign: "right",
  },
  unidad: { fontSize: 10, width: 48, marginLeft: 6, color: "#555", paddingTop: 8 },
  marcaNuevo: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    width: 48,
    paddingTop: 6,
    color: "#8A5502",
  },
});

export async function renderHojaPdf(input: {
  snapshot: HojaSnapshot;
  texto: string;
  version: number;
  generadoAt: string;
}): Promise<Buffer> {
  const { snapshot, version, generadoAt } = input;
  const soloDiff = version > 1;
  const grupos = gruposPorPuntoCarga(snapshot).map((g) => ({
    ...g,
    lineas: soloDiff ? g.lineas.filter((l) => l.cambio) : g.lineas,
  }));
  const dia = nombreDiaOperacion(snapshot.fechaOperacion);

  const doc = (
    <Document>
      <Page size="LETTER" style={s.page}>
        <View style={s.header}>
          <View>
            <Text style={s.marca}>Mi Súper Tostada</Text>
            <Text style={s.titulo}>
              Hoja de producción · {dia} {snapshot.fechaOperacion}
            </Text>
            {snapshot.fechaEntrega ? (
              <Text style={s.meta}>
                Entrega {nombreDiaOperacion(snapshot.fechaEntrega).toLowerCase()}{" "}
                {snapshot.fechaEntrega}
              </Text>
            ) : null}
            <Text style={s.meta}>
              {version > 1
                ? `Hoja corregida · solo los cambios (v${version})`
                : "Hoja del día"}
              {snapshot.esSabado ? " · sábado: toda la carga sale de planta" : ""}
            </Text>
          </View>
          <Text style={s.meta}>{generadoAt.slice(0, 16)}</Text>
        </View>
        {grupos.map((grupo) => (
          <View key={grupo.puntoCarga}>
            <Text style={s.grupo}>{grupo.puntoCarga}</Text>
            {grupo.lineas.map((linea) => (
              <FilaPdf
                key={`${linea.productoId}-${linea.cambio ?? "ok"}`}
                linea={linea}
                clientes={snapshot.clientes}
              />
            ))}
          </View>
        ))}
      </Page>
    </Document>
  );

  const buf = await renderToBuffer(doc);
  return Buffer.isBuffer(buf) ? buf : Buffer.from(buf);
}

function FilaPdf({
  linea,
  clientes,
}: {
  linea: LineaProducto;
  clientes: BloqueCliente[];
}) {
  const notas = gruposNotaProduccion(linea, clientes);
  const marca =
    linea.cambio === "nuevo" || linea.cambio === "ajustado"
      ? "NUEVO"
      : linea.cambio === "eliminado"
        ? "QUITADO"
        : " ";
  return (
    <View style={linea.cambio ? [s.fila, s.filaCambio] : s.fila}>
      <View style={s.colProducto}>
        <Text style={s.producto}>{linea.nombreCanonico}</Text>
        {notas.map((grupo) => (
          <View key={grupo.nota} style={s.notaCaja}>
            <Text style={s.notaTitulo}>{grupo.nota}</Text>
            {grupo.clientes.length > 0 ? (
              <Text style={s.notaCuerpo}>
                {grupo.clientes.map(textoClienteNota).join("\n")}
              </Text>
            ) : null}
          </View>
        ))}
      </View>
      <Text style={s.marcaNuevo}>{marca}</Text>
      <Text style={s.cantidad}>{linea.cantidad}</Text>
      <Text style={s.unidad}>{linea.unidadMedida}</Text>
    </View>
  );
}
