"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Banknote,
  ClipboardList,
  Factory,
  LayoutDashboard,
  Menu,
  MessageCircle,
  Package,
  Sun,
  Truck,
  Users,
  X,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  formatearFechaLarga,
  MENSAJE_COLA_SESION,
  type ActorPublico,
  type CalendarioAhora,
} from "@misupertostada/shared";
import { api } from "@/lib/api";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Wordmark } from "@/components/brand/wordmark";
import { VentanaBadge } from "@/components/domain/ventana-badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { ReactNode } from "react";
import { useEffect, useId, useState } from "react";
import { OfflineBanner } from "@/components/feedback/offline-banner";
import { useColaOffline } from "@/hooks/use-cola-offline";

type NavItem = {
  href?: string;
  id: string;
  label: string;
  icon: typeof Package;
  soon?: boolean;
  /** Si es false, solo aparece en el menú lateral, no en la barra inferior. */
  mobile?: boolean;
};

const NAV: readonly NavItem[] = [
  { href: "/hoy", id: "hoy", label: "Hoy", icon: Sun },
  {
    href: "/tablero",
    id: "tablero",
    label: "Tablero",
    icon: LayoutDashboard,
    mobile: false,
  },
  { href: "/pedidos", id: "pedidos", label: "Pedidos", icon: ClipboardList },
  { href: "/produccion", id: "produccion", label: "Producción", icon: Factory },
  { href: "/reparto", id: "reparto", label: "Reparto", icon: Truck },
  { href: "/cartera", id: "cartera", label: "Cartera", icon: Banknote },
  { href: "/conversaciones", id: "conversaciones", label: "Conversaciones", icon: MessageCircle, mobile: false },
  { href: "/catalogo", id: "catalogo", label: "Catálogo", icon: Package, mobile: false },
  { href: "/clientes", id: "clientes", label: "Clientes", icon: Users, mobile: false },
];

const MOVIL = NAV.filter((item) => item.href && !item.soon && item.mobile !== false);

function itemActivo(pathname: string, item: NavItem): boolean {
  if (!item.href) return false;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function PanelShell({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const qc = useQueryClient();
  const mainId = useId();
  const [menuAbierto, setMenuAbierto] = useState(false);
  const cola = useColaOffline();
  const mostrarBanner =
    pathname.startsWith("/reparto") || cola.cola.length > 0;
  const sesionCola = cola.cola.some((f) => f.estado === "sesion");

  const me = useQuery({
    queryKey: ["auth", "me"],
    queryFn: () => api<{ usuario: ActorPublico }>("/auth/me"),
  });
  const calendario = useQuery({
    queryKey: ["calendario", "ahora"],
    queryFn: () => api<CalendarioAhora>("/calendario/ahora"),
    enabled: Boolean(me.data),
    refetchInterval: 60_000,
  });

  useEffect(() => {
    if (me.error instanceof ApiError && me.error.status === 401) {
      router.replace("/login");
    }
  }, [me.error, router]);

  useEffect(() => {
    setMenuAbierto(false);
  }, [pathname]);

  const logout = useMutation({
    mutationFn: () => api("/auth/logout", { method: "POST" }),
    onSuccess: () => {
      qc.clear();
      router.replace("/login");
    },
  });

  if (me.isLoading || !me.data) {
    return <ShellSkeleton />;
  }

  const usuario = me.data.usuario;
  const iniciales = usuario.username.slice(0, 2).toUpperCase();
  const fecha = calendario.data
    ? formatearFechaLarga(calendario.data.fechaOperacion)
    : null;

  return (
    <div className="flex min-h-[100dvh] bg-[var(--surface-page)] lg:h-[100dvh] lg:overflow-hidden">
      <a
        href={`#${mainId}`}
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[var(--z-toast)] focus:rounded-campo focus:bg-blanco focus:px-3 focus:py-2 focus:shadow-modal"
      >
        Saltar al contenido
      </a>

      {menuAbierto && (
        <button
          type="button"
          aria-label="Cerrar menú"
          className="fixed inset-0 z-[var(--z-overlay)] bg-[var(--surface-overlay)] lg:hidden"
          onClick={() => setMenuAbierto(false)}
        />
      )}

      <aside
        id="nav-panel"
        className={cn(
          "fixed inset-y-0 left-0 z-[var(--z-nav)] flex w-sidebar flex-col border-r border-[var(--border-subtle)] bg-[var(--surface-nav)]",
          "transition-transform duration-surface ease-out",
          menuAbierto ? "translate-x-0" : "-translate-x-full",
          "lg:static lg:translate-x-0",
        )}
      >
        <div className="flex h-topbar items-center px-4">
          <Wordmark />
        </div>
        <nav aria-label="Principal" className="grid flex-1 content-start gap-0.5 px-2 pb-3">
          {NAV.map((item) => (
            <NavLink key={item.id} item={item} pathname={pathname} />
          ))}
        </nav>
        <div className="flex items-center gap-2 border-t border-[var(--border-subtle)] p-4">
          <span className="grid size-8 place-items-center rounded-full bg-marca-soft text-xs font-semibold text-marca">
            {iniciales}
          </span>
          <span className="min-w-0 flex-1 leading-tight">
            <span className="block truncate text-sm font-semibold text-tinta-900">
              {usuario.username}
            </span>
            <span className="block text-[12px] font-semibold uppercase tracking-[0.08em] text-tinta-500">
              {usuario.rol}
            </span>
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => logout.mutate()}
            loading={logout.isPending}
          >
            Salir
          </Button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-[var(--z-sticky)] flex h-topbar items-center gap-3 border-b border-[var(--border-subtle)] bg-blanco px-4 lg:px-6">
          <button
            type="button"
            className="inline-flex size-11 items-center justify-center rounded-campo text-tinta-800 lg:hidden"
            aria-expanded={menuAbierto}
            aria-controls="nav-panel"
            onClick={() => setMenuAbierto((v) => !v)}
          >
            {menuAbierto ? (
              <>
                <X size={20} aria-hidden />
                <span className="sr-only">Cerrar menú</span>
              </>
            ) : (
              <>
                <Menu size={20} aria-hidden />
                <span className="sr-only">Abrir menú</span>
              </>
            )}
          </button>
          <h1 className="min-w-0 truncate text-lg font-semibold text-tinta-900">
            {title}
          </h1>
          <div className="ml-auto flex min-w-0 items-center gap-2 sm:gap-3">
            {fecha && (
              <p className="hidden min-w-0 truncate text-right sm:block">
                <span className="block text-[12px] font-semibold uppercase tracking-[0.08em] text-tinta-500">
                  Fecha de operación
                </span>
            <span className="block text-sm font-semibold tabular-nums text-tinta-900">
                  {fecha}
                  {calendario.data?.esSabado ? " · carga en planta" : ""}
                </span>
              </p>
            )}
            {calendario.data && (
              <VentanaBadge abierta={calendario.data.ventanaAbierta} />
            )}
          </div>
        </header>
        {mostrarBanner && (
          <OfflineBanner
            online={cola.online}
            pendientes={cola.cola.length}
            sincronizando={cola.sincronizando}
            onReintentar={cola.enviarAhora}
          />
        )}
        {sesionCola && (
          <div
            role="status"
            className="bg-[var(--amber-100)] px-4 py-2 text-xs font-semibold text-[var(--amber-700)]"
          >
            {MENSAJE_COLA_SESION}
          </div>
        )}
        {cola.errorApertura && (
          <div role="alert" className="bg-[var(--red-100)] px-4 py-2 text-xs font-semibold text-peligro">
            {cola.errorApertura}
          </div>
        )}
        <main
          id={mainId}
          className="relative flex-1 overflow-auto px-4 py-4 pb-[calc(var(--bottombar-height)+1rem)] lg:px-6 lg:py-6 lg:pb-6"
        >
          <div className="mx-auto w-full max-w-[var(--page-max)]">{children}</div>
        </main>
      </div>

      <nav
        aria-label="Móvil"
        className="fixed inset-x-0 bottom-0 z-[var(--z-nav)] flex h-bottombar border-t border-[var(--border-subtle)] bg-blanco lg:hidden"
      >
        {MOVIL.map((item) => {
          const Icon = item.icon;
          const active = itemActivo(pathname, item);
          return (
            <Link
              key={item.id}
              href={item.href!}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-tap min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-0.5 text-center text-[11px] font-semibold leading-tight",
                active ? "text-marca" : "text-tinta-500",
              )}
            >
              <Icon size={22} aria-hidden />
              <span className="max-w-full truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

function NavLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const Icon = item.icon;
  const active = itemActivo(pathname, item);
  const clase = cn(
    "flex min-h-11 items-center gap-3 rounded-campo px-3 text-sm transition-[background-color,color,border-color] duration-control ease-out",
    "border-l-[3px]",
    item.soon && "cursor-not-allowed opacity-45",
    active
      ? "border-[var(--nav-rail)] bg-[var(--surface-nav-active)] font-semibold text-marca"
      : "border-transparent font-medium text-tinta-800 hover:bg-[var(--surface-nav-hover)]",
  );

  if (item.soon || !item.href) {
    return (
      <span className={clase} title="Disponible en la siguiente etapa">
        <Icon size={17} aria-hidden />
        <span className="flex-1">{item.label}</span>
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-tinta-500">
          Pronto
        </span>
      </span>
    );
  }

  return (
    <Link href={item.href} aria-current={active ? "page" : undefined} className={clase}>
      <Icon size={17} aria-hidden />
      {item.label}
    </Link>
  );
}

function ShellSkeleton() {
  return (
    <div className="flex min-h-[100dvh] bg-[var(--surface-page)]">
      <div className="hidden w-sidebar border-r border-[var(--border-subtle)] bg-blanco p-4 lg:block">
        <Skeleton className="h-9 w-40" />
        <div className="mt-6 grid gap-2">
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-11 w-full" />
        </div>
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-topbar items-center border-b border-[var(--border-subtle)] bg-blanco px-6">
          <Skeleton className="h-5 w-32" />
        </div>
        <div className="p-6">
          <Skeleton className="h-36 w-full rounded-tarjeta" />
        </div>
      </div>
    </div>
  );
}
