import React from "react";
import { render } from "takumi-pdf";
import {
  gruposNotaProduccion,
  gruposPorPuntoCarga,
  nombreDiaOperacion,
  textoClienteNota,
  type BloqueCliente,
  type HojaSnapshot,
  type LineaProducto,
} from "@misupertostada/shared";
import { View, Text, StyleSheet } from "./primitives/pdf-primitives";
import { PdfcnThemeProvider } from "./theme/theme-provider";
import { miSuperTostadaTheme } from "./theme/mi-super-tostada";

const MM = 2.83465;
const MARGEN = Math.round(12 * MM); // ~34pt

const s = StyleSheet.create({
  page: {
    fontSize: 10,
    fontFamily: "Helvetica, Arial, sans-serif",
    color: "#111",
    display: "flex",
    flexDirection: "column",
  },
  header: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: "#333",
    borderBottomStyle: "solid",
    paddingBottom: 8,
  },
  marca: { fontSize: 9, color: "#1B4D2A", display: "block" },
  titulo: {
    fontSize: 18,
    fontFamily: "Helvetica, Arial, sans-serif",
    fontWeight: "bold",
    display: "block",
  },
  meta: { fontSize: 9, color: "#444", display: "block" },
  grupo: {
    marginTop: 10,
    backgroundColor: "#1B4D2A",
    color: "#fff",
    paddingTop: 4,
    paddingBottom: 4,
    paddingLeft: 8,
    paddingRight: 8,
    fontSize: 11,
    fontFamily: "Helvetica, Arial, sans-serif",
    fontWeight: "bold",
    display: "block",
  },
  fila: {
    display: "flex",
    flexDirection: "row",
    alignItems: "flex-start",
    borderBottomWidth: 0.5,
    borderBottomColor: "#ccc",
    borderBottomStyle: "solid",
    paddingTop: 6,
    paddingBottom: 6,
    paddingLeft: 8,
    paddingRight: 8,
    breakInside: "avoid",
  },
  filaCambio: { backgroundColor: "#FDF0D6" },
  colProducto: { flex: 1, paddingRight: 8 },
  producto: {
    fontSize: 14,
    fontFamily: "Helvetica, Arial, sans-serif",
    fontWeight: "bold",
    display: "block",
  },
  notaCaja: {
    marginTop: 4,
    backgroundColor: "#FFF9D6",
    borderLeftWidth: 3,
    borderLeftColor: "#FFE100",
    borderLeftStyle: "solid",
    paddingTop: 4,
    paddingBottom: 4,
    paddingLeft: 6,
    paddingRight: 6,
  },
  notaTitulo: {
    fontSize: 9,
    fontFamily: "Helvetica, Arial, sans-serif",
    fontWeight: "bold",
    color: "#8A5502",
    display: "block",
  },
  notaCuerpo: {
    fontSize: 9,
    color: "#8A5502",
    marginTop: 2,
    lineHeight: 1.35,
    whiteSpace: "pre-line",
    display: "block",
  },
  cantidad: {
    fontSize: 24,
    fontFamily: "Helvetica, Arial, sans-serif",
    fontWeight: "bold",
    width: 72,
    textAlign: "right",
    display: "block",
  },
  unidad: {
    fontSize: 10,
    width: 48,
    marginLeft: 6,
    color: "#555",
    paddingTop: 8,
    display: "block",
  },
  marcaNuevo: {
    fontSize: 8,
    fontFamily: "Helvetica, Arial, sans-serif",
    fontWeight: "bold",
    width: 48,
    paddingTop: 6,
    color: "#8A5502",
    display: "block",
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
    <PdfcnThemeProvider theme={miSuperTostadaTheme}>
      <View style={s.page}>
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
      </View>
    </PdfcnThemeProvider>
  );

  const pdfBytes = await render(doc, {
    size: "letter",
    margin: MARGEN,
    metadata: {
      title: `Hoja de producción · ${dia} ${snapshot.fechaOperacion}`,
      authors: ["Mi Súper Tostada"],
      description: `Hoja de producción versión ${version}`,
      creator: "Mi Súper Tostada (pdfcn / takumi)",
    },
  });

  return Buffer.from(pdfBytes);
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
