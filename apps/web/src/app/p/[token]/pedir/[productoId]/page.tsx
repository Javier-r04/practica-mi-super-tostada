"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { Button, Chip } from "@heroui/react";
import { Package, Star } from "lucide-react";
import { UNIDAD_CORTA, totalPedidoCentavos } from "@misupertostada/shared";
import {
  itemsElegidosDe,
  usePortalSession,
} from "@/components/portal/portal-session";
import { PortalBackButton } from "@/components/portal/portal-back-button";
import { Money } from "@/components/domain/money";
import { QuantityStepper } from "@/components/ui/quantity-stepper";
import { AssetImage } from "@/components/ui/asset-image";
import { EmptyState } from "@/components/ui/empty-state";

export default function PortalProductoPage({
  params,
}: {
  params: Promise<{ token: string; productoId: string }>;
}) {
  const { productoId } = use(params);
  const router = useRouter();
  const { token, sesion, cantidades, setCantidad, assetPath } =
    usePortalSession();
  const base = `/p/${encodeURIComponent(token)}`;
  const producto = sesion.catalogo.find((p) => p.productoId === productoId);
  const abierta = sesion.ventana.abierta;

  const elegidos = useMemo(
    () => itemsElegidosDe(sesion.catalogo, cantidades),
    [sesion.catalogo, cantidades],
  );
  const totalCentavos = useMemo(
    () =>
      totalPedidoCentavos(
        elegidos.map((i) => ({
          cantidad: i.cantidad,
          precioUnitarioCentavos: i.producto.precioCentavos ?? 0,
        })),
      ),
    [elegidos],
  );

  /* Volver al catálogo con `router.push` lo remonta desde arriba y pierde el
     scroll: abrir tres fichas seguidas obligaba a bajar tres veces. Si se
     llegó navegando desde el catálogo, se vuelve por el historial. */
  const volver = () => {
    if (window.history.length > 1) router.back();
    else router.push(`${base}/pedir`);
  };

  if (!producto) {
    return (
      <div className="grid gap-4 py-4">
        <PortalBackButton href={`${base}/pedir`} label="Pedir" />
        <EmptyState
          icon={<Package size={22} aria-hidden />}
          title="No encontramos ese producto"
          description="Vuelva al catálogo y elija otro."
        />
      </div>
    );
  }

  const unidad = UNIDAD_CORTA[producto.unidadMedida];
  const cantidad = cantidades[producto.productoId] ?? 0;
  const disabled = !abierta || !producto.pedible;
  const srcPath = producto.fotoAssetId
    ? assetPath(producto.fotoAssetId)
    : undefined;

  return (
    <div className="grid gap-5 py-4 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:items-start lg:gap-10">
      <div className="grid gap-4">
        <PortalBackButton onPress={volver} label="Pedir" />
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-tarjeta bg-tinta-50">
          {producto.fotoAssetId ? (
            <AssetImage
              assetId={producto.fotoAssetId}
              alt={producto.alias}
              variante="full"
              srcPath={srcPath}
              className="absolute inset-0 size-full object-cover"
            />
          ) : (
            <span
              className="grid size-full place-items-center text-tinta-400"
              aria-hidden
            >
              <Package size={48} strokeWidth={1.4} />
            </span>
          )}
        </div>
      </div>

      <div className="grid gap-4">
        <div className="grid gap-1">
          <div className="flex min-w-0 items-start gap-2">
            <h1 className="min-w-0 text-balance font-display text-2xl font-bold capitalize leading-tight text-tinta-900">
              {producto.alias}
            </h1>
            {producto.favorito ? (
              <Star
                size={18}
                className="mt-1 shrink-0 text-[var(--gold-500)]"
                fill="currentColor"
                aria-label="De los que pide siempre"
              />
            ) : null}
          </div>
          {producto.alias !== producto.nombreCanonico ? (
            <p className="text-pretty text-sm text-tinta-500">
              {producto.nombreCanonico}
            </p>
          ) : null}
          {producto.pedible ? (
            <p className="mt-1 text-[17px] font-semibold tabular-nums text-tinta-900">
              <Money centavos={producto.precioCentavos} />{" "}
              <span className="font-normal text-tinta-500">/ {unidad}</span>
            </p>
          ) : (
            <Chip className="mt-1 w-fit" color="warning" size="sm" variant="soft">
              Sin precio — avise a la fábrica
            </Chip>
          )}
        </div>

        <div className="grid gap-2">
          <p className="mst-label">Cantidad</p>
          <QuantityStepper
            value={cantidad}
            onChange={(n) => setCantidad(producto.productoId, n)}
            unidad={unidad}
            disabled={disabled}
            size="lg"
            variant="plain"
          />
          {!abierta ? (
            <p className="text-sm text-tinta-500">
              La ventana está cerrada. Puede ver el producto, no cambiar la
              cantidad.
            </p>
          ) : null}
        </div>

        <div className="grid gap-2">
          {/* La ficha ya no es un callejón: se ve el pedido que se lleva
              armado sin tener que volver al catálogo a contarlo. */}
          {elegidos.length > 0 ? (
            <div className="flex min-w-0 items-baseline justify-between gap-2 rounded-campo bg-[var(--ink-50)] px-3 py-2">
              <span className="shrink-0 text-sm tabular-nums text-tinta-600">
                {elegidos.length}{" "}
                {elegidos.length === 1 ? "producto" : "productos"}
              </span>
              <Money centavos={totalCentavos} truncate />
            </div>
          ) : null}
          <Button
            fullWidth
            size="lg"
            variant="primary"
            className="button--accent lg:w-auto"
            onPress={volver}
          >
            Listo
          </Button>
        </div>
      </div>
    </div>
  );
}
