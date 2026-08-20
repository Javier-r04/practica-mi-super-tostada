import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes } from "react";

const variants = {
  primary:
    "bg-marca text-blanco border-marca hover:bg-marca-hover hover:border-marca-hover",
  accent:
    "bg-acento text-marca-prof border-acento-fuerte hover:bg-acento-fuerte",
  secondary:
    "bg-blanco text-tinta-800 border-[var(--border-default)] hover:bg-tinta-50 hover:border-[var(--border-strong)]",
  ghost:
    "bg-transparent text-marca border-transparent hover:bg-marca-soft",
  danger:
    "bg-peligro text-blanco border-peligro hover:bg-peligro-700 hover:border-peligro-700",
};

const sizes = {
  sm: "h-9 px-3 text-xs",
  md: "h-campo px-4 text-sm",
  lg: "h-[52px] px-6 text-sm",
};

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
  loading?: boolean;
};

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  className,
  disabled,
  children,
  type = "button",
  ...rest
}: Props) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold tracking-[0.01em]",
        "rounded-campo border transition-[background-color,border-color,color,box-shadow,transform] duration-control ease-out",
        "focus-visible:outline-none focus-visible:shadow-foco",
        "active:scale-[.985] disabled:opacity-45 disabled:cursor-not-allowed",
        variants[variant],
        sizes[size],
        className,
      )}
      {...rest}
    >
      {loading ? "Un momento…" : children}
    </button>
  );
}
