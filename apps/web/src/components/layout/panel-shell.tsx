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
  Settings,
  LogOut,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  formatearFechaLarga,
  MENSAJE_COLA_SESION,
  tienePermiso,
  type ActorPublico,
  type CalendarioAhora,
} from "@misupertostada/shared";
import {
  esSoloLectura,
  seccionVisible,
  type SeccionPanel,
} from "@/lib/nav-vista";
import { api } from "@/lib/api";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import { etiquetaDiaCorto, etiquetaDiaSemanaCorto } from "@/lib/fecha-ui";
import { Avatar, Button, Drawer, ScrollShadow } from "@heroui/react";
import { Wordmark } from "@/components/brand/wordmark";
import { VentanaBadge } from "@/components/domain/ventana-badge";
import { avisoReabierto } from "@/lib/reabierto-vista";
import { Skeleton } from "@/components/ui/skeleton";
import type { ReactNode } from "react";
import { useEffect, useId, useState } from "react";
import { OfflineBanner } from "@/components/feedback/offline-banner";
import { useColaOffline } from "@/hooks/use-cola-offline";

type NavItem = {
  href?: string;
  id: SeccionPanel;
  label: string;
  icon: typeof Package;
  soon?: boolean;
  /**
   * Si es false, el ítem pasa al final del orden móvil: se muestra en la barra
   * inferior solo si sobran ranuras, si no cae en la hoja "Más".
   */
  mobile?: boolean;
};

/**
 * Qué permiso hace visible cada sección vive en `PERMISOS_SECCION`
 * (`@/lib/nav-vista`), no aquí: es lógica testeable sin montar el shell.
 */
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
  {
    href: "/conversaciones",
    id: "conversaciones",
    label: "Conversaciones",
    icon: MessageCircle,
    mobile: false,
  },
  {
    href: "/catalogo",
    id: "catalogo",
    label: "Catálogo",
    icon: Package,
    mobile: false,
  },
  {
    href: "/clientes",
    id: "clientes",
    label: "Clientes",
    icon: Users,
    mobile: false,
  },
];

/** Máximo de ranuras de la barra inferior cuando no hay desbordamiento. */
const MOVIL_MAX = 4;
/** Ranuras de navegación cuando hace falta el botón "Más". */
const MOVIL_FIJOS = 3;

/**
 * Reparte las secciones visibles entre la barra inferior y la hoja "Más":
 * hasta cuatro caben todas; a partir de la quinta se fijan tres y el resto
 * pasa a la hoja.
 */
function repartirMovil(visibles: readonly NavItem[]): {
  barra: NavItem[];
  extra: NavItem[];
} {
  const navegables = visibles.filter((item) => item.href && !item.soon);
  // Los marcados `mobile: false` van al final: primero los de uso diario.
  const orden = [
    ...navegables.filter((item) => item.mobile !== false),
    ...navegables.filter((item) => item.mobile === false),
  ];
  if (orden.length <= MOVIL_MAX) return { barra: orden, extra: [] };
  return { barra: orden.slice(0, MOVIL_FIJOS), extra: orden.slice(MOVIL_FIJOS) };
}

function itemActivo(pathname: string, item: NavItem): boolean {
  if (!item.href) return false;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function PanelShell({
  title,
  barraFija,
  children,
}: {
  title: string;
  /** Barra sticky pegada al header del panel (sin hueco del padding de main). */
  barraFija?: ReactNode;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const qc = useQueryClient();
  const mainId = useId();
  const [hojaAbierta, setHojaAbierta] = useState(false);
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
  const aviso = avisoReabierto(calendario.data);

  useEffect(() => {
    if (me.error instanceof ApiError && me.error.status === 401) {
      router.replace("/login");
    }
  }, [me.error, router]);

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
  const visibles = NAV.filter((item) =>
    seccionVisible(item.id, usuario.permisos),
  );
  const seccionActiva = NAV.find((item) => itemActivo(pathname, item))?.id;
  const soloLectura = seccionActiva
    ? esSoloLectura(seccionActiva, usuario.permisos)
    : false;
  const { barra: movilBarra, extra: movilExtra } = repartirMovil(visibles);
  const iniciales = usuario.username.slice(0, 2).toUpperCase();
  return (
    <div className="flex min-h-[100dvh] bg-[var(--surface-page)] lg:h-[100dvh] lg:overflow-hidden">
      <a
        href={`#${mainId}`}
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[var(--z-toast)] focus:rounded-campo focus:bg-blanco focus:px-3 focus:py-2 focus:shadow-modal"
      >
        Saltar al contenido
      </a>

      <aside
        id="nav-panel"
        className="hidden w-sidebar shrink-0 flex-col border-r border-[var(--border-subtle)] bg-blanco lg:flex shadow-sm z-10"
      >
        <div className="flex shrink-0 items-center justify-center border-b border-[var(--border-subtle)] px-2 py-4">
          <Link
            href="/hoy"
            className="flex w-full items-center justify-center rounded-campo no-underline hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marca/50"
            aria-label="Mi Súper Tostada · Hoy"
          >
            <Wordmark className="h-20 w-auto max-w-full" />
          </Link>
        </div>
        <ScrollShadow
          aria-label="Principal"
          className="grid flex-1 content-start gap-1 overflow-y-auto px-3 py-4"
        >
          {visibles.map((item) => (
            <NavLink key={item.id} item={item} pathname={pathname} />
          ))}
        </ScrollShadow>
        <div className="flex items-center gap-3 border-t border-[var(--border-subtle)] p-4 bg-tinta-50/30">
          <Avatar className="size-9 bg-marca-soft text-marca shadow-sm">
            <Avatar.Fallback className="text-xs font-semibold text-marca">
              {iniciales}
            </Avatar.Fallback>
          </Avatar>
          <span className="min-w-0 flex-1 leading-tight">
            <span className="block truncate text-sm font-semibold text-tinta-900">
              {usuario.username}
            </span>
            <span className="block mst-label text-tinta-500 text-[10px]">
              {usuario.rol}
            </span>
          </span>
          <div className="flex items-center gap-1 shrink-0">
            {tienePermiso(usuario.permisos, "usuarios.gestionar") ? (
              <Link
                href="/configuracion"
                aria-label="Configuración"
                className={cn(
                  "flex size-8 items-center justify-center rounded-lg text-tinta-500 hover:bg-tinta-100 hover:text-tinta-900 transition-colors",
                  pathname.startsWith("/configuracion") && "bg-acento/15 text-marca hover:bg-acento/25 hover:text-marca"
                )}
              >
                <Settings size={18} aria-hidden />
              </Link>
            ) : null}
            <Button
              isIconOnly
              variant="ghost"
              size="sm"
              onPress={() => logout.mutate()}
              isPending={logout.isPending}
              aria-label="Salir"
              className="size-8 text-tinta-500 hover:text-peligro hover:bg-peligro/10"
            >
              <LogOut size={18} aria-hidden />
            </Button>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-[var(--z-sticky)] flex min-h-topbar items-center gap-3 border-b border-tinta-200/50 bg-blanco/80 backdrop-blur-md px-4 py-2 lg:px-6 shadow-sm">
          <h1 className="min-w-0 truncate text-lg font-semibold text-tinta-900">
            {title}
          </h1>
          {/*
            Sin este aviso, quien no puede escribir ve una pantalla sin botones
            y no sabe si es su permiso o un fallo de carga.
          */}
          {soloLectura && (
            <span
              className="mst-label shrink-0 rounded-full bg-tinta-100 px-2 py-0.5 text-tinta-600"
              title="Puede consultar esta sección, pero no registrar acciones en ella."
            >
              Solo lectura
            </span>
          )}
          <div className="ml-auto flex min-w-0 items-center gap-2 sm:gap-3">
            {calendario.data && <EjesFecha cal={calendario.data} />}
            {aviso && (
              <span
                className="mst-label shrink-0 rounded-full bg-[var(--amber-100)] px-2 py-0.5 text-[var(--amber-700)]"
                title={aviso.detalle}
              >
                {aviso.chip}
              </span>
            )}
            {calendario.data && (
              <VentanaBadge
                abierta={calendario.data.ventanaAbierta}
                reabierta={calendario.data.diaEstado === "REABIERTO"}
                cierraAt={calendario.data.cierraAt}
                proximaAperturaAt={calendario.data.proximaAperturaAt}
              />
            )}
            <button
              type="button"
              className="grid size-11 shrink-0 place-items-center rounded-campo text-tinta-800 lg:hidden focus-visible:outline-none focus-visible:shadow-foco"
              aria-haspopup="dialog"
              aria-expanded={hojaAbierta}
              onClick={() => setHojaAbierta(true)}
            >
              <Avatar className="size-8 bg-marca-soft text-marca">
                <Avatar.Fallback className="text-xs font-semibold text-marca">
                  {iniciales}
                </Avatar.Fallback>
              </Avatar>
              <span className="sr-only">Cuenta y más opciones</span>
            </button>
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
          className={cn(
            "relative flex-1 overflow-auto",
            barraFija
              ? "pb-[calc(var(--bottombar-height)+1rem)] lg:pb-6"
              : "px-4 py-4 pb-[calc(var(--bottombar-height)+1rem)] lg:px-6 lg:py-6 lg:pb-6",
          )}
        >
          {barraFija ? (
            <div className="sticky top-[var(--topbar-height)] isolate z-[calc(var(--z-sticky)+1)] border-b border-[var(--border-subtle)] bg-[var(--surface-page)] px-4 py-3 lg:top-0 lg:px-6">
              <div className="mx-auto w-full max-w-[var(--page-max)]">
                {barraFija}
              </div>
            </div>
          ) : null}
          <div
            className={cn(
              "mx-auto w-full max-w-[var(--page-max)]",
              barraFija && "px-4 py-4 lg:px-6 lg:py-6",
            )}
          >
            {children}
          </div>
        </main>
      </div>

      <nav
        aria-label="Móvil"
        className="fixed inset-x-0 bottom-0 z-[var(--z-nav)] flex h-bottombar border-t border-[var(--border-subtle)] bg-blanco lg:hidden shadow-[0_-1px_3px_rgba(0,0,0,0.05)]"
      >
        {movilBarra.map((item) => {
          const Icon = item.icon;
          const active = itemActivo(pathname, item);
          return (
            <Link
              key={item.id}
              href={item.href!}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-tap min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-0.5 text-center text-[11px] font-semibold leading-tight no-underline hover:no-underline transition-colors",
                active ? "text-marca" : "text-tinta-500 hover:text-tinta-900",
              )}
            >
              <Icon size={22} className={cn("transition-transform", active && "drop-shadow-sm scale-110")} aria-hidden />
              <span className="max-w-full truncate">{item.label}</span>
            </Link>
          );
        })}
        {movilExtra.length > 0 ? (
          <button
            type="button"
            aria-haspopup="dialog"
            aria-expanded={hojaAbierta}
            onClick={() => setHojaAbierta(true)}
            className={cn(
              "flex min-h-tap min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-0.5 text-center text-[11px] font-semibold leading-tight transition-colors",
              movilExtra.some((item) => itemActivo(pathname, item))
                ? "text-marca"
                : "text-tinta-500 hover:text-tinta-900",
            )}
          >
            <Menu size={22} className={cn("transition-transform", movilExtra.some((item) => itemActivo(pathname, item)) && "drop-shadow-sm scale-110")} aria-hidden />
            <span className="max-w-full truncate">Más</span>
          </button>
        ) : null}
      </nav>

      <Drawer isOpen={hojaAbierta} onOpenChange={setHojaAbierta}>
        <Drawer.Backdrop>
          <Drawer.Content placement="bottom" className="max-h-[85dvh] rounded-t-2xl bg-blanco">
            <Drawer.Dialog className="p-4">
              <Drawer.Handle />
              <Drawer.Header className="flex items-center justify-between pb-2">
                <Drawer.Heading className="text-base font-semibold text-tinta-900">
                  Más opciones
                </Drawer.Heading>
                <Drawer.CloseTrigger />
              </Drawer.Header>
              <Drawer.Body className="p-0">
                <div className="grid gap-1 py-1">
                  {movilExtra.map((item) => {
                    const Icon = item.icon;
                    const active = itemActivo(pathname, item);
                    return (
                      <Link
                        key={item.id}
                        href={item.href!}
                        aria-current={active ? "page" : undefined}
                        onClick={() => setHojaAbierta(false)}
                        className={cn(
                          "group flex min-h-[42px] items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors no-underline hover:no-underline",
                          active
                            ? "bg-acento/15 font-semibold text-tinta-900"
                            : "text-tinta-700 hover:bg-tinta-100 hover:text-tinta-900",
                        )}
                      >
                        <Icon size={18} className={cn("shrink-0 transition-transform duration-200", active ? "scale-110 text-marca drop-shadow-sm" : "group-hover:scale-110")} aria-hidden />
                        {item.label}
                      </Link>
                    );
                  })}
                  {tienePermiso(usuario.permisos, "usuarios.gestionar") ? (
                    <Link
                      href="/configuracion"
                      aria-current={
                        pathname.startsWith("/configuracion") ? "page" : undefined
                      }
                      onClick={() => setHojaAbierta(false)}
                      className={cn(
                        "group flex min-h-[42px] items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors no-underline hover:no-underline",
                        pathname.startsWith("/configuracion")
                          ? "bg-acento/15 font-semibold text-tinta-900"
                          : "text-tinta-700 hover:bg-tinta-100 hover:text-tinta-900",
                      )}
                    >
                      <Settings size={18} className={cn("shrink-0 transition-transform duration-200", pathname.startsWith("/configuracion") ? "scale-110 text-marca drop-shadow-sm" : "group-hover:scale-110")} aria-hidden />
                      Configuración
                    </Link>
                  ) : null}
                </div>
                <div className="mt-4 flex items-center gap-2 border-t border-[var(--border-subtle)] pt-4">
                  <Avatar className="size-8 bg-marca-soft text-marca">
                    <Avatar.Fallback className="text-xs font-semibold text-marca">
                      {iniciales}
                    </Avatar.Fallback>
                  </Avatar>
                  <span className="min-w-0 flex-1 leading-tight">
                    <span className="block truncate text-sm font-semibold text-tinta-900">
                      {usuario.username}
                    </span>
                    <span className="block mst-label">{usuario.rol}</span>
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onPress={() => logout.mutate()}
                    isPending={logout.isPending}
                    className="text-tinta-700 hover:text-peligro hover:bg-[var(--red-100)]"
                  >
                    <LogOut size={16} aria-hidden />
                    Salir
                  </Button>
                </div>
              </Drawer.Body>
            </Drawer.Dialog>
          </Drawer.Content>
        </Drawer.Backdrop>
      </Drawer>
    </div>
  );
}

/**
 * Los tres ejes de fecha del negocio, uno al lado del otro.
 *
 * El chrome mostraba solo el de captura, así que entre las 15:00 y las 03:00
 * anunciaba la operación de mañana mientras /reparto, /produccion y cartera
 * trabajaban la de hoy, sin ningún sitio donde leer esa otra fecha. Ahora cada
 * eje tiene su celda y ninguna pantalla tiene que adivinar cuál es «hoy».
 * Ver `calendarioAhoraSchema` y `BusinessCalendarService.ejes`.
 */
function EjesFecha({ cal }: { cal: CalendarioAhora }) {
  // La entrega solo se anota cuando no cae el mismo día que la operación
  // (sábado con carga en planta, feriados): el resto del tiempo es ruido.
  const nota =
    cal.fechaEntregaCaptura !== cal.fechaOperacionCaptura
      ? `Entrega: ${formatearFechaLarga(cal.fechaEntregaCaptura)}`
      : cal.esSabado
        ? "Carga en planta"
        : undefined;

  return (
    <dl className="hidden min-w-0 items-center divide-x divide-[var(--border-subtle)] rounded-campo border border-[var(--border-subtle)] bg-[var(--surface-page)] px-1.5 py-1 sm:flex shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
      <Eje
        label="Captura de pedidos"
        iso={cal.fechaOperacionCaptura}
        nota={nota}
      />
      <Eje
        label="En reparto hoy"
        iso={cal.fechaOperacionEnCurso}
      />
      <Eje
        label="Día de calendario"
        iso={cal.hoyCivil}
        className="hidden md:flex"
      />
    </dl>
  );
}

function Eje({
  label,
  iso,
  nota,
  className,
}: {
  label: string;
  iso: string;
  nota?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col justify-center px-3.5 py-0.5 text-left", className)}>
      <dt className="text-[10px] font-bold uppercase tracking-wider text-tinta-500 leading-none">
        {label}
      </dt>
      <dd
        className="mt-1 flex items-center gap-2 text-xs font-semibold leading-none tabular-nums text-tinta-900"
        title={formatearFechaLarga(iso)}
      >
        <span>{formatearFechaLarga(iso)}</span>
        {nota ? (
          <span className="rounded-pill border border-[var(--green-200)] bg-marca-soft px-2 py-0.5 text-[11px] font-semibold text-marca">
            {nota}
          </span>
        ) : null}
      </dd>
    </div>
  );
}

function NavLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const Icon = item.icon;
  const active = itemActivo(pathname, item);
  const clase = cn(
    "group flex min-h-[42px] items-center gap-3 rounded-lg px-3 text-sm font-medium transition-all duration-200 ease-out no-underline hover:no-underline",
    item.soon && "cursor-not-allowed opacity-45",
    active
      ? "bg-acento/15 font-semibold text-tinta-900"
      : "text-tinta-700 hover:bg-tinta-100 hover:text-tinta-900",
  );

  if (item.soon || !item.href) {
    return (
      <span className={clase} title="Disponible en la siguiente etapa">
        <Icon size={18} className={cn("shrink-0 transition-transform duration-200", active ? "scale-110 text-marca drop-shadow-sm" : "group-hover:scale-110")} aria-hidden />
        <span className="flex-1">{item.label}</span>
        <span className="mst-label text-[10px] uppercase tracking-wider text-tinta-500 bg-tinta-100 px-2 py-0.5 rounded-full">
          Pronto
        </span>
      </span>
    );
  }

  return (
    <Link href={item.href} aria-current={active ? "page" : undefined} className={clase}>
      <Icon size={18} className={cn("shrink-0 transition-transform duration-200", active ? "scale-110 text-marca drop-shadow-sm" : "group-hover:scale-110")} aria-hidden />
      {item.label}
    </Link>
  );
}

function ShellSkeleton() {
  return (
    <div className="flex min-h-[100dvh] bg-[var(--surface-page)]">
      <div className="hidden w-sidebar border-r border-[var(--border-subtle)] bg-blanco lg:block">
        <div className="border-b border-[var(--border-subtle)] px-3 py-3">
          <Skeleton className="mx-auto size-24 rounded-full" />
        </div>
        <div className="grid gap-2 p-4">
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
