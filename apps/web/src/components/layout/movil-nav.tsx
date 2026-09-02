"use client";

import Link from "next/link";
import { Menu, X, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { SeccionPanel } from "@/lib/nav-vista";
import { useEffect, useId } from "react";

export type MovilNavItem = {
  href: string;
  id: SeccionPanel;
  label: string;
  icon: LucideIcon;
};

function esActivo(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

type MovilNavProps = {
  pathname: string;
  barra: readonly MovilNavItem[];
  extra: readonly MovilNavItem[];
  abierto: boolean;
  onAbiertoChange: (abierto: boolean) => void;
};

export function MovilNav({
  pathname,
  barra,
  extra,
  abierto,
  onAbiertoChange,
}: MovilNavProps) {
  const menuId = useId();
  const activoEnExtra = extra.find((item) => esActivo(pathname, item.href));
  const masResaltado = abierto || Boolean(activoEnExtra);

  useEffect(() => {
    if (!abierto) return;
    const cerrar = (e: KeyboardEvent) => {
      if (e.key === "Escape") onAbiertoChange(false);
    };
    window.addEventListener("keydown", cerrar);
    return () => window.removeEventListener("keydown", cerrar);
  }, [abierto, onAbiertoChange]);

  return (
    <>
      {abierto ? (
        <button
          type="button"
          aria-label="Cerrar menú de navegación"
          className="fixed inset-0 z-[calc(var(--z-nav)+1)] bg-tinta-900/30 backdrop-blur-[2px] transition-opacity duration-control lg:hidden"
          onClick={() => onAbiertoChange(false)}
        />
      ) : null}

      <nav
        aria-label="Móvil"
        className="fixed inset-x-0 bottom-0 z-[var(--z-nav)] flex min-h-bottombar border-t border-[var(--border-subtle)] bg-blanco/95 pb-[env(safe-area-inset-bottom,0px)] backdrop-blur-md lg:hidden shadow-[0_-4px_16px_rgba(23,25,15,0.06)]"
      >
        {barra.map((item) => (
          <MovilBarraLink key={item.id} item={item} pathname={pathname} />
        ))}

        {extra.length > 0 ? (
          <Popover open={abierto} onOpenChange={onAbiertoChange} modal>
            <PopoverTrigger asChild>
              <button
                type="button"
                aria-haspopup="menu"
                aria-expanded={abierto}
                aria-controls={menuId}
                aria-label={
                  activoEnExtra
                    ? `Más secciones · ${activoEnExtra.label} activa`
                    : "Más secciones"
                }
                className={cn(
                  "relative flex min-h-tap min-w-0 flex-1 flex-col items-center justify-center gap-1 px-0.5 pt-1 text-center text-[11px] font-semibold leading-tight transition-colors focus-visible:outline-none focus-visible:shadow-foco active:scale-[0.97] motion-safe:transition-transform",
                  masResaltado ? "text-marca" : "text-tinta-500 hover:text-tinta-900",
                )}
              >
                <span
                  className={cn(
                    "relative flex h-7 w-12 items-center justify-center rounded-pill transition-all duration-control ease-out sm:w-14",
                    masResaltado ? "bg-[var(--green-100)] shadow-sm" : "bg-transparent",
                  )}
                >
                  {abierto ? (
                    <X size={20} strokeWidth={2.25} aria-hidden />
                  ) : (
                    <Menu size={22} aria-hidden />
                  )}
                  {activoEnExtra && !abierto ? (
                    <span
                      className="absolute right-2 top-0 size-2 rounded-full bg-marca ring-2 ring-blanco"
                      aria-hidden
                    />
                  ) : null}
                </span>
                <span className="max-w-full truncate">{activoEnExtra?.label ?? "Más"}</span>
              </button>
            </PopoverTrigger>

            <PopoverContent
              align="end"
              side="top"
              sideOffset={12}
              collisionPadding={12}
              onOpenAutoFocus={(e) => e.preventDefault()}
              className={cn(
                "border-0 bg-transparent p-0 shadow-none outline-none",
                "w-[min(calc(100vw-1.25rem),360px)]",
                "origin-bottom-right",
                "transition-[opacity,transform] duration-control ease-out",
                "data-[state=closed]:scale-95 data-[state=closed]:opacity-0",
                "data-[state=open]:scale-100 data-[state=open]:opacity-100",
              )}
            >
              <div
                id={menuId}
                role="menu"
                aria-label="Secciones adicionales"
                className="relative rounded-2xl border border-[var(--border-subtle)] bg-blanco p-3 shadow-[0_12px_40px_rgba(23,25,15,0.16)]"
              >
                <span
                  aria-hidden
                  className="absolute -bottom-[5px] right-5 size-2.5 rotate-45 border-b border-r border-[var(--border-subtle)] bg-blanco"
                />
                <p className="mb-2.5 px-1 text-[10px] font-bold uppercase tracking-wider text-tinta-500">
                  {extra.length === 1 ? "1 sección más" : `${extra.length} secciones más`}
                </p>
                <div
                  className={cn(
                    "grid gap-1.5",
                    extra.length === 1 && "grid-cols-1",
                    extra.length === 2 && "grid-cols-2",
                    extra.length >= 3 && "grid-cols-3",
                  )}
                >
                  {extra.map((item) => (
                    <MovilWidgetLink
                      key={item.id}
                      item={item}
                      pathname={pathname}
                      onNavigate={() => onAbiertoChange(false)}
                    />
                  ))}
                </div>
              </div>
            </PopoverContent>
          </Popover>
        ) : null}
      </nav>
    </>
  );
}

function MovilBarraLink({
  item,
  pathname,
}: {
  item: MovilNavItem;
  pathname: string;
}) {
  const Icon = item.icon;
  const active = esActivo(pathname, item.href);
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex min-h-tap min-w-0 flex-1 flex-col items-center justify-center gap-1 px-0.5 pt-1 text-center text-[11px] font-semibold leading-tight no-underline hover:no-underline transition-colors focus-visible:outline-none focus-visible:shadow-foco active:scale-[0.97] motion-safe:transition-transform",
        active ? "text-marca" : "text-tinta-500 hover:text-tinta-900",
      )}
    >
      <span
        className={cn(
          "relative flex h-7 w-12 items-center justify-center rounded-pill transition-all duration-control ease-out sm:w-14",
          active ? "bg-[var(--green-100)] shadow-sm" : "bg-transparent",
        )}
      >
        <Icon size={22} aria-hidden />
      </span>
      <span className="max-w-full truncate">{item.label}</span>
    </Link>
  );
}

function MovilWidgetLink({
  item,
  pathname,
  onNavigate,
}: {
  item: MovilNavItem;
  pathname: string;
  onNavigate: () => void;
}) {
  const Icon = item.icon;
  const active = esActivo(pathname, item.href);
  return (
    <Link
      href={item.href}
      role="menuitem"
      aria-current={active ? "page" : undefined}
      onClick={onNavigate}
      className={cn(
        "group flex min-h-tap flex-col items-center justify-center gap-1.5 rounded-xl px-1.5 py-2 text-center no-underline hover:no-underline transition-all duration-control ease-out",
        "focus-visible:outline-none focus-visible:shadow-foco active:scale-[0.96]",
        active
          ? "bg-acento/12 text-marca ring-1 ring-marca/20"
          : "text-tinta-700 hover:bg-tinta-50 hover:text-tinta-900",
      )}
    >
      <span
        className={cn(
          "flex size-11 items-center justify-center rounded-full transition-all duration-control ease-out",
          active
            ? "bg-[var(--green-100)] text-marca shadow-sm"
            : "bg-tinta-50 text-tinta-600 group-hover:bg-tinta-100 group-hover:shadow-sm",
        )}
      >
        <Icon size={20} aria-hidden />
      </span>
      <span className="max-w-full truncate text-[10px] font-semibold leading-tight sm:text-[11px]">
        {item.label}
      </span>
    </Link>
  );
}
