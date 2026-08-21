import {
  FAMILIA_ETIQUETA,
  FAMILIAS,
  formatearFechaLarga,
  type Familia,
  type PortalPedido,
  type PortalProducto,
  type PortalSaludo,
  type PortalSesion,
} from "@misupertostada/shared";

export function saludoCopy(saludo: PortalSaludo, nombre: string): string {
  return saludo === "tardes"
    ? `Buenas tardes, ${nombre}.`
    : `Buenas noches, ${nombre}.`;
}

export function entregaCopy(sesion: Pick<PortalSesion, "ventana">): string {
  const fecha = formatearFechaLarga(sesion.ventana.fechaOperacion);
  const hora = sesion.ventana.horarioEntregaFijo;
  return hora
    ? `Su pedido llega el ${fecha} a las ${hora}.`
    : `Su pedido llega el ${fecha}.`;
}

export function copyProximaApertura(iso: string): string {
  const fecha = formatearFechaLarga(iso.slice(0, 10));
  const hora = iso.slice(11, 16);
  return `Abre de nuevo el ${fecha} a las ${hora}.`;
}

export type CtaInicio =
  | { kind: "pedir"; label: "Hacer mi pedido" }
  | { kind: "editar"; label: "Ver o editar mi pedido" }
  | { kind: "catalogo"; label: "Ver catálogo" }
  | { kind: "pedidos"; label: "Ver mis pedidos" };

export function ctaInicio(input: {
  abierta: boolean;
  pedidoAbierto: PortalPedido | null;
}): CtaInicio {
  if (input.abierta && !input.pedidoAbierto) {
    return { kind: "pedir", label: "Hacer mi pedido" };
  }
  if (input.abierta && input.pedidoAbierto) {
    return { kind: "editar", label: "Ver o editar mi pedido" };
  }
  return { kind: "pedidos", label: "Ver mis pedidos" };
}

/** CTA secundaria cuando la ventana está cerrada: ver catálogo (solo lectura). */
export function ctaInicioSecundaria(abierta: boolean): CtaInicio | null {
  if (abierta) return null;
  return { kind: "catalogo", label: "Ver catálogo" };
}

export function avisoLimiteCredito(cuenta: {
  facturasPendientes: number;
  limiteFacturasPendientes: number | null;
}): string | null {
  const limite = cuenta.limiteFacturasPendientes;
  if (limite == null) return null;
  if (cuenta.facturasPendientes < limite) return null;
  return "Llegó al límite de facturas pendientes. Puede pedir igual; la fábrica le avisa antes de despachar.";
}

export type GrupoCatalogo = {
  key: string;
  titulo: string;
  productos: PortalProducto[];
};

function coincideBusqueda(p: PortalProducto, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    p.alias.toLowerCase().includes(q) ||
    p.nombreCanonico.toLowerCase().includes(q)
  );
}

/**
 * Favoritos primero (si coinciden), resto agrupado por familia
 * en el orden canónico TORTILLA → TOSTADA → FRITURA.
 */
export function gruposCatalogo(input: {
  catalogo: readonly PortalProducto[];
  query?: string;
}): { favoritos: PortalProducto[]; grupos: GrupoCatalogo[] } {
  const filtrados = input.catalogo.filter((p) =>
    coincideBusqueda(p, input.query ?? ""),
  );
  const favoritos = filtrados.filter((p) => p.favorito);
  const resto = filtrados.filter((p) => !p.favorito);

  const porFamilia = new Map<Familia, PortalProducto[]>();
  for (const f of FAMILIAS) porFamilia.set(f, []);
  for (const p of resto) {
    porFamilia.get(p.familia)?.push(p);
  }

  const grupos: GrupoCatalogo[] = [];
  for (const f of FAMILIAS) {
    const productos = porFamilia.get(f) ?? [];
    if (productos.length === 0) continue;
    grupos.push({
      key: f,
      titulo: FAMILIA_ETIQUETA[f],
      productos,
    });
  }

  return { favoritos, grupos };
}

export function origenPedidoLabel(origen: "PORTAL" | "MANUAL"): string {
  return origen === "PORTAL" ? "Portal" : "Tienda";
}

export function cantidadesDesdePedido(
  pedido: PortalPedido | null,
): Record<string, number> {
  if (!pedido) return {};
  return Object.fromEntries(
    pedido.items.map((item) => [item.productoId, item.cantidad]),
  );
}

export function lineasPedidoCount(cantidades: Record<string, number>): number {
  return Object.values(cantidades).filter((n) => n > 0).length;
}

export function assetSrcPathPortal(token: string, assetId: string): string {
  return `/p/${encodeURIComponent(token)}/assets/${assetId}`;
}
