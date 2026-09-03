"use client";

import Link from "next/link";
import { Card } from "@heroui/react";
import { Banknote, ChevronRight, Receipt, Upload } from "lucide-react";
import { formatearCentavos } from "@misupertostada/shared";
import { avisoLimiteCredito } from "@/lib/portal-vista";
import { usePortalSession } from "@/components/portal/portal-session";
import { usePortalCuenta } from "@/hooks/use-portal-cuenta";
import {
  PortalAvisoCredito,
  PortalCuentaDesactualizada,
} from "@/components/portal/portal-cuenta-paneles";

export default function PortalCuentaPage() {
  const { token, sesion } = usePortalSession();
  const cuenta = usePortalCuenta();
  const data = cuenta.data ?? sesion.cuenta;
  const aviso = avisoLimiteCredito(data);
  const base = `/p/${encodeURIComponent(token)}`;

  const entradas = [
    {
      href: `${base}/cuenta/facturas`,
      icon: Receipt,
      titulo: "Facturas",
      detalle:
        data.facturasPendientes === 0
          ? "Sin facturas pendientes"
          : `${data.facturasPendientes} ${
              data.facturasPendientes === 1 ? "pendiente" : "pendientes"
            } · ${formatearCentavos(data.saldoCentavos)}`,
    },
    {
      href: `${base}/cuenta/abonos`,
      icon: Banknote,
      titulo: "Abonos",
      detalle:
        data.abonos.length === 0
          ? "Aún no hay pagos registrados"
          : `${data.abonos.length} ${data.abonos.length === 1 ? "abono" : "abonos"}`,
    },
    {
      href: `${base}/cuenta/transferencia`,
      icon: Upload,
      titulo: "Reportar transferencia",
      detalle:
        data.transferenciasEnRevisionCentavos > 0
          ? `${formatearCentavos(data.transferenciasEnRevisionCentavos)} en revisión`
          : "Suba el comprobante del depósito",
    },
  ] as const;

  return (
      <div className="grid gap-4 py-4">
        <div>
          <h1 className="text-xl font-semibold text-tinta-900">Su cuenta</h1>
          <p className="mt-1 text-sm text-tinta-500">
            Facturas, abonos y reporte de transferencias.
          </p>
        </div>

        {/* La sesión ya trae la cuenta (`initialData`), así que nunca hay estado
            vacío que esperar: lo que sí puede fallar es la actualización de
            fondo, y eso se dice sin tapar los datos que ya están en pantalla. */}
        <PortalCuentaDesactualizada cuenta={cuenta} />

        <>
            <PortalAvisoCredito aviso={aviso} />

            <ul className="grid gap-3 lg:grid-cols-3">
              {entradas.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="group block h-full text-inherit no-underline hover:text-inherit hover:no-underline focus-visible:outline-none focus-visible:shadow-foco"
                    >
                      <Card className="h-full min-h-24 gap-0 p-4 transition-shadow duration-control ease-out group-hover:shadow-[var(--shadow-md)]">
                        <Card.Header className="flex flex-row items-center gap-3 lg:flex-col lg:items-start">
                          <span className="grid size-12 shrink-0 place-items-center rounded-campo bg-marca-soft text-marca">
                            <Icon size={22} aria-hidden />
                          </span>
                          <div className="min-w-0 flex-1">
                            <Card.Title className="text-base leading-snug text-tinta-900">
                              {item.titulo}
                            </Card.Title>
                            <Card.Description className="mt-0.5 text-sm leading-snug text-pretty">
                              {item.detalle}
                            </Card.Description>
                          </div>
                          <ChevronRight
                            size={18}
                            className="shrink-0 text-tinta-400 lg:hidden"
                            aria-hidden
                          />
                        </Card.Header>
                      </Card>
                    </Link>
                  </li>
                );
              })}
            </ul>
        </>
      </div>
  );
}
