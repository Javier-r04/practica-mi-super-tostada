"use client";

import {
  PortalCuentaFrame,
  PortalFacturasLista,
} from "@/components/portal/portal-cuenta-paneles";

export default function PortalFacturasPage() {
  return (
    <PortalCuentaFrame titulo="Facturas">
      {(data) => <PortalFacturasLista data={data} />}
    </PortalCuentaFrame>
  );
}
