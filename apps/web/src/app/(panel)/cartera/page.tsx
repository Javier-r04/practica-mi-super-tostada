"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Banknote, FileDown, MessageCircle } from "lucide-react";
import {
  PAGO_METODOS,
  tienePermiso,
  type ActorPublico,
  type CarteraResumen,
  type ClientePublico,
  type CuadreDia,
  type FacturaCartera,
  type PagoRegistroResultado,
} from "@misupertostada/shared";
import { api, ApiError } from "@/lib/api";
import { PanelShell } from "@/components/layout/panel-shell";
import { PageToolbar } from "@/components/layout/page-header";
import { usePedidosSse } from "@/hooks/use-pedidos-sse";
import { useOnline } from "@/hooks/use-online";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Select, Input } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import { ContadorFacturas } from "@/components/domain/contador-facturas";
import { Money } from "@/components/domain/money";
import { TablaCartera } from "@/components/receivables/tabla-cartera";
import { DialogoPago } from "@/components/receivables/dialogo-pago";
import { VistaCuadre } from "@/components/receivables/cuadre-dia";
import { cn } from "@/lib/utils";

type TabCartera = "todas" | "pendientes" | "vencidas";

export default function CarteraPage() {
  const qc = useQueryClient();
  const online = useOnline();
  const [tab, setTab] = useState<TabCartera>("pendientes");
  const [clienteId, setClienteId] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [metodoPago, setMetodoPago] = useState("");
  const [cobrando, setCobrando] = useState<FacturaCartera | null>(null);
  const [error, setError] = useState<string>();

  const me = useQuery({
    queryKey: ["auth", "me"],
    queryFn: () => api<{ usuario: ActorPublico }>("/auth/me"),
  });
  usePedidosSse(Boolean(me.data));

  const puedeDte = tienePermiso(
    me.data?.usuario.permisos ?? [],
    "cobranza.capturar_dte",
  );
  const puedeCobrar = tienePermiso(
    me.data?.usuario.permisos ?? [],
    "cobranza.registrar_pago",
  );

  const filtros = { clienteId, desde, hasta, metodoPago };
  const clientes = useQuery({
    queryKey: ["clientes"],
    queryFn: () => api<ClientePublico[]>("/clientes"),
    enabled: Boolean(me.data),
  });
  const resumen = useQuery({
    queryKey: ["cartera", "resumen"],
    queryFn: () => api<CarteraResumen>("/cartera/resumen"),
    enabled: Boolean(me.data),
  });
  const facturas = useQuery({
    queryKey: ["cartera", filtros],
    queryFn: () =>
      api<FacturaCartera[]>(`/cartera${queryString({
        clienteId: clienteId || undefined,
        desde: desde || undefined,
        hasta: hasta || undefined,
        metodoPago: metodoPago || undefined,
      })}`),
    enabled: Boolean(me.data),
  });
  const cuadre = useQuery({
    queryKey: ["cuadre"],
    queryFn: () => api<CuadreDia>("/cobranza/cuadre"),
    enabled: Boolean(me.data),
  });

  const lista = useMemo(() => {
    const all = facturas.data ?? [];
    if (tab === "pendientes") return all.filter((f) => f.estado !== "PAGADO");
    if (tab === "vencidas") return all.filter((f) => f.estado === "VENCIDO");
    return all;
  }, [facturas.data, tab]);

  const counts = useMemo(() => {
    const all = facturas.data ?? [];
    return {
      todas: all.length,
      pendientes: all.filter((f) => f.estado !== "PAGADO").length,
      vencidas: all.filter((f) => f.estado === "VENCIDO").length,
    };
  }, [facturas.data]);

  const dte = useMutation({
    mutationFn: ({ id, numeroDte }: { id: string; numeroDte: string }) =>
      api(`/facturas/${id}/dte`, {
        method: "PATCH",
        body: JSON.stringify({ numeroDte }),
      }),
    onSuccess: () => {
      setError(undefined);
      void qc.invalidateQueries({ queryKey: ["cartera"] });
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : "No se pudo guardar el DTE");
    },
  });

  const pagar = useMutation({
    mutationFn: (body: unknown) =>
      api<PagoRegistroResultado>("/pagos", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      setCobrando(null);
      setError(undefined);
      void qc.invalidateQueries({ queryKey: ["cartera"] });
      void qc.invalidateQueries({ queryKey: ["cuadre"] });
      void qc.invalidateQueries({ queryKey: ["ruta"] });
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : "No se pudo registrar el pago");
    },
  });

  const hintDte = puedeDte
    ? undefined
    : "Solo tienda o administración captura el DTE";
  const hintCobro = puedeCobrar
    ? undefined
    : "No tiene permiso para registrar pagos";

  return (
    <PanelShell title="Cartera">
      <div className="grid gap-4">
        <PageToolbar
          description="El contador cuenta facturas, no pedidos. Pagado cuando la suma de abonos cubre el total."
          actions={
            <Button
              size="sm"
              variant="secondary"
              disabled
              title="Pronto · llega en dashboard"
            >
              <FileDown size={15} aria-hidden />
              Estado de cuenta PDF
            </Button>
          }
        />

        <div className="grid gap-3 lg:grid-cols-3">
          <ContadorFacturas
            pendientes={resumen.data?.pendientesCount ?? 0}
            montoCentavos={resumen.data?.pendientesSaldoCentavos}
            etiqueta="Facturas pendientes"
          />
          <Card title="Cobrado hoy">
            <Money
              centavos={resumen.data?.cobradoHoyCentavos ?? 0}
              tone="pagado"
              className="text-2xl"
            />
            <p className="mt-1 text-xs text-tinta-500">
              Pagos con fecha de hoy, no de la fecha de operación
            </p>
          </Card>
          <Card title="Al límite" subtitle="Alerta, no candado">
            {(resumen.data?.clientesSobreLimite.length ?? 0) === 0 ? (
              <p className="text-sm text-tinta-500">Ningún cliente en el límite</p>
            ) : (
              <ul className="grid gap-2">
                {resumen.data?.clientesSobreLimite.map((c) => (
                  <li key={c.clienteId} className="grid gap-2">
                    <ContadorFacturas
                      pendientes={c.pendientes}
                      limite={c.limite}
                      etiqueta={c.nombre}
                    />
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled
                      title="Llega en mensajería"
                    >
                      <MessageCircle size={15} aria-hidden />
                      Recordar por WhatsApp
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        {error && (
          <p className="text-sm text-peligro" role="alert">
            {error}
          </p>
        )}

        <Card
          flush
          title="Cartera"
          subtitle="Filtros de cliente, rango y método · el corte quincenal usa desde / hasta"
        >
          <div className="grid gap-3 border-b border-[var(--border-subtle)] px-4 py-3 sm:grid-cols-2 lg:grid-cols-4">
            <Select
              id="filtro-cliente"
              label="Cliente"
              value={clienteId}
              onChange={(e) => setClienteId(e.target.value)}
            >
              <option value="">Todos</option>
              {(clientes.data ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </Select>
            <Input
              id="filtro-desde"
              label="Desde"
              type="date"
              value={desde}
              onChange={(e) => setDesde(e.target.value)}
            />
            <Input
              id="filtro-hasta"
              label="Hasta"
              type="date"
              value={hasta}
              onChange={(e) => setHasta(e.target.value)}
            />
            <Select
              id="filtro-metodo"
              label="Método de pago"
              value={metodoPago}
              onChange={(e) => setMetodoPago(e.target.value)}
            >
              <option value="">Todos</option>
              {PAGO_METODOS.map((m) => (
                <option key={m} value={m}>
                  {m === "EFECTIVO" ? "Efectivo" : "Transferencia"}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex gap-1 overflow-x-auto px-4 py-2">
            {(
              [
                ["todas", "Todas", counts.todas],
                ["pendientes", "Pendientes", counts.pendientes],
                ["vencidas", "Vencidas", counts.vencidas],
              ] as const
            ).map(([id, label, count]) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={cn(
                  "inline-flex min-h-11 items-center gap-2 rounded-campo px-3 text-sm font-semibold",
                  tab === id
                    ? "bg-marca text-blanco"
                    : "bg-tinta-50 text-tinta-800",
                )}
              >
                {label}
                <span className="tabular-nums opacity-80">{count}</span>
              </button>
            ))}
          </div>
          {facturas.isLoading && <Skeleton className="mx-4 mb-4 h-40" />}
          {facturas.data && lista.length === 0 && (
            <EmptyState
              title="No hay facturas en este filtro"
              description="Al entregar un pedido se crea la factura sobre lo entregado."
              icon={<Banknote size={22} />}
            />
          )}
          {lista.length > 0 && (
            <TablaCartera
              facturas={lista}
              puedeDte={puedeDte}
              puedeCobrar={puedeCobrar}
              hintDte={hintDte}
              hintCobro={hintCobro}
              onCobrar={setCobrando}
              onDte={(fac, numeroDte) => dte.mutate({ id: fac.id, numeroDte })}
            />
          )}
        </Card>

        {cuadre.data && <VistaCuadre cuadre={cuadre.data} />}
      </div>

      {cobrando && (
        <DialogoPago
          key={cobrando.id}
          open
          titulo="Registrar pago"
          descripcion={`${cobrando.clienteNombre} · ${cobrando.numeroDte ?? "Sin DTE"}`}
          saldoCentavos={cobrando.saldoCentavos}
          online={online}
          loading={pagar.isPending}
          error={error}
          onClose={() => setCobrando(null)}
          onConfirm={(input) =>
            pagar.mutate({
              id: input.id,
              idempotencyKey: `cartera-${input.id}`,
              facturaId: cobrando.id,
              montoCentavos: input.montoCentavos,
              metodo: input.metodo,
              comprobanteAssetId: input.comprobanteAssetId,
            })
          }
        />
      )}
    </PanelShell>
  );
}

function queryString(params: Record<string, string | undefined>): string {
  const s = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v) s.set(k, v);
  }
  const out = s.toString();
  return out ? `?${out}` : "";
}
