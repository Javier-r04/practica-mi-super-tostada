import type { ClientePublico, FacturaCartera } from "@misupertostada/shared";

export type ClienteCobranzaResumen = {
  facturasPendientes: number;
  facturasEnProgreso: number;
  facturasVencidas: number;
  saldoCentavos: number;
};

/** Agrega cartera pendiente por cliente. "En progreso" = saldo abierto sin DTE (Carla aún facturando). */
export function resumenCobranzaPorCliente(
  facturas: ReadonlyArray<FacturaCartera>,
): Map<string, ClienteCobranzaResumen> {
  const map = new Map<string, ClienteCobranzaResumen>();
  for (const f of facturas) {
    if (f.estado === "PAGADO") continue;
    const prev = map.get(f.clienteId) ?? {
      facturasPendientes: 0,
      facturasEnProgreso: 0,
      facturasVencidas: 0,
      saldoCentavos: 0,
    };
    map.set(f.clienteId, {
      facturasPendientes: prev.facturasPendientes + 1,
      facturasEnProgreso: prev.facturasEnProgreso + (f.numeroDte ? 0 : 1),
      facturasVencidas: prev.facturasVencidas + (f.estado === "VENCIDO" ? 1 : 0),
      saldoCentavos: prev.saldoCentavos + f.saldoCentavos,
    });
  }
  return map;
}

export function cobranzaDeCliente(
  cliente: ClientePublico,
  porCliente: Map<string, ClienteCobranzaResumen>,
): ClienteCobranzaResumen {
  return (
    porCliente.get(cliente.id) ?? {
      facturasPendientes: 0,
      facturasEnProgreso: 0,
      facturasVencidas: 0,
      saldoCentavos: 0,
    }
  );
}

/** Gravedad de la cuenta, de mayor a menor. Ordena el listado y tiñe la ficha. */
export type NivelAlertaCliente = "excedido" | "vencido" | "pendiente" | "ninguno";

const ORDEN_ALERTA: Record<NivelAlertaCliente, number> = {
  excedido: 0,
  vencido: 1,
  pendiente: 2,
  ninguno: 3,
};

export function nivelAlertaCliente(
  cliente: ClientePublico,
  cobranza: ClienteCobranzaResumen,
): NivelAlertaCliente {
  if (
    cliente.limiteFacturasPendientes != null &&
    cobranza.facturasPendientes >= cliente.limiteFacturasPendientes
  ) {
    return "excedido";
  }
  if (cobranza.facturasVencidas > 0) return "vencido";
  if (cobranza.facturasPendientes > 0) return "pendiente";
  return "ninguno";
}

/** Orden del listado: primero lo que hay que cobrar, luego alfabético. */
export function compararClientesPorAlerta(
  a: { nivel: NivelAlertaCliente; nombre: string },
  b: { nivel: NivelAlertaCliente; nombre: string },
): number {
  const d = ORDEN_ALERTA[a.nivel] - ORDEN_ALERTA[b.nivel];
  return d !== 0 ? d : a.nombre.localeCompare(b.nombre, "es");
}

export type ResumenClientes = {
  activos: number;
  conSaldo: number;
  saldoCentavos: number;
  porFacturar: number;
  excedidos: number;
};

/** Cifras de cabecera del listado: el resumen que Cristian saca del cuaderno. */
export function resumenClientes(
  clientes: ReadonlyArray<ClientePublico>,
  porCliente: Map<string, ClienteCobranzaResumen>,
): ResumenClientes {
  let activos = 0;
  let conSaldo = 0;
  let saldoCentavos = 0;
  let porFacturar = 0;
  let excedidos = 0;
  for (const c of clientes) {
    if (c.activo) activos += 1;
    const cob = cobranzaDeCliente(c, porCliente);
    if (cob.facturasPendientes > 0) conSaldo += 1;
    saldoCentavos += cob.saldoCentavos;
    porFacturar += cob.facturasEnProgreso;
    if (nivelAlertaCliente(c, cob) === "excedido") excedidos += 1;
  }
  return { activos, conSaldo, saldoCentavos, porFacturar, excedidos };
}
