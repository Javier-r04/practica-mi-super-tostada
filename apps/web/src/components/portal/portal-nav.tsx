"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ClipboardList,
  Home,
  Receipt,
  ShoppingBag,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePortalSession } from "@/components/portal/portal-session";
import { lineasPedidoCount } from "@/lib/portal-vista";

type NavItem = {
  id: string;
  label: string;
  href: (token: string) => string;
  icon: typeof Home;
  match: (pathname: string, base: string) => boolean;
};

const NAV: readonly NavItem[] = [
  {
    id: "inicio",
    label: "Inicio",
    href: (t) => `/p/${encodeURIComponent(t)}`,
    icon: Home,
    match: (pathname, base) => pathname === base,
  },
  {
    id: "pedir",
    label: "Pedir",
    href: (t) => `/p/${encodeURIComponent(t)}/pedir`,
    icon: ShoppingBag,
    match: (pathname, base) => pathname.startsWith(`${base}/pedir`),
  },
  {
    id: "pedidos",
    label: "Pedidos",
    href: (t) => `/p/${encodeURIComponent(t)}/pedidos`,
    icon: ClipboardList,
    match: (pathname, base) => pathname.startsWith(`${base}/pedidos`),
  },
  {
    id: "cuenta",
    label: "Cuenta",
    href: (t) => `/p/${encodeURIComponent(t)}/cuenta`,
    icon: Receipt,
    match: (pathname, base) => pathname.startsWith(`${base}/cuenta`),
  },
];

export function PortalNav({ variant }: { variant: "bottom" | "top" }) {
  const pathname = usePathname();
  const { token, cantidades } = usePortalSession();
  const base = `/p/${encodeURIComponent(token)}`;
  const lineas = lineasPedidoCount(cantidades);

  if (variant === "top") {
    return (
      <nav
        aria-label="Portal"
        className="hidden border-b border-[var(--border-subtle)] bg-blanco lg:block"
      >
        <div className="mx-auto flex max-w-[var(--page-max)] gap-1 px-6">
          {NAV.map((item) => {
            const href = item.href(token);
            const active = item.match(pathname, base);
            const Icon = item.icon;
            return (
              <Link
                key={item.id}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex min-h-12 items-center gap-2 px-4 text-sm font-semibold no-underline hover:no-underline",
                  active
                    ? "border-b-2 border-[var(--green-800)] text-[var(--green-900)] hover:text-[var(--green-900)]"
                    : "border-b-2 border-transparent text-tinta-500 hover:text-tinta-800",
                )}
              >
                <Icon size={18} aria-hidden />
                {item.label}
                {item.id === "pedir" && lineas > 0 ? (
                  <span className="rounded-full bg-[var(--yellow-400)] px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-[var(--green-900)]">
                    {lineas}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </div>
      </nav>
    );
  }

  return (
    <nav
      aria-label="Portal"
      className="fixed inset-x-0 bottom-0 z-[var(--z-nav)] flex h-16 border-t border-[var(--border-subtle)] bg-blanco lg:hidden"
    >
      {NAV.map((item) => {
        const href = item.href(token);
        const active = item.match(pathname, base);
        const Icon = item.icon;
        return (
          <Link
            key={item.id}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative flex min-h-tap min-w-0 flex-1 flex-col items-center justify-center gap-1 px-0.5 pt-1 text-center text-[11px] font-semibold leading-tight no-underline hover:no-underline",
              "focus-visible:outline-none focus-visible:shadow-foco",
              active
                ? "text-[var(--green-800)] hover:text-[var(--green-800)]"
                : "text-tinta-500 hover:text-tinta-500",
            )}
          >
            {/* La pastilla dice cuál está abierta sin depender solo del color:
                el portal se ve a plena luz y con el teléfono en la mano. */}
            <span
              className={cn(
                "relative flex h-7 w-14 items-center justify-center rounded-pill transition-colors duration-control ease-out",
                active ? "bg-[var(--green-100)]" : "bg-transparent",
              )}
            >
              <Icon size={22} aria-hidden />
              {item.id === "pedir" && lineas > 0 ? (
                <span className="absolute right-2 top-0 flex size-4 items-center justify-center rounded-full bg-[var(--yellow-400)] text-[9px] font-bold tabular-nums text-[var(--green-900)]">
                  {lineas > 9 ? "9+" : lineas}
                </span>
              ) : null}
            </span>
            <span className="max-w-full truncate">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
