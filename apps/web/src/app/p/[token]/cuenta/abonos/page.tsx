"use client";

import {
  PortalAbonosLista,
  PortalCuentaFrame,
} from "@/components/portal/portal-cuenta-paneles";

export default function PortalAbonosPage() {
  return (
    <PortalCuentaFrame titulo="Abonos">
      {(data) => <PortalAbonosLista data={data} />}
    </PortalCuentaFrame>
  );
}
