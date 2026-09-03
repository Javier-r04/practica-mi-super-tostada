"use client";

import {
  PortalCuentaFrame,
  PortalReportarTransferencia,
} from "@/components/portal/portal-cuenta-paneles";

export default function PortalTransferenciaPage() {
  return (
    <PortalCuentaFrame titulo="Reportar transferencia">
      {() => <PortalReportarTransferencia />}
    </PortalCuentaFrame>
  );
}
