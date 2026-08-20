"use client";

import { ESTADOS } from "@misupertostada/shared";
import Image from "next/image";
import { useState } from "react";
import { EstadoBadge } from "@/components/domain/estado-badge";
import { Money } from "@/components/domain/money";
import { Button } from "@/components/ui/button";

export default function LaboratorioPage() {
  const [guardando, setGuardando] = useState(false);

  return (
    <main className="mx-auto flex w-full max-w-[var(--page-max)] flex-col gap-8 px-gutter py-8 lg:px-gutter-lg">
      <header className="flex items-center gap-3 border-b border-tinta-200 pb-4">
        <Image
          src="/brand/logo-badge.png"
          alt="Mi Súper Tostada"
          width={40}
          height={35}
          priority
        />
        <div>
          <p className="mst-label">Laboratorio</p>
          <h1>Primitivas de producción</h1>
        </div>
      </header>

      <section className="flex flex-col gap-3 rounded-tarjeta border border-tinta-200 bg-blanco p-6 shadow-tarjeta">
        <h2>Button</h2>
        <p className="text-sm text-tinta-500">
          Un solo amarillo por pantalla. Hover cambia color, no opacidad.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="primary">Registrar cobro</Button>
          <Button variant="accent">Cerrar ventana y generar hoja</Button>
          <Button variant="secondary">Editar pedido</Button>
          <Button variant="ghost">Reabrir día</Button>
          <Button variant="danger">Anular pedido</Button>
          <Button
            variant="primary"
            loading={guardando}
            onClick={() => {
              setGuardando(true);
              window.setTimeout(() => setGuardando(false), 1200);
            }}
          >
            Guardar cobro
          </Button>
          <Button variant="secondary" disabled>
            Enviar plantilla
          </Button>
        </div>
        <div className="max-w-sm">
          <Button variant="primary" size="lg" block>
            Confirmar pedido
          </Button>
        </div>
      </section>

      <section className="flex flex-col gap-3 rounded-tarjeta border border-tinta-200 bg-blanco p-6 shadow-tarjeta">
        <h2>Money</h2>
        <p className="text-sm text-tinta-500">
          Recibe centavos enteros. El formateo a quetzales es la única capa de
          presentación.
        </p>
        <div className="flex flex-wrap items-end gap-8">
          <div className="flex flex-col gap-1">
            <span className="mst-label">Tablero</span>
            <Money centavos={124050} size="xl" />
          </div>
          <div className="flex flex-col gap-1">
            <span className="mst-label">Pagado</span>
            <Money centavos={85000} size="lg" tone="pagado" />
          </div>
          <div className="flex flex-col gap-1">
            <span className="mst-label">Pendiente</span>
            <Money centavos={32100} size="md" tone="pendiente" />
          </div>
          <div className="flex flex-col gap-1">
            <span className="mst-label">Vencido</span>
            <Money centavos={4500} size="sm" tone="vencido" />
          </div>
          <div className="flex flex-col gap-1 rounded-campo bg-marca-prof px-3 py-2">
            <span className="mst-label text-blanco/70">Inverso</span>
            <Money centavos={0} tone="inverse" />
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-3 rounded-tarjeta border border-tinta-200 bg-marca-prof p-6 shadow-tarjeta">
        <h2 className="text-blanco">Resumen de cartera</h2>
        <p className="text-sm text-blanco/70">
          Una tarjeta de marca por vista. El monto va en el mismo Plex, no en
          display promocional.
        </p>
        <Money centavos={124050} size="xl" tone="inverse" />
      </section>

      <section className="flex flex-col gap-3 rounded-tarjeta border border-tinta-200 bg-blanco p-6 shadow-tarjeta">
        <h2>EstadoBadge</h2>
        <p className="text-sm text-tinta-500">
          El color lo fija el enum. El mismo estado se ve igual en panel, portal
          y reparto.
        </p>
        <div className="flex flex-wrap gap-2">
          {ESTADOS.map((estado) => (
            <EstadoBadge key={estado} estado={estado} />
          ))}
        </div>
      </section>
    </main>
  );
}
