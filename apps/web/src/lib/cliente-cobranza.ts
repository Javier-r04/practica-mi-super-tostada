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
