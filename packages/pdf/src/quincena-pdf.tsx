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
  FAMILIA_ETIQUETA,
  UNIDAD_CORTA,
  fechaDeInstante,
  formatearCentavos,
  horaEnZona,
  reporteTablero,
  type Tablero,
} from "@misupertostada/shared";

const MM = 2.83465;
const MARGEN = 12 * MM;
/** LETTER (612pt) menos los dos márgenes. Ancho útil de una fila. */
const ANCHO = 612 - MARGEN * 2;

const MARCA = "#1B4D2A";
const MARCA_SUAVE = "#EEF3EC";
const TINTA = "#282A20";
const ACENTO = "#F2C230";
const DEMO = "#154A63";
const MUTED = "#767A69";
const LINEA = "#DEDFD6";
const CEBRA = "#F7F8F3";
const PELIGRO = "#B3231C";

const s = StyleSheet.create({
  page: {
    paddingTop: MARGEN,
    paddingBottom: MARGEN + 14,
    paddingHorizontal: MARGEN,
    fontSize: 8.5,
    fontFamily: "Helvetica",
    color: TINTA,
    lineHeight: 1.25,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderBottomWidth: 1,
    borderBottomColor: MARCA,
    paddingBottom: 7,
    marginBottom: 9,
  },
  marca: {
    fontSize: 7.5,
    color: MARCA,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  titulo: {
    fontSize: 17,
    fontFamily: "Helvetica-Bold",
    lineHeight: 1.15,
    marginTop: 2,
  },
  rango: { fontSize: 9.5, color: TINTA, marginTop: 3 },
  meta: { fontSize: 7.5, color: MUTED, marginTop: 2 },
  metaDer: { fontSize: 7.5, color: MUTED, textAlign: "right" },

  chips: { flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 4 },
  chip: {
    fontSize: 7,
    color: MARCA,
    backgroundColor: MARCA_SUAVE,
    borderRadius: 6,
    paddingVertical: 1.5,
    paddingHorizontal: 5,
  },

  kpis: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 10 },
  kpi: {
    width: (ANCHO - 6 * 2) / 3,
    borderWidth: 0.5,
    borderColor: LINEA,
    borderRadius: 3,
    borderLeftWidth: 2.5,
    borderLeftColor: LINEA,
    padding: 6,
  },
  kpiMarca: { backgroundColor: MARCA, borderColor: MARCA, borderLeftColor: ACENTO },
  kpiLabel: {
    fontSize: 6.5,
    color: MUTED,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  kpiLabelMarca: { color: "#BFD6C0" },
  kpiValor: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    lineHeight: 1.1,
    marginTop: 3,
    color: MARCA,
  },
  kpiValorMarca: { color: ACENTO },
  kpiHint: { fontSize: 6.8, color: MUTED, marginTop: 3 },
  kpiHintMarca: { color: "#BFD6C0" },

  seccion: { marginBottom: 9 },
  seccionTitulo: {
    fontSize: 9.5,
    fontFamily: "Helvetica-Bold",
    marginBottom: 1,
  },
  seccionNota: { fontSize: 7, color: MUTED, marginBottom: 4 },

  fila2: { flexDirection: "row", gap: 8 },
  col: { width: (ANCHO - 8) / 2 },

  barRow: { flexDirection: "row", alignItems: "center", marginBottom: 2.5 },
  barLabel: { width: 96, fontSize: 7 },
  barTrack: { flex: 1, height: 7, backgroundColor: "#EDEEE8", borderRadius: 2 },
  barFill: { height: 7, borderRadius: 2 },
  barVal: { width: 58, fontSize: 7, textAlign: "right", fontFamily: "Helvetica-Bold" },

  th: {
    flexDirection: "row",
    borderBottomWidth: 0.8,
    borderBottomColor: MARCA,
    paddingBottom: 2.5,
  },
  thTexto: {
    fontSize: 6.5,
    fontFamily: "Helvetica-Bold",
    color: MUTED,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  tr: {
    flexDirection: "row",
    borderBottomWidth: 0.4,
    borderBottomColor: LINEA,
    paddingVertical: 2.5,
  },
  trCebra: { backgroundColor: CEBRA },
  td: { fontSize: 7.5 },
  total: {
    flexDirection: "row",
    borderTopWidth: 0.8,
    borderTopColor: MARCA,
    paddingTop: 3,
    marginTop: 1,
  },
  totalTexto: { fontSize: 7.5, fontFamily: "Helvetica-Bold" },

  aviso: {
    borderWidth: 0.5,
    borderColor: LINEA,
    borderRadius: 3,
    padding: 6,
    marginBottom: 6,
  },
  avisoAlerta: { borderColor: PELIGRO, backgroundColor: "#FCF0EF" },
  avisoTitulo: { fontSize: 8, fontFamily: "Helvetica-Bold", marginBottom: 2 },
  avisoTexto: { fontSize: 7.5, color: TINTA },

  pieNota: {
    position: "absolute",
    bottom: MARGEN - 8,
    left: MARGEN,
    width: ANCHO,
    fontSize: 6.5,
    color: MUTED,
    borderTopWidth: 0.4,
    borderTopColor: LINEA,
    paddingTop: 4,
  },
  pieSello: {
    position: "absolute",
    bottom: MARGEN - 8,
    left: MARGEN,
    width: ANCHO,
    fontSize: 6.5,
    color: MUTED,
    textAlign: "right",
    paddingTop: 4,
  },
});

/** `Style` no se re-exporta desde el renderer; se toma del propio `View`. */
type EstiloPdf = React.ComponentProps<typeof View>["style"];

const der = { textAlign: "right" as const };

/**
 * Helvetica (WinAnsi) no trae el menos tipográfico «−» que usa
 * `formatearCentavos`: sin esto un delta negativo se imprimía sin signo y el
 * cierre decía que las ventas habían subido.
 */
function q(
  centavos: number,
  opts?: { simbolo?: boolean; miles?: boolean },
): string {
  return formatearCentavos(centavos, opts).replace("−", "-");
}

/** Puntos base (1/100 de punto porcentual) a "12.3 %", con signo. */
function pctDePuntosBase(puntosBase: number, conSigno = false): string {
  const signo = puntosBase < 0 ? "-" : conSigno && puntosBase > 0 ? "+" : "";
  const abs = Math.abs(puntosBase);
  return `${signo}${Math.trunc(abs / 100)}.${Math.trunc((abs % 100) / 10)} %`;
}

/** "2026-08-16" → "16 ago". Sin luxon: el paquete solo dibuja. */
const MESES = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sep",
  "oct",
  "nov",
  "dic",
];
function diaCorto(iso: string): string {
  const [, m, d] = iso.split("-");
  const mes = MESES[Number(m) - 1];
  if (!mes || !d) return iso;
  return `${Number(d)} ${mes}`;
}

/** Corta sin partir a la mitad una palabra corta; añade elipsis si sobra. */
function recortar(texto: string, max: number): string {
  if (texto.length <= max) return texto;
  return `${texto.slice(0, max - 1).trimEnd()}...`;
}

function Barra({
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
    <View style={s.barRow} wrap={false}>
      <Text style={s.barLabel}>{label}</Text>
      <View style={s.barTrack}>
        <View style={[s.barFill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
      <Text style={s.barVal}>{valor}</Text>
    </View>
  );
}

function Seccion({
  titulo,
  nota,
  style,
  children,
}: {
  titulo: string;
  nota?: string;
  style?: EstiloPdf;
  children: React.ReactNode;
}) {
  return (
    <View style={[s.seccion, style]}>
      <Text style={s.seccionTitulo}>{titulo}</Text>
      {nota ? <Text style={s.seccionNota}>{nota}</Text> : null}
      {children}
    </View>
  );
}

function Kpi({
  label,
  valor,
  hint,
  marca,
}: {
  label: string;
  valor: string;
  hint?: string;
  marca?: boolean;
}) {
  return (
    <View style={[s.kpi, marca ? s.kpiMarca : {}]} wrap={false}>
      <Text style={[s.kpiLabel, marca ? s.kpiLabelMarca : {}]}>{label}</Text>
      <Text style={[s.kpiValor, marca ? s.kpiValorMarca : {}]}>{valor}</Text>
      {hint ? (
        <Text style={[s.kpiHint, marca ? s.kpiHintMarca : {}]}>{hint}</Text>
      ) : null}
    </View>
  );
}

/**
 * Reporte del tablero, listo para imprimir.
 *
 * Refleja lo que muestra `/tablero` con el mismo recorte: los KPI, el
 * movimiento diario (ventas y caja lado a lado), participación por cliente,
 * volumen por producto, antigüedad de cartera, ruta y adopción, la tabla de
 * clientes completa y las alertas accionables.
 *
 * `generadoAt` viene del `BusinessCalendar` del servidor; el paquete no
 * inventa la hora.
 */
export async function renderQuincenaPdf(
  data: Tablero,
  opts: { generadoAt?: Date } = {},
): Promise<Buffer> {
  const {
    filtrosAplicados: f,
    kpis,
    ventas,
    productos,
    cartera,
    adopcion,
    operacion,
    cobradoPorDia,
    clientes,
  } = data;

  const { titulo } = reporteTablero({
    periodo: f.periodo,
    desde: f.desde,
    hasta: f.hasta,
  });
  const unDia = f.desde === f.hasta;

  const chips = [
    f.clienteId ? "Un cliente" : null,
    f.familia ? FAMILIA_ETIQUETA[f.familia] : null,
    f.puntoCarga ? (f.puntoCarga === "PLANTA" ? "Planta" : "La Demo") : null,
    f.origen ? (f.origen === "PORTAL" ? "Portal" : "Manual") : null,
  ].filter((c): c is string => Boolean(c));

  const sello = opts.generadoAt
    ? `Generado ${diaCorto(fechaDeInstante(opts.generadoAt))} ${horaEnZona(opts.generadoAt)}`
    : null;

  // Movimiento diario: ventas y caja del mismo día en una sola fila. Eran dos
  // gráficas separadas y nadie podía cruzar "vendí X / entró Y" sin sumar a mano.
  const cobradoMap = new Map(cobradoPorDia.map((c) => [c.fecha, c]));
  const dias = ventas.porDia.map((d) => {
    const c = cobradoMap.get(d.fecha);
    const efectivo = c?.efectivoCentavos ?? 0;
    const transferencia = c?.transferenciaCentavos ?? 0;
    return {
      fecha: d.fecha,
      pedidos: d.pedidos,
      ventasCentavos: d.montoCentavos,
      efectivo,
      transferencia,
      cobrado: efectivo + transferencia,
    };
  });
  const diasConMovimiento = dias.filter(
    (d) => d.pedidos > 0 || d.ventasCentavos !== 0 || d.cobrado !== 0,
  );
  // Un mes entero son 31 filas de las que la mitad suelen ir en cero; en un
  // cierre lo que importa son los días que movieron algo.
  const diasMostrados = diasConMovimiento.length > 0 ? diasConMovimiento : dias;
  const diasOcultos = dias.length - diasMostrados.length;
  const totalDias = diasMostrados.reduce(
    (acc, d) => ({
      pedidos: acc.pedidos + d.pedidos,
      ventas: acc.ventas + d.ventasCentavos,
      efectivo: acc.efectivo + d.efectivo,
      transferencia: acc.transferencia + d.transferencia,
      cobrado: acc.cobrado + d.cobrado,
    }),
    { pedidos: 0, ventas: 0, efectivo: 0, transferencia: 0, cobrado: 0 },
  );
  const maxDia = Math.max(
    1,
    ...diasMostrados.map((d) => Math.max(d.ventasCentavos, d.cobrado)),
  );

  const TOP = 8;
  const topClientes = ventas.porCliente.slice(0, TOP);
  const restoClientes = ventas.porCliente.slice(TOP);
  const restoClientesMonto = restoClientes.reduce(
    (acc, c) => acc + c.montoCentavos,
    0,
  );
  const restoClientesPuntosBase = restoClientes.reduce(
    (acc, c) => acc + c.puntosBase,
    0,
  );
  const maxCli = Math.max(
    1,
    ...topClientes.map((c) => c.montoCentavos),
    restoClientesMonto,
  );

  const topProductos = productos.slice(0, 10);
  const restoProductos = productos.length - topProductos.length;
  const maxProd = Math.max(1, ...topProductos.map((p) => p.cantidad));

  const maxTramo = Math.max(1, ...cartera.tramos.map((t) => t.saldoCentavos));
  const carteraVacia = cartera.tramos.every((t) => t.saldoCentavos === 0);
  const carteraVencidaCentavos = cartera.tramos
    .filter((t) => t.clave === "15-30" || t.clave === "31+")
    .reduce((acc, t) => acc + t.saldoCentavos, 0);

  const clientesConPedido = clientes.filter((c) => c.pedidos > 0);
  const dejaronDePedir = clientes.filter((c) => c.dejoDePedir);
  const totalClientes = clientesConPedido.reduce(
    (acc, c) => acc + c.pedidos,
    0,
  );

  const doc = (
    <Document
      title={`${titulo} · ${f.desde} – ${f.hasta}`}
      author="Mi Súper Tostada"
      subject={f.etiqueta}
      keywords={chips.join(", ")}
    >
      <Page size="LETTER" style={s.page}>
        <Text style={s.pieNota} fixed>
          Montos en quetzales. Una factura está pagada cuando la suma de sus
          abonos la cubre. Los pedidos anulados no suman.
        </Text>
        {/*
          Identificación en cada hoja: el cierre se imprime y se reparte, y una
          hoja suelta sin periodo no se puede archivar. El número de página se
          omite a propósito: `render` dinámico no llega al PDF en este
          documento (react-pdf 4.6) y una numeración a medias engaña más que
          no tenerla.
        */}
        <Text style={s.pieSello} fixed>
          {titulo} · {f.desde} – {f.hasta}
        </Text>
        <View style={s.header} fixed>
          <View>
            <Text style={s.marca}>Mi Súper Tostada</Text>
            <Text style={s.titulo}>{titulo}</Text>
            <Text style={s.rango}>{f.etiqueta}</Text>
            <Text style={s.meta}>
              {f.desde} – {f.hasta} · días de calendario en Guatemala
            </Text>
            {chips.length > 0 ? (
              <View style={s.chips}>
                {chips.map((c) => (
                  <Text key={c} style={s.chip}>
                    {c}
                  </Text>
                ))}
              </View>
            ) : null}
          </View>
          <View>
            <Text style={s.metaDer}>America/Guatemala</Text>
            {sello ? <Text style={s.metaDer}>{sello}</Text> : null}
            <Text style={s.metaDer}>
              {chips.length > 0 ? "Recorte con filtros" : "Sin filtros"}
            </Text>
          </View>
        </View>

        <View style={s.kpis}>
          <Kpi
            marca
            label="Ventas facturadas"
            valor={q(kpis.ventasCentavos)}
            hint={`${q(kpis.ventasDeltaCentavos)} · ${pctDePuntosBase(kpis.ventasDeltaPuntosBase, true)} vs ${ventas.anterior.desde} – ${ventas.anterior.hasta}`}
          />
          <Kpi
            label="Pedidos"
            valor={String(kpis.pedidos)}
            hint={`${kpis.portal} del portal · ${kpis.manual} manuales`}
          />
          <Kpi
            label="Cobrado en el periodo"
            valor={q(kpis.cobradoCentavos)}
            hint={`Efectivo ${q(kpis.cobradoEfectivoCentavos)} · Transferencia ${q(kpis.cobradoTransferenciaCentavos)} · Cheque ${q(kpis.cobradoChequeCentavos)}`}
          />
          <Kpi
            label="Por cobrar"
            valor={
              f.carteraAplica ? q(kpis.porCobrarCentavos) : "N/A"
            }
            hint={
              f.carteraAplica
                ? `Vencido 15+ días ${q(carteraVencidaCentavos)}`
                : "La cartera no se recorta por producto"
            }
          />
          <Kpi
            label={unDia ? "Aún no piden" : "Dejaron de pedir"}
            valor={String(kpis.clientesAlertaCount)}
            hint={
              unDia
                ? "Activos sin pedido en esta fecha"
                : "Diarios en silencio 3 días hábiles"
            }
          />
          <Kpi
            label="Adopción del portal"
            valor={pctDePuntosBase(kpis.adopcionPuntosBase)}
            hint={`${adopcion.portal} portal · ${adopcion.manual} manual`}
          />
        </View>

        <Seccion
          titulo="Movimiento diario"
          nota="Ventas facturadas y caja del mismo día de calendario. La caja puede cubrir facturas de días anteriores."
        >
          <View style={s.th} fixed>
            <Text style={[s.thTexto, { width: "16%" }]}>Día</Text>
            <Text style={[s.thTexto, { width: "10%" }, der]}>Pedidos</Text>
            <Text style={[s.thTexto, { width: "18%" }, der]}>Ventas</Text>
            <Text style={[s.thTexto, { width: "18%" }, der]}>Efectivo</Text>
            <Text style={[s.thTexto, { width: "18%" }, der]}>Transferencia</Text>
            <Text style={[s.thTexto, { width: "20%" }, der]}>Cobrado</Text>
          </View>
          {diasMostrados.map((d, i) => (
            <View
              key={d.fecha}
              style={[s.tr, i % 2 === 1 ? s.trCebra : {}]}
              wrap={false}
            >
              <Text style={[s.td, { width: "16%" }]}>{diaCorto(d.fecha)}</Text>
              <Text style={[s.td, { width: "10%" }, der]}>{d.pedidos}</Text>
              <Text style={[s.td, { width: "18%" }, der]}>
                {q(d.ventasCentavos, { simbolo: false })}
              </Text>
              <Text style={[s.td, { width: "18%" }, der]}>
                {q(d.efectivo, { simbolo: false })}
              </Text>
              <Text style={[s.td, { width: "18%" }, der]}>
                {q(d.transferencia, { simbolo: false })}
              </Text>
              <Text style={[s.td, { width: "20%" }, der]}>
                {q(d.cobrado, { simbolo: false })}
              </Text>
            </View>
          ))}
          <View style={s.total} wrap={false}>
            <Text style={[s.totalTexto, { width: "16%" }]}>Total</Text>
            <Text style={[s.totalTexto, { width: "10%" }, der]}>
              {totalDias.pedidos}
            </Text>
            <Text style={[s.totalTexto, { width: "18%" }, der]}>
              {q(totalDias.ventas)}
            </Text>
            <Text style={[s.totalTexto, { width: "18%" }, der]}>
              {q(totalDias.efectivo)}
            </Text>
            <Text style={[s.totalTexto, { width: "18%" }, der]}>
              {q(totalDias.transferencia)}
            </Text>
            <Text style={[s.totalTexto, { width: "20%" }, der]}>
              {q(totalDias.cobrado)}
            </Text>
          </View>
          {diasOcultos > 0 ? (
            <Text style={s.seccionNota}>
              {diasOcultos === 1
                ? "1 día sin movimiento se omitió."
                : `${diasOcultos} días sin movimiento se omitieron.`}
            </Text>
          ) : null}
        </Seccion>

        <View style={s.fila2}>
          <Seccion
            style={s.col}
            titulo="Participación por cliente"
            nota={`Quién mueve la planta · ${ventas.porCliente.length} con venta`}
          >
            {topClientes.length === 0 ? (
              <Text style={s.seccionNota}>Sin ventas por cliente.</Text>
            ) : (
              <>
                {topClientes.map((c) => (
                  <Barra
                    key={c.clienteId}
                    label={recortar(c.nombre, 20)}
                    ratio={c.montoCentavos / maxCli}
                    valor={`${pctDePuntosBase(c.puntosBase)}`}
                    color={MARCA}
                  />
                ))}
                {restoClientes.length > 0 ? (
                  <Barra
                    label={`Otros ${restoClientes.length}`}
                    ratio={restoClientesMonto / maxCli}
                    valor={pctDePuntosBase(restoClientesPuntosBase)}
                    color={MUTED}
                  />
                ) : null}
              </>
            )}
          </Seccion>

          <Seccion
            style={s.col}
            titulo="Volumen por producto"
            nota="Cantidad pedida · verde planta, azul La Demo"
          >
            {topProductos.length === 0 ? (
              <Text style={s.seccionNota}>Sin volumen en este recorte.</Text>
            ) : (
              <>
                {topProductos.map((p) => (
                  <Barra
                    key={`${p.nombreMostrado}-${p.puntoCarga}-${p.unidadMedida}`}
                    label={recortar(p.nombreMostrado, 20)}
                    ratio={p.cantidad / maxProd}
                    valor={`${p.cantidad} ${UNIDAD_CORTA[p.unidadMedida]}`}
                    color={p.puntoCarga === "PLANTA" ? MARCA : DEMO}
                  />
                ))}
                {restoProductos > 0 ? (
                  <Text style={s.seccionNota}>
                    +{restoProductos} presentaciones más en el recorte.
                  </Text>
                ) : null}
              </>
            )}
          </Seccion>
        </View>

        <View style={s.fila2}>
          <Seccion
            style={s.col}
            titulo="Antigüedad de cartera"
            nota={
              f.carteraAplica
                ? "Días desde la emisión de la factura"
                : "No aplica: el recorte por producto no parte facturas"
            }
          >
            {!f.carteraAplica || carteraVacia ? (
              <Text style={s.seccionNota}>
                {f.carteraAplica ? "Sin saldo pendiente." : "N/A"}
              </Text>
            ) : (
              cartera.tramos.map((t) => (
                <Barra
                  key={t.clave}
                  label={`${t.clave} días · ${t.facturas} fac`}
                  ratio={t.saldoCentavos / maxTramo}
                  valor={q(t.saldoCentavos, { simbolo: false })}
                  color={
                    t.clave === "15-30" || t.clave === "31+" ? PELIGRO : MARCA
                  }
                />
              ))
            )}
          </Seccion>

          <Seccion
            style={s.col}
            titulo="Ruta y adopción"
            nota="Estado de los pedidos del recorte"
          >
            <Barra
              label="Confirmados"
              ratio={
                operacion.ruta.confirmados / Math.max(1, operacion.pedidos)
              }
              valor={String(operacion.ruta.confirmados)}
              color={MARCA}
            />
            <Barra
              label="En producción"
              ratio={
                operacion.ruta.enProduccion / Math.max(1, operacion.pedidos)
              }
              valor={String(operacion.ruta.enProduccion)}
              color={MARCA}
            />
            <Barra
              label="Entregados"
              ratio={operacion.ruta.entregados / Math.max(1, operacion.pedidos)}
              valor={String(operacion.ruta.entregados)}
              color={MARCA}
            />
            <Barra
              label="Anulados"
              ratio={operacion.ruta.anulados / Math.max(1, operacion.pedidos)}
              valor={String(operacion.ruta.anulados)}
              color={PELIGRO}
            />
            <Barra
              label="Portal"
              ratio={
                adopcion.portal / Math.max(1, adopcion.portal + adopcion.manual)
              }
              valor={String(adopcion.portal)}
              color={ACENTO}
            />
            <Barra
              label="Manual"
              ratio={
                adopcion.manual / Math.max(1, adopcion.portal + adopcion.manual)
              }
              valor={String(adopcion.manual)}
              color={MUTED}
            />
          </Seccion>
        </View>

        <Seccion
          titulo="Clientes"
          nota="Ticket promedio y días de pago del recorte; el último pedido mira los 30 días previos."
          style={{ marginTop: 2 }}
        >
          <View style={s.th} fixed>
            <Text style={[s.thTexto, { width: "34%" }]}>Cliente</Text>
            <Text style={[s.thTexto, { width: "11%" }, der]}>Pedidos</Text>
            <Text style={[s.thTexto, { width: "19%" }, der]}>
              Ticket promedio
            </Text>
            <Text style={[s.thTexto, { width: "14%" }, der]}>Días de pago</Text>
            <Text style={[s.thTexto, { width: "22%" }, der]}>Último pedido</Text>
          </View>
          {clientes.length === 0 ? (
            <Text style={s.seccionNota}>Sin clientes en este recorte.</Text>
          ) : (
            clientes.map((c, i) => (
              <View
                key={c.clienteId}
                style={[s.tr, i % 2 === 1 ? s.trCebra : {}]}
                wrap={false}
              >
                <Text
                  style={[
                    s.td,
                    { width: "34%" },
                    c.dejoDePedir ? { color: PELIGRO } : {},
                  ]}
                >
                  {recortar(c.nombre, 40)}
                  {c.dejoDePedir ? " · dejó de pedir" : ""}
                </Text>
                <Text style={[s.td, { width: "11%" }, der]}>{c.pedidos}</Text>
                <Text style={[s.td, { width: "19%" }, der]}>
                  {q(c.ticketPromedioCentavos)}
                </Text>
                <Text style={[s.td, { width: "14%" }, der]}>
                  {c.diasPagoMediana}
                </Text>
                <Text style={[s.td, { width: "22%" }, der]}>
                  {c.ultimoPedidoFecha
                    ? diaCorto(c.ultimoPedidoFecha)
                    : "sin pedidos"}
                </Text>
              </View>
            ))
          )}
          {clientes.length > 0 ? (
            <View style={s.total} wrap={false}>
              <Text style={[s.totalTexto, { width: "34%" }]}>
                {clientesConPedido.length} con pedido de {clientes.length}
              </Text>
              <Text style={[s.totalTexto, { width: "11%" }, der]}>
                {totalClientes}
              </Text>
              <Text style={[s.totalTexto, { width: "19%" }, der]} />
              <Text style={[s.totalTexto, { width: "14%" }, der]} />
              <Text style={[s.totalTexto, { width: "22%" }, der]} />
            </View>
          ) : null}
        </Seccion>

        <Seccion titulo="Requiere atención" nota="Lo que no se resuelve solo">
          {cartera.sobreLimite.length > 0 ? (
            <View style={[s.aviso, s.avisoAlerta]} wrap={false}>
              <Text style={s.avisoTitulo}>
                Sobre el límite de facturas pendientes ·{" "}
                {cartera.sobreLimite.length}
              </Text>
              <Text style={s.avisoTexto}>
                {cartera.sobreLimite
                  .map((c) => `${c.nombre} (${c.pendientes}/${c.limite})`)
                  .join(" · ")}
              </Text>
            </View>
          ) : null}
          {operacion.clientesSinPedido.length > 0 ? (
            <View style={s.aviso} wrap={false}>
              <Text style={s.avisoTitulo}>
                Aún no piden · {operacion.clientesSinPedido.length}
              </Text>
              <Text style={s.avisoTexto}>
                {operacion.clientesSinPedido.map((c) => c.nombre).join(" · ")}
              </Text>
            </View>
          ) : null}
          {dejaronDePedir.length > 0 ? (
            <View style={[s.aviso, s.avisoAlerta]} wrap={false}>
              <Text style={s.avisoTitulo}>
                Dejaron de pedir · {dejaronDePedir.length}
              </Text>
              <Text style={s.avisoTexto}>
                {dejaronDePedir
                  .map(
                    (c) =>
                      `${c.nombre}${c.ultimoPedidoFecha ? ` (último ${diaCorto(c.ultimoPedidoFecha)})` : ""}`,
                  )
                  .join(" · ")}
              </Text>
            </View>
          ) : null}
          {cartera.sobreLimite.length === 0 &&
          operacion.clientesSinPedido.length === 0 &&
          dejaronDePedir.length === 0 ? (
            <Text style={s.seccionNota}>
              Nada pendiente: sin clientes sobre el límite ni en silencio.
            </Text>
          ) : null}
        </Seccion>

      </Page>
    </Document>
  );

  const buf = await renderToBuffer(doc);
  return Buffer.isBuffer(buf) ? buf : Buffer.from(buf);
}
