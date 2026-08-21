"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import {
  crearClienteRequestSchema,
  tienePermiso,
  type ActorPublico,
  type CarteraLista,
  type ClientePublico,
} from "@misupertostada/shared";
import { api, ApiError } from "@/lib/api";
import { toastFromError, toastSuccess } from "@/lib/toast";
import { subirFotoCliente } from "@/lib/upload-asset";
import {
  cobranzaDeCliente,
  resumenCobranzaPorCliente,
} from "@/lib/cliente-cobranza";
import { PanelShell } from "@/components/layout/panel-shell";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input, Textarea } from "@/components/ui/field";
import { SearchField } from "@/components/ui/search-field";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { FotoPicker } from "@/components/catalog/foto-picker";
import { ClienteMiniCard } from "@/components/catalog/cliente-mini-card";
import { SegmentedControl } from "@/components/ui/segmented-control";

type FiltroActivo = "activos" | "todos" | "con_saldo";

export default function ClientesPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [filtro, setFiltro] = useState<FiltroActivo>("activos");
  const [crear, setCrear] = useState(false);

  const me = useQuery({
    queryKey: ["auth", "me"],
    queryFn: () => api<{ usuario: ActorPublico }>("/auth/me"),
  });
  const canWrite = tienePermiso(me.data?.usuario.permisos ?? [], "catalogo.escribir");
  const clientes = useQuery({
    queryKey: ["clientes"],
    queryFn: () => api<ClientePublico[]>("/clientes"),
  });
  const cartera = useQuery({
    queryKey: ["cartera", { estado: "pendientes", limit: 200 }],
    queryFn: () =>
      api<CarteraLista>("/cartera?estado=pendientes&limit=200"),
    enabled: Boolean(me.data),
  });

  const cobranzaMap = useMemo(
    () => resumenCobranzaPorCliente(cartera.data?.items ?? []),
    [cartera.data],
  );

  const filtrados = useMemo(() => {
    const list = clientes.data ?? [];
    const needle = q.trim().toLowerCase();
    return list.filter((c) => {
      if (filtro === "activos" && !c.activo) return false;
      if (filtro === "con_saldo") {
        const cob = cobranzaDeCliente(c, cobranzaMap);
        if (cob.facturasPendientes === 0) return false;
      }
      if (!needle) return true;
      const haystack = [c.nombre, c.contacto ?? "", c.telefonoWa ?? ""]
        .join(" ")
        .toLowerCase();
      return haystack.includes(needle);
    });
  }, [clientes.data, q, filtro, cobranzaMap]);

  const loading = clientes.isLoading || cartera.isLoading;

  return (
    <PanelShell title="Clientes">
      <div className="grid gap-4">
        <div className="flex min-w-0 items-center gap-2 overflow-x-auto sm:gap-3">
          {canWrite ? (
            <Button size="sm" className="shrink-0" onClick={() => setCrear(true)}>
              <Plus size={15} aria-hidden />
              Agregar cliente
            </Button>
          ) : null}
          <SearchField
            value={q}
            onChange={setQ}
            label="Buscar cliente"
            placeholder="Nombre, contacto o WhatsApp"
            className="min-w-[10rem] flex-1"
          />
          <SegmentedControl
            label="Filtrar clientes"
            value={filtro}
            onChange={setFiltro}
            className="shrink-0"
            options={
              [
                { id: "activos", label: "Activos" },
                { id: "con_saldo", label: "Con saldo" },
                { id: "todos", label: "Todos" },
              ] as const
            }
          />
        </div>

        {loading ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-44 w-full rounded-tarjeta" />
            ))}
          </div>
        ) : filtrados.length === 0 ? (
          <EmptyState
            icon={<Users size={22} aria-hidden />}
            title={q ? "Ningún cliente coincide" : "No hay clientes"}
            description={
              q
                ? "Pruebe con el nombre comercial, el contacto o el teléfono."
                : filtro === "con_saldo"
                  ? "Nadie tiene facturas pendientes ahora."
                  : filtro === "activos"
                    ? "No hay clientes activos. Cambie a Todos o cree una ficha nueva."
                    : "Cree la ficha nueva. El portal y los alias viven dentro de cada cliente."
            }
            action={
              canWrite && !q && filtro !== "con_saldo" ? (
                <Button size="sm" onClick={() => setCrear(true)}>
                  Agregar cliente
                </Button>
              ) : null
            }
          />
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {filtrados.map((c) => (
              <li key={c.id}>
                <ClienteMiniCard
                  cliente={c}
                  cobranza={cobranzaDeCliente(c, cobranzaMap)}
                />
              </li>
            ))}
          </ul>
        )}
      </div>

      {crear && (
        <ClienteNuevoDialog
          onClose={() => setCrear(false)}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ["clientes"] });
            qc.invalidateQueries({ queryKey: ["cartera"] });
            setCrear(false);
          }}
        />
      )}
    </PanelShell>
  );
}

function ClienteNuevoDialog({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [foto, setFoto] = useState<File | null>(null);
  const form = useForm({
    defaultValues: {
      nombre: "",
      contacto: "",
      telefonoWa: "",
      horarioEntregaFijo: "",
      notasPermanentes: "",
      limiteFacturasPendientes: "",
    },
  });

  return (
    <Dialog
      open
      size="lg"
      onClose={onClose}
      title="Nuevo cliente"
      description="La foto ayuda a reconocer el restaurante en reparto y en el listado."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cerrar
          </Button>
          <Button type="submit" form="cliente-nuevo" loading={form.formState.isSubmitting}>
            Guardar cliente
          </Button>
        </>
      }
    >
      <form
        id="cliente-nuevo"
        className="grid gap-5"
        onSubmit={form.handleSubmit(async (values) => {
          const limite = values.limiteFacturasPendientes.trim();
          const parsed = crearClienteRequestSchema.safeParse({
            nombre: values.nombre,
            contacto: values.contacto.trim() || null,
            telefonoWa: values.telefonoWa.trim() || null,
            horarioEntregaFijo: values.horarioEntregaFijo.trim() || null,
            notasPermanentes: values.notasPermanentes.trim() || null,
            limiteFacturasPendientes: limite ? Number(limite) : null,
          });
          if (!parsed.success) {
            setError("Revise los datos del cliente");
            return;
          }
          let clienteId: string;
          try {
            const creado = await api<ClientePublico>("/clientes", {
              method: "POST",
              body: JSON.stringify(parsed.data),
            });
            clienteId = creado.id;
          } catch (err) {
            const msg = err instanceof ApiError ? err.message : "No se pudo guardar";
            setError(msg);
            toastFromError(err, "No se pudo guardar");
            return;
          }
          if (foto) {
            try {
              const assetId = await subirFotoCliente(foto, clienteId);
              await api(`/clientes/${clienteId}`, {
                method: "PATCH",
                body: JSON.stringify({ fotoAssetId: assetId }),
              });
            } catch (err) {
              toastFromError(
                err,
                "Cliente guardado; la foto no se subió. Puede agregarla en la ficha.",
              );
              onSaved();
              return;
            }
          }
          toastSuccess("Cliente guardado");
          onSaved();
        })}
      >
        <FotoPicker value={foto} onChange={setFoto} />

        <section className="grid gap-3">
          <h3 className="text-sm font-semibold text-tinta-900">Identidad</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Input
                id="nombre"
                label="Nombre del restaurante"
                required
                {...form.register("nombre")}
              />
            </div>
            <Input id="contacto" label="Contacto" {...form.register("contacto")} />
            <Input
              id="wa"
              label="Teléfono WhatsApp"
              placeholder="+502 …"
              {...form.register("telefonoWa")}
            />
          </div>
        </section>

        <section className="grid gap-3">
          <h3 className="text-sm font-semibold text-tinta-900">Entrega y cobranza</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              id="horario"
              label="Horario de entrega fijo"
              placeholder="09:00"
              hint="Formato 24 h, HH:MM"
              {...form.register("horarioEntregaFijo")}
            />
            <Input
              id="limite"
              label="Límite de facturas pendientes"
              inputMode="numeric"
              hint="Como en el cuaderno de cobros"
              {...form.register("limiteFacturasPendientes")}
            />
          </div>
        </section>

        <section className="grid gap-3">
          <h3 className="text-sm font-semibold text-tinta-900">Notas</h3>
          <Textarea
            id="notas"
            label="Notas permanentes"
            hint="Instrucciones que no cambian día a día"
            {...form.register("notasPermanentes")}
          />
        </section>

        {error && <p className="text-sm text-peligro">{error}</p>}
      </form>
    </Dialog>
  );
}
