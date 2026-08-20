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
  gruposPorPuntoCarga,
  nombreDiaOperacion,
  type HojaSnapshot,
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
    alignItems: "center",
    borderBottomWidth: 0.5,
    borderBottomColor: "#ccc",
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  filaCambio: { backgroundColor: "#e8e8e8" },
  producto: { flex: 1, fontSize: 14 },
  cantidad: { fontSize: 24, fontFamily: "Helvetica-Bold", width: 72, textAlign: "right" },
  unidad: { fontSize: 10, width: 48, marginLeft: 6, color: "#555" },
  marcaNuevo: { fontSize: 8, fontFamily: "Helvetica-Bold", width: 48 },
  nota: { fontSize: 9, color: "#333", marginLeft: 8 },
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
            <Text style={s.meta}>
              Versión {version}
              {snapshot.esSabado ? " · sábado: toda la carga sale de planta" : ""}
            </Text>
          </View>
          <Text style={s.meta}>{generadoAt.slice(0, 16)}</Text>
        </View>
        {grupos.map((grupo) => (
          <View key={grupo.puntoCarga}>
            <Text style={s.grupo}>{grupo.puntoCarga}</Text>
            {grupo.lineas.map((linea) => (
              <View
                key={`${linea.productoId}-${linea.cambio ?? "ok"}`}
                style={linea.cambio ? [s.fila, s.filaCambio] : s.fila}
              >
                <Text style={s.producto}>{linea.nombreCanonico}</Text>
                {linea.notaProduccion ? (
                  <Text style={s.nota}>{linea.notaProduccion}</Text>
                ) : null}
                {linea.cambio === "nuevo" || linea.cambio === "ajustado" ? (
                  <Text style={s.marcaNuevo}>NUEVO</Text>
                ) : linea.cambio === "eliminado" ? (
                  <Text style={s.marcaNuevo}>QUITADO</Text>
                ) : (
                  <Text style={s.marcaNuevo}> </Text>
                )}
                <Text style={s.cantidad}>{linea.cantidad}</Text>
                <Text style={s.unidad}>{linea.unidadMedida}</Text>
              </View>
            ))}
          </View>
        ))}
      </Page>
    </Document>
  );

  const buf = await renderToBuffer(doc);
  return Buffer.isBuffer(buf) ? buf : Buffer.from(buf);
}
