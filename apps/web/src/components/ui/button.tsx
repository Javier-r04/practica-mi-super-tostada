import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-campo font-semibold tracking-[0.01em] border border-transparent transition-[background-color,border-color,color,box-shadow,transform] duration-control ease-out focus-visible:outline-none focus-visible:shadow-foco disabled:pointer-events-none disabled:opacity-45 disabled:cursor-not-allowed aria-disabled:pointer-events-none aria-disabled:opacity-45 aria-disabled:cursor-not-allowed active:scale-[var(--press-scale)]",
  {
    variants: {
      variant: {
        primary:
          "bg-marca text-blanco border-marca hover:bg-marca-hover hover:border-marca-hover",
        accent:
          "bg-acento text-marca-prof border-acento-fuerte hover:bg-acento-fuerte",
        secondary:
          "bg-blanco text-tinta-800 border-tinta-200 hover:bg-tinta-50 hover:border-tinta-500",
        ghost: "bg-transparent text-marca hover:bg-marca-soft",
        danger:
          "bg-peligro text-blanco border-peligro hover:bg-peligro-700 hover:border-peligro-700",
      },
      size: {
        sm: "h-[var(--field-height-sm)] px-3 text-xs",
        md: "h-campo px-4 text-sm",
        lg: "h-fila px-6 text-base",
      },
      block: {
        true: "flex w-full",
        false: "",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
      block: false,
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /** Ocupa el ancho completo. Obligatorio en móvil para acciones de reparto. */
  block?: boolean;
  /** Muestra "Guardando…" y bloquea el botón. Nunca mostrar éxito sin confirmación del servidor. */
  loading?: boolean;
  /** Si se pasa, renderiza un `<a>` con la misma apariencia. */
  href?: string;
}

function Button({
  className,
  variant = "primary",
  size = "md",
  block = false,
  disabled = false,
  loading = false,
  type = "button",
  href,
  children,
  ...rest
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const classes = cn(buttonVariants({ variant, size, block }), className);
  const content = loading ? "Guardando…" : children;

  if (href) {
    return (
      <a
        href={isDisabled ? undefined : href}
        className={classes}
        aria-disabled={isDisabled}
        aria-busy={loading || undefined}
        tabIndex={isDisabled ? -1 : undefined}
        {...(rest as React.AnchorHTMLAttributes<HTMLAnchorElement>)}
      >
        {content}
      </a>
    );
  }

  return (
    <button
      type={type}
      className={classes}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      {...rest}
    >
      {content}
    </button>
  );
}

export { Button, buttonVariants };
