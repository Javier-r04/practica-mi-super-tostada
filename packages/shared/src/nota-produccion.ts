import { UNIDAD_CORTA } from "./ordering";
import type { BloqueCliente, LineaProducto } from "./fulfillment";
import type { UnidadMedida } from "./estados";

export type NotaProduccionCliente = {
  nombre: string;
  cantidad: number | null;
  unidadMedida: UnidadMedida | null;
};

export type NotaProduccionGrupo = {
  nota: string;
  clientes: NotaProduccionCliente[];
};

/** Cliente que pidió un producto en la hoja, con o sin nota especial. */
export type ClienteDeProducto = {
  nombre: string;
  cantidad: number;
  unidadMedida: UnidadMedida;
  notaProduccion: string | null;
};

const SEP_NOTA_CLIENTE = " · ";
const SEP_SEGMENTOS = "; ";

/**
 * Lo que Alex tiene que ver en amarillo: nota de producción agrupada por
 * instrucción (GRUESA, grosor especial) y los clientes que la piden.
 *
 * Prefiere los ítems del snapshot (ahí hay cantidad). Si no hay, parsea el
 * string consolidado `"GRUESA · Cliente; GRUESA · Otro"` que ya está en hojas
 * materializadas — no se reescribe el snapshot.
 */
export function gruposNotaProduccion(
  linea: Pick<LineaProducto, "productoId" | "notaProduccion">,
  clientes?: readonly BloqueCliente[],
): NotaProduccionGrupo[] {
  const desdeClientes = clientes
    ? agruparDesdeClientes(linea.productoId, clientes)
    : [];
  if (desdeClientes.length > 0) return desdeClientes;
  return parsearNotaConsolidada(linea.notaProduccion);
}

export function textoClienteNota(cliente: NotaProduccionCliente): string {
  if (cliente.cantidad == null || cliente.unidadMedida == null) {
    return cliente.nombre;
  }
  return `${cliente.nombre} · ${cliente.cantidad} ${UNIDAD_CORTA[cliente.unidadMedida]}`;
}

/**
 * Desglose completo de un producto: todos los clientes que lo pidieron,
 * no solo los de nota especial. Orden alfabético por nombre.
 */
export function clientesDeProducto(
  productoId: string,
  clientes?: readonly BloqueCliente[],
): ClienteDeProducto[] {
  if (!clientes?.length) return [];
  const lista: ClienteDeProducto[] = [];
  for (const bloque of clientes) {
    for (const item of bloque.items) {
      if (item.productoId !== productoId) continue;
      const nota = item.notaProduccion?.trim() || null;
      lista.push({
        nombre: bloque.nombre,
        cantidad: item.cantidad,
        unidadMedida: item.unidadMedida,
        notaProduccion: nota,
      });
    }
  }
  return lista.sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
}

/**
 * Desglose listo para la hoja: cantidades del snapshot + notas del ítem.
 * Si el snapshot no trae notas pero la línea sí (string consolidado de
 * hojas viejas), reinyecta la nota por nombre de cliente.
 */
export function desgloseProductoConNotas(
  linea: Pick<LineaProducto, "productoId" | "notaProduccion">,
  clientes?: readonly BloqueCliente[],
): ClienteDeProducto[] {
  const base = clientesDeProducto(linea.productoId, clientes);
  if (base.length === 0) return base;
  if (base.some((c) => c.notaProduccion)) return base;

  const notaPorNombre = new Map<string, string>();
  for (const grupo of gruposNotaProduccion(linea, clientes)) {
    for (const c of grupo.clientes) {
      if (c.nombre) notaPorNombre.set(c.nombre, grupo.nota);
    }
  }
  if (notaPorNombre.size === 0) return base;

  return base.map((c) => ({
    ...c,
    notaProduccion: notaPorNombre.get(c.nombre) ?? c.notaProduccion,
  }));
}

function agruparDesdeClientes(
  productoId: string,
  clientes: readonly BloqueCliente[],
): NotaProduccionGrupo[] {
  const mapa = new Map<string, NotaProduccionCliente[]>();
  for (const bloque of clientes) {
    for (const item of bloque.items) {
      if (item.productoId !== productoId) continue;
      const nota = item.notaProduccion?.trim();
      if (!nota) continue;
      const lista = mapa.get(nota) ?? [];
      lista.push({
        nombre: bloque.nombre,
        cantidad: item.cantidad,
        unidadMedida: item.unidadMedida,
      });
      mapa.set(nota, lista);
    }
  }
  return ordenarGrupos(mapa);
}

function parsearNotaConsolidada(
  raw: string | null,
): NotaProduccionGrupo[] {
  const texto = raw?.trim();
  if (!texto) return [];
  const mapa = new Map<string, NotaProduccionCliente[]>();
  for (const segmento of texto.split(SEP_SEGMENTOS)) {
    const seg = segmento.trim();
    if (!seg) continue;
    const corte = seg.indexOf(SEP_NOTA_CLIENTE);
    if (corte === -1) {
      if (!mapa.has(seg)) mapa.set(seg, []);
      continue;
    }
    const nota = seg.slice(0, corte).trim();
    const nombre = seg.slice(corte + SEP_NOTA_CLIENTE.length).trim();
    if (!nota) continue;
    const lista = mapa.get(nota) ?? [];
    if (nombre && !lista.some((c) => c.nombre === nombre)) {
      lista.push({ nombre, cantidad: null, unidadMedida: null });
    }
    mapa.set(nota, lista);
  }
  return ordenarGrupos(mapa);
}

function ordenarGrupos(
  mapa: Map<string, NotaProduccionCliente[]>,
): NotaProduccionGrupo[] {
  return [...mapa.entries()]
    .map(([nota, clientes]) => ({
      nota,
      clientes: [...clientes].sort((a, b) =>
        a.nombre.localeCompare(b.nombre, "es"),
      ),
    }))
    .sort((a, b) => a.nota.localeCompare(b.nota, "es"));
}
